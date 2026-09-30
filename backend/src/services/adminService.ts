import os from 'os';
import { query, getPool, getClient } from '../utils/db';
import { env } from '../config/env';
import { investcoinsRepository, InsufficientFundsError } from '../repositories/investcoinsRepository';
import { auditLog } from './auditService';
import { notify } from './notificationService';
import { invalidateUserStatus } from '../utils/userStatus';
import { generateImpersonationToken, IMPERSONATION_MINUTES } from '../utils/jwt';

export type AdminErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN';
export class AdminError extends Error {
  constructor(public code: AdminErrorCode, message: string) { super(message); this.name = 'AdminError'; }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: unknown): string => { if (typeof v !== 'string' || !UUID_RE.test(v)) throw new AdminError('INVALID_INPUT', 'Identifiant invalide'); return v; };
const clampInt = (v: unknown, def: number, min: number, max: number): number => {
  const n = typeof v === 'string' && v !== '' ? Number(v) : typeof v === 'number' ? v : def;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : def;
};

export const MAX_COIN_ADJUSTMENT = 100_000;

const USER_COLUMNS = `u.id, u.email, u.username, u.first_name, u.last_name, u.role, u.subscription_tier, u.pro_override, u.verified, u.enable_2fa,
  u.free_domain, u.created_at, u.last_login_at, u.disabled_at, u.disabled_reason`;

export const adminService = {
  // ── Utilisateurs ──────────────────────────────────────────────────────
  async listUsers(params: { q?: unknown; tier?: unknown; status?: unknown; page?: unknown; pageSize?: unknown }) {
    const page = clampInt(params.page, 1, 1, 100000);
    const pageSize = clampInt(params.pageSize, 25, 1, 100);
    const where: string[] = []; const args: any[] = [];
    if (typeof params.q === 'string' && params.q.trim()) {
      args.push(`%${params.q.trim().replace(/[\\%_]/g, (c) => `\\${c}`).toLowerCase()}%`);
      where.push(`(LOWER(u.email) LIKE $${args.length} OR LOWER(COALESCE(u.username,'')) LIKE $${args.length})`);
    }
    if (params.tier === 'free' || params.tier === 'pro') { args.push(params.tier); where.push(`(CASE WHEN u.pro_override THEN 'pro' ELSE u.subscription_tier END) = $${args.length}`); }
    if (params.status === 'disabled') where.push('u.disabled_at IS NOT NULL');
    else if (params.status === 'unverified') where.push('u.verified IS NOT TRUE');
    else if (params.status === 'admin') where.push(`u.role = 'admin'`);
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM users u ${w}`, args)).rows[0].n);
    const rows = (await query(
      `SELECT ${USER_COLUMNS}, COALESCE(b.balance, 0)::int AS balance FROM users u LEFT JOIN investcoins_balance b ON b.user_id = u.id ${w}
       ORDER BY u.created_at DESC NULLS LAST, u.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, args)).rows;
    return { users: rows, total, page, pageSize };
  },

  async getUser(idRaw: unknown) {
    const id = uuid(idRaw);
    const u = (await query(`SELECT ${USER_COLUMNS}, COALESCE(b.balance, 0)::int AS balance FROM users u LEFT JOIN investcoins_balance b ON b.user_id = u.id WHERE u.id = $1`, [id])).rows[0];
    if (!u) throw new AdminError('NOT_FOUND', 'Utilisateur introuvable');
    const one = async (sql: string) => (await query(sql, [id])).rows;
    return {
      user: u,
      subscriptions: await one(`SELECT tier, status, payment_provider, current_period_end, canceled_at, created_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`),
      bank: (await one(`SELECT credit_blocked, blocked_reason, blocked_until, defaults, written_off_coins FROM bank_accounts WHERE user_id = $1`))[0] ?? null,
      loans: await one(`SELECT id, product, domain, status, months, annual_rate_pct, created_at FROM bank_loans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`),
      recentLedger: await one(`SELECT amount, reason, domain, nature, created_at FROM investcoins_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15`),
      recentAudit: await one(`SELECT action, metadata, ip_address, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15`),
    };
  },

  // Actions d'administration : chaque écriture est journalisée (audit) avec l'administrateur qui l'a faite.
  async setProOverride(adminId: string, idRaw: unknown, value: unknown, ip?: string | null) {
    const id = uuid(idRaw);
    if (typeof value !== 'boolean') throw new AdminError('INVALID_INPUT', '« proOverride » doit être vrai ou faux');
    const r = await query('UPDATE users SET pro_override = $2, updated_at = NOW() WHERE id = $1 RETURNING id', [id, value]);
    if (!r.rowCount) throw new AdminError('NOT_FOUND', 'Utilisateur introuvable');
    await auditLog({ userId: adminId, action: 'admin_set_pro_override', entityType: 'user', entityId: id, metadata: { value }, ip });
    return { success: true, proOverride: value };
  },

  async setDisabled(adminId: string, idRaw: unknown, disabled: boolean, reasonRaw: unknown, ip?: string | null) {
    const id = uuid(idRaw);
    if (id === adminId) throw new AdminError('FORBIDDEN', 'Tu ne peux pas suspendre ton propre compte');
    const target = (await query('SELECT role FROM users WHERE id = $1', [id])).rows[0];
    if (!target) throw new AdminError('NOT_FOUND', 'Utilisateur introuvable');
    if (target.role === 'admin') throw new AdminError('FORBIDDEN', 'Un compte administrateur ne peut pas être suspendu par l\'interface');
    const reason = disabled ? String(reasonRaw ?? '').trim().slice(0, 300) : null;
    if (disabled && reason!.length < 3) throw new AdminError('INVALID_INPUT', 'Un motif est obligatoire (3 caractères minimum)');
    await query('UPDATE users SET disabled_at = CASE WHEN $2 THEN NOW() ELSE NULL END, disabled_reason = $3, updated_at = NOW() WHERE id = $1', [id, disabled, reason]);
    invalidateUserStatus(id);
    await auditLog({ userId: adminId, action: disabled ? 'admin_disable_user' : 'admin_enable_user', entityType: 'user', entityId: id, metadata: { reason }, ip });
    return { success: true, disabled };
  },

  // Ajustement de pièces (geste commercial, correction) : motif obligatoire, plafonné, écrit dans le registre (création ou destruction).
  async adjustCoins(adminId: string, idRaw: unknown, amountRaw: unknown, reasonRaw: unknown, ip?: string | null) {
    const id = uuid(idRaw);
    if (typeof amountRaw !== 'number' || !Number.isInteger(amountRaw) || amountRaw === 0 || Math.abs(amountRaw) > MAX_COIN_ADJUSTMENT) {
      throw new AdminError('INVALID_INPUT', `Montant invalide : entier non nul, ${MAX_COIN_ADJUSTMENT.toLocaleString('fr-FR')} au plus en valeur absolue`);
    }
    const reason = String(reasonRaw ?? '').trim().slice(0, 300);
    if (reason.length < 3) throw new AdminError('INVALID_INPUT', 'Un motif est obligatoire (3 caractères minimum)');
    if (!(await query('SELECT 1 FROM users WHERE id = $1', [id])).rowCount) throw new AdminError('NOT_FOUND', 'Utilisateur introuvable');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const balance = await investcoinsRepository.applyTransaction(id, amountRaw, 'admin_adjustment', { adminId, reason }, client);
      await auditLog({ userId: adminId, action: 'admin_adjust_coins', entityType: 'user', entityId: id, metadata: { amount: amountRaw, reason }, ip }, client);
      await notify(client, id, { kind: 'admin_coins', title: amountRaw > 0 ? `+${amountRaw} 🪙 offerts` : `${amountRaw} 🪙 retirés`, body: `Ajustement de ton solde par l'équipe : ${reason}` });
      await client.query('COMMIT');
      return { success: true, balance };
    } catch (e) {
      await client.query('ROLLBACK');
      if (e instanceof InsufficientFundsError) throw new AdminError('INVALID_INPUT', 'Solde insuffisant pour ce retrait');
      throw e;
    } finally { client.release(); }
  },

  // Impersonation : l'administrateur voit le site comme l'utilisateur, en lecture seule, 15 minutes. Toujours tracé.
  async startImpersonation(adminId: string, idRaw: unknown, ip?: string | null) {
    const id = uuid(idRaw);
    if (id === adminId) throw new AdminError('FORBIDDEN', 'Inutile : c\'est déjà ton compte');
    const target = (await query('SELECT id, email, role FROM users WHERE id = $1', [id])).rows[0];
    if (!target) throw new AdminError('NOT_FOUND', 'Utilisateur introuvable');
    if (target.role === 'admin') throw new AdminError('FORBIDDEN', 'On ne peut pas se substituer à un autre administrateur');
    await auditLog({ userId: adminId, action: 'admin_impersonate_start', entityType: 'user', entityId: id, metadata: { minutes: IMPERSONATION_MINUTES }, ip });
    return { target: { id: target.id, email: target.email }, token: generateImpersonationToken(target.id, target.email, adminId) };
  },

  // ── Journal d'audit ───────────────────────────────────────────────────
  async listAudit(params: { action?: unknown; userId?: unknown; page?: unknown; pageSize?: unknown }) {
    const page = clampInt(params.page, 1, 1, 100000);
    const pageSize = clampInt(params.pageSize, 50, 1, 200);
    const where: string[] = []; const args: any[] = [];
    if (typeof params.action === 'string' && /^[a-z_]{2,60}$/.test(params.action)) { args.push(params.action); where.push(`a.action = $${args.length}`); }
    if (params.userId !== undefined && params.userId !== '') { args.push(uuid(params.userId)); where.push(`a.user_id = $${args.length}`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM audit_logs a ${w}`, args)).rows[0].n);
    const rows = (await query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.ip_address, a.created_at, a.user_id, u.email AS user_email
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${w} ORDER BY a.created_at DESC, a.id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, args)).rows;
    const actions = (await query('SELECT action, COUNT(*)::int AS n FROM audit_logs GROUP BY action ORDER BY n DESC LIMIT 40')).rows;
    return { entries: rows, total, page, pageSize, actions };
  },

  // ── Statistiques ──────────────────────────────────────────────────────
  async stats() {
    const one = async (sql: string) => (await query(sql)).rows[0];
    const users = await one(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE verified IS TRUE)::int AS verified,
        COUNT(*) FILTER (WHERE (CASE WHEN pro_override THEN 'pro' ELSE subscription_tier END) = 'pro')::int AS pro,
        COUNT(*) FILTER (WHERE disabled_at IS NOT NULL)::int AS disabled,
        COUNT(*) FILTER (WHERE enable_2fa IS TRUE)::int AS with_2fa,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '1 day')::int AS active_1d,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days')::int AS active_7d,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int AS active_30d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_7d FROM users`);
    const signups = (await query(`SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS n
        FROM generate_series(NOW()::date - 29, NOW()::date, '1 day') d
        LEFT JOIN (SELECT created_at::date AS day, COUNT(*) n FROM users GROUP BY 1) c ON c.day = d::date ORDER BY d`)).rows;
    const coins = await one(`SELECT COALESCE(SUM(balance), 0)::bigint AS in_circulation FROM investcoins_balance`);
    const subs = (await query(`SELECT status, COUNT(*)::int AS n FROM subscriptions GROUP BY status ORDER BY n DESC`)).rows;
    const domains = (await query(`SELECT domain, COUNT(DISTINCT user_id)::int AS players FROM virtual_portfolios GROUP BY domain`)).rows;
    const cryptoPlayers = Number((await query(`SELECT COUNT(*)::int AS n FROM crypto_accounts`)).rows[0].n);
    if (cryptoPlayers > 0) domains.push({ domain: 'crypto_market', players: cryptoPlayers });
    const realEstate = await one(`SELECT COUNT(*)::int AS players FROM re_games`);
    const loans = (await query(`SELECT product, status, COUNT(*)::int AS n FROM bank_loans GROUP BY product, status ORDER BY product, status`)).rows;
    return {
      users, signupsLast30Days: signups,
      coins: { inCirculation: Number(coins.in_circulation), byDomain: await investcoinsRepository.ledgerStatsByDomain(), sinks: await investcoinsRepository.sinksByDomainAndReason() },
      subscriptions: subs, players: { trading: domains, realEstate: realEstate.players }, loans,
    };
  },

  // ── Facturation ───────────────────────────────────────────────────────
  async billing() {
    const rows = (await query(
      `SELECT s.status, s.tier, s.payment_provider, s.current_period_end, s.canceled_at, u.email, u.id AS user_id
       FROM subscriptions s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 100`)).rows;
    const summary = (await query(`SELECT status, COUNT(*)::int AS n FROM subscriptions GROUP BY status`)).rows;
    return { summary, subscriptions: rows, stripeConfigured: !!env.stripe.secretKey };
  },

  // ── Alertes proactives (règles simples, calculées à la demande) ───────
  async alerts() {
    type Alert = { level: 'critique' | 'attention' | 'info'; code: string; title: string; detail: string };
    const out: Alert[] = [];
    const n = async (sql: string) => Number((await query(sql)).rows[0].n);
    const locked = await n(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'login_locked' AND created_at > NOW() - INTERVAL '1 hour'`);
    if (locked >= 5) out.push({ level: 'critique', code: 'LOGIN_LOCKS', title: 'Nombreux verrouillages de comptes', detail: `${locked} comptes verrouillés en 1 h : attaque de type credential-stuffing possible. Voir le journal d'audit.` });
    else if (locked > 0) out.push({ level: 'info', code: 'LOGIN_LOCKS', title: 'Comptes verrouillés récemment', detail: `${locked} verrouillage(s) en 1 h.` });
    const failed = await n(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'login_failed' AND created_at > NOW() - INTERVAL '10 minutes'`);
    if (failed >= 50) out.push({ level: 'attention', code: 'LOGIN_FAILURES', title: 'Beaucoup d\'échecs de connexion', detail: `${failed} échecs en 10 minutes.` });
    const mismatch = await n(`SELECT COUNT(*)::int AS n FROM investcoins_balance b WHERE EXISTS (SELECT 1 FROM investcoins_transactions t WHERE t.user_id = b.user_id)
       AND b.balance <> (SELECT COALESCE(SUM(t.amount),0) FROM investcoins_transactions t WHERE t.user_id = b.user_id)`);
    if (mismatch > 0) out.push({ level: 'critique', code: 'LEDGER_MISMATCH', title: 'Soldes différents du registre', detail: `${mismatch} joueur(s) dont le solde ne correspond pas à la somme de leur registre (hors soldes antérieurs au registre). À examiner sans attendre.` });
    const neg = await n(`SELECT COUNT(*)::int AS n FROM investcoins_balance WHERE balance < 0`);
    if (neg > 0) out.push({ level: 'critique', code: 'NEGATIVE_BALANCE', title: 'Solde négatif', detail: `${neg} joueur(s) avec un solde négatif : ne devrait jamais arriver.` });
    // Domaine Crypto (marché simulé) : cohérence du registre, rafales d'ordres, ventes forcées.
    const cryptoCreated = await n(`SELECT COUNT(*)::int AS n FROM investcoins_transactions WHERE domain = 'crypto_market' AND nature = 'creation'`);
    if (cryptoCreated > 0) out.push({ level: 'critique', code: 'CRYPTO_COIN_CREATION', title: 'Pièces créées par le marché Crypto', detail: `${cryptoCreated} écriture(s) de création dans le domaine Crypto : le trading ne doit jamais créer de pièces (seul le crédit bancaire en crée).` });
    const cryptoDrift = await n(`SELECT COUNT(*)::int AS n FROM (
        SELECT t.user_id, SUM(t.amount) AS led FROM investcoins_transactions t WHERE t.domain = 'crypto_market' AND t.reason IN ('trade_buy','trade_sell','fee_brokerage','tax_capital_gains') GROUP BY t.user_id) l
      LEFT JOIN (SELECT user_id, SUM(CASE WHEN swap THEN 0 WHEN side = 'sell' THEN notional_coins ELSE -notional_coins END) - SUM(fee_coins) - SUM(tax_coins) AS fl FROM crypto_fills GROUP BY user_id) f ON f.user_id = l.user_id
      WHERE l.led <> COALESCE(f.fl, 0)`);
    if (cryptoDrift > 0) out.push({ level: 'critique', code: 'CRYPTO_LEDGER_DRIFT', title: 'Registre et exécutions Crypto incohérents', detail: `${cryptoDrift} joueur(s) dont les écritures du domaine Crypto ne correspondent pas à leurs exécutions. À examiner sans attendre.` });
    const burst = await n(`SELECT COUNT(*)::int AS n FROM (SELECT user_id FROM audit_logs WHERE action IN ('crypto.order.create','crypto.swap') AND created_at > NOW() - INTERVAL '1 hour' GROUP BY user_id HAVING COUNT(*) >= 300) x`);
    if (burst > 0) out.push({ level: 'attention', code: 'CRYPTO_ORDER_BURST', title: 'Rafale d\'ordres Crypto', detail: `${burst} joueur(s) ont passé 300 ordres ou plus en 1 h : script automatisé possible.` });
    const liq = await n(`SELECT COUNT(*)::int AS n FROM bank_events WHERE kind = 'liquidation' AND details ? 'proceeds' AND created_at > NOW() - INTERVAL '24 hours' AND loan_id IN (SELECT id FROM bank_loans WHERE domain = 'crypto_market')`);
    if (liq > 0) out.push({ level: 'info', code: 'CRYPTO_LIQUIDATIONS', title: 'Ventes forcées sur prêts Crypto', detail: `${liq} vente(s) forcée(s) en 24 h.` });
    const defaulted = await n(`SELECT COUNT(*)::int AS n FROM bank_loans WHERE status = 'defaulted'`);
    if (defaulted > 0) out.push({ level: 'info', code: 'BANK_DEFAULTS', title: 'Prêts en défaut', detail: `${defaulted} prêt(s) en défaut (les joueurs peuvent lancer la procédure de rétablissement).` });
    const pastDue = await n(`SELECT COUNT(*)::int AS n FROM subscriptions WHERE status IN ('past_due','unpaid')`);
    if (pastDue > 0) out.push({ level: 'attention', code: 'PAST_DUE', title: 'Abonnements impayés', detail: `${pastDue} abonnement(s) en impayé chez Stripe.` });
    const stale = await n(`SELECT COUNT(*)::int AS n FROM users WHERE verified IS NOT TRUE AND created_at < NOW() - INTERVAL '7 days'`);
    if (stale > 20) out.push({ level: 'info', code: 'UNVERIFIED', title: 'Comptes jamais vérifiés', detail: `${stale} comptes créés il y a plus de 7 jours n'ont pas validé leur e-mail.` });
    const cfg = adminService.configChecks().filter((c) => c.status === 'ko');
    if (cfg.length) out.push({ level: 'attention', code: 'CONFIG', title: 'Configuration de sécurité incomplète', detail: cfg.map((c) => c.label).join(' · ') });
    return { alerts: out, checkedAt: new Date().toISOString() };
  },

  // ── Configuration et santé du serveur ─────────────────────────────────
  configChecks() {
    type Check = { key: string; label: string; status: 'ok' | 'ko' | 'info'; hint: string };
    const c = (key: string, label: string, ok: boolean, hint: string, onlyProd = false): Check => ({ key, label, status: onlyProd && !env.isProd ? 'info' : ok ? 'ok' : 'ko', hint });
    return [
      c('jwt', 'Secret JWT solide (32 caractères ou plus, pas la valeur par défaut)', env.jwtSecret !== 'dev-secret-key' && env.jwtSecret.length >= 32, 'Définir JWT_SECRET (openssl rand -hex 32)'),
      c('field_key', 'Clé de chiffrement des secrets 2FA dédiée (FIELD_ENCRYPTION_KEY)', !!process.env.FIELD_ENCRYPTION_KEY, 'openssl rand -hex 32 dans .env.local'),
      c('cors', 'CORS limité au site (CORS_ORIGIN)', !env.corsOrigins.includes('*'), 'CORS_ORIGIN=https://ton-site', true),
      c('prod', 'Mode production (NODE_ENV=production)', env.isProd, 'NODE_ENV=production'),
      c('cookie_secure', 'Cookie de session réservé au HTTPS', (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : env.isProd), 'COOKIE_SECURE=true', true),
      c('trust_proxy', 'Proxy inverse déclaré (TRUST_PROXY)', env.trustProxy !== false, 'TRUST_PROXY=1 derrière nginx/Caddy', true),
      c('email', 'Envoi d\'e-mails réel (Resend ou SMTP)', env.emailProvider === 'resend' ? !!env.resendApiKey : env.emailProvider === 'smtp' ? !!(env.smtp.host && env.smtp.user) : false, 'EMAIL_PROVIDER=resend|smtp', true),
      c('stripe', 'Paiements Stripe configurés', !!env.stripe.secretKey, 'STRIPE_SECRET_KEY et prix', true),
      c('captcha', 'hCaptcha configuré', !!process.env.HCAPTCHA_SECRET_KEY, 'HCAPTCHA_SECRET_KEY', true),
      c('invite', 'Inscription sur invitation', env.inviteOnly, 'INVITE_ONLY=false ouvre l\'inscription à tous (choix produit)'),
    ];
  },

  async system() {
    const t0 = Date.now();
    let dbOk = true;
    try { await query('SELECT 1'); } catch { dbOk = false; }
    const pool = getPool() as any;
    const mem = process.memoryUsage();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      node: process.version,
      environment: env.nodeEnv,
      memory: { rssMb: Math.round(mem.rss / 1e6), heapUsedMb: Math.round(mem.heapUsed / 1e6), systemTotalMb: Math.round(os.totalmem() / 1e6), systemFreeMb: Math.round(os.freemem() / 1e6) },
      loadAverage: os.loadavg().map((x) => Math.round(x * 100) / 100),
      cpus: os.cpus().length,
      database: { ok: dbOk, pingMs: Date.now() - t0, pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } },
      config: adminService.configChecks(),
      checkedAt: new Date().toISOString(),
    };
  },
};
