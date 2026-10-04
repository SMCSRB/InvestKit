import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import { query, getClient } from '../utils/db';
import { userRepository } from '../repositories/userRepository';
import { subscriptionRepository } from '../repositories/subscriptionRepository';
import { getStripeClient } from '../utils/stripe';
import { consumeBackupCode, verifyTotpCode } from '../utils/totp';
import { decryptField } from '../utils/fieldCrypto';
import { auditLog } from './auditService';
import { sendAccountDeletionNotice } from '../utils/email';
import { invalidateUserStatus } from '../utils/userStatus';
import { socialService } from './socialService';

// ─────────────────────────────────────────────────────────────────────────
// DROITS RGPD : export de ses données (accès / portabilité) et suppression du compte (effacement).
// L'export ne contient jamais de secret (mot de passe haché, secret 2FA, codes, jetons, identifiants Stripe).
// La suppression exige le mot de passe (+ code 2FA si activée) et une confirmation écrite ; elle annule l'abonnement Stripe d'abord ;
// les données de jeu sont supprimées en cascade ; les lignes du journal d'audit sont anonymisées (jamais supprimées).
// ─────────────────────────────────────────────────────────────────────────
export type AccountErrorCode = 'INVALID_INPUT' | 'BAD_CREDENTIALS' | 'TWO_FACTOR_REQUIRED' | 'SUBSCRIPTION_CANCEL_FAILED' | 'NOT_FOUND';
export class AccountError extends Error {
  constructor(public code: AccountErrorCode, message: string) { super(message); this.name = 'AccountError'; }
}

export const DELETE_CONFIRM_PHRASE = 'SUPPRIMER';

const USER_FIELDS = `id, email, first_name, last_name, username, role, subscription_tier, free_domain, pro_override, account_type, interests, language,
  enable_2fa, last_daily_claim_at, referral_code, referred_by_user_id, profile_visibility, verified, created_at, last_login_at, friend_code, bio`;

export const exportUserData = async (userId: string) => {
  const one = async (sql: string, params: any[] = [userId]) => (await query(sql, params)).rows;
  const user = (await one(`SELECT ${USER_FIELDS} FROM users WHERE id = $1`))[0];
  if (!user) throw new AccountError('NOT_FOUND', 'Compte introuvable');
  const games = await one('SELECT id FROM re_games WHERE user_id = $1');
  const gameIds = games.map((g: any) => g.id);
  const byGame = async (table: string) => (gameIds.length ? one(`SELECT * FROM ${table} WHERE game_id = ANY($1)`, [gameIds]) : []);
  const projects = await one('SELECT * FROM investment_projects WHERE user_id = $1');
  return {
    exportedAt: new Date().toISOString(),
    notice: 'Export de tes données personnelles InvestKit. Aucun mot de passe, secret 2FA, code ni jeton n\'y figure.',
    profile: user,
    invitedUsersCount: Number((await one('SELECT COUNT(*) AS n FROM users WHERE referred_by_user_id = $1'))[0].n),
    coins: {
      balance: (await one('SELECT balance, updated_at FROM investcoins_balance WHERE user_id = $1'))[0] ?? null,
      transactions: await one('SELECT amount, reason, metadata, domain, nature, created_at FROM investcoins_transactions WHERE user_id = $1 ORDER BY created_at'),
    },
    badges: await one('SELECT badge_id, earned_at, fact_ref FROM user_badges WHERE user_id = $1 ORDER BY earned_at'),
    xp: await one('SELECT domain, source, event_key, amount, created_at FROM xp_events WHERE user_id = $1 ORDER BY created_at, id'),
    education: { progress: await one('SELECT * FROM education_progress WHERE user_id = $1'), userProgress: await one('SELECT * FROM user_progress WHERE user_id = $1') },
    portfolios: await one('SELECT domain, mode, positions, simulated_year, total_bought, total_proceeds, tax_state, started_at FROM virtual_portfolios WHERE user_id = $1'),
    cryptoMarket: {
      account: (await one('SELECT mode, start_at, simulated_at, tax_state, created_at FROM crypto_accounts WHERE user_id = $1'))[0] ?? null,
      positions: await one('SELECT a.symbol, p.* FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id WHERE p.user_id = $1'),
      orders: await one('SELECT * FROM crypto_orders WHERE user_id = $1 ORDER BY created_at'),
      fills: await one('SELECT * FROM crypto_fills WHERE user_id = $1 ORDER BY created_at'),
      events: await one('SELECT event_key, sim_date, origin, kind, title, message, lesson, created_at FROM crypto_event_log WHERE user_id = $1 ORDER BY sim_date'),
    },
    leaderboard: await one('SELECT mode, domain, period, performance_pct, capital_committed, leverage, computed_at FROM leaderboard_rankings WHERE user_id = $1'),
    projects: { projects, riskAnalyses: projects.length ? await one('SELECT * FROM risk_analysis WHERE project_id = ANY($1)', [projects.map((p: any) => p.id)]) : [] },
    social: {
      friendCode: user?.friend_code ?? null,
      // amitiés : seulement l'identifiant de l'autre joueur et l'état (aucune donnée personnelle d'un tiers)
      friendships: await one('SELECT CASE WHEN user_low = $1 THEN user_high ELSE user_low END AS other_user_id, status, requested_by = $1 AS sent_by_me, created_at, responded_at FROM friendships WHERE user_low = $1 OR user_high = $1'),
      blocks: await one('SELECT blocked AS other_user_id, created_at FROM user_blocks WHERE blocker = $1'),
      guild: (await one('SELECT g.name, g.description, m.role, m.joined_at FROM guild_members m JOIN guilds g ON g.id = m.guild_id WHERE m.user_id = $1'))[0] ?? null,
    },
    investorProfile: await one('SELECT * FROM investor_profiles WHERE user_id = $1'),
    subscriptions: await one('SELECT tier, status, payment_provider, started_at, current_period_end, canceled_at FROM subscriptions WHERE user_id = $1'),
    quota: { quota: await one('SELECT * FROM api_quota WHERE user_id = $1'), transactions: await one('SELECT * FROM quota_transactions WHERE user_id = $1') },
    realEstate: {
      games: await one('SELECT id, profile, simulated_year, simulated_month, arrears_eur, missed_months, created_at FROM re_games WHERE user_id = $1'),
      properties: await byGame('re_properties'), loans: await byGame('re_loans'), statements: await byGame('re_statements'),
      events: await byGame('re_events'), sales: await byGame('re_sales'), expertises: await byGame('re_expertises'),
      favorites: await one('SELECT listing_id, year, created_at FROM re_favorites WHERE user_id = $1'),
      savedSearches: await one('SELECT id, name, filters, created_at FROM re_saved_searches WHERE user_id = $1'),
    },
    bank: {
      account: (await one('SELECT credit_blocked, blocked_reason, blocked_until, defaults, recoveries, written_off_coins, created_at FROM bank_accounts WHERE user_id = $1'))[0] ?? null,
      loans: await one('SELECT * FROM bank_loans WHERE user_id = $1 ORDER BY created_at'),
      reservedCredit: await one('SELECT domain, coins FROM bank_credit_balances WHERE user_id = $1'),
      events: await one('SELECT kind, message, details, created_at FROM bank_events WHERE user_id = $1 ORDER BY id'),
      recoveries: await one('SELECT domain, written_off_coins, seized_coins, grant_coins, created_at FROM bank_recoveries WHERE user_id = $1'),
    },
    auditLog: await one('SELECT action, entity_type, metadata, ip_address, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at'),
  };
};

// Annulation de l'abonnement chez Stripe (si le paiement est configuré et qu'un abonnement actif existe).
export const cancelStripeSubscription = async (externalId: string): Promise<void> => { await getStripeClient().subscriptions.cancel(externalId); };

export const deleteAccount = async (
  userId: string,
  input: { password?: unknown; code?: unknown; confirm?: unknown },
  deps: { cancelSubscription: (externalId: string) => Promise<void> } = { cancelSubscription: cancelStripeSubscription },
  _ip?: string | null   // volontairement non journalisée : le journal de suppression est anonyme
) => {
  if (input.confirm !== DELETE_CONFIRM_PHRASE) throw new AccountError('INVALID_INPUT', `Confirmation requise : écris ${DELETE_CONFIRM_PHRASE}.`);
  if (typeof input.password !== 'string' || !input.password) throw new AccountError('INVALID_INPUT', 'Mot de passe requis.');
  const user = await userRepository.findById(userId);
  if (!user) throw new AccountError('NOT_FOUND', 'Compte introuvable');
  if (!(await bcrypt.compare(input.password, user.password_hash))) throw new AccountError('BAD_CREDENTIALS', 'Mot de passe incorrect.');

  if (user.enable_2fa) {
    const code = typeof input.code === 'string' ? input.code.trim() : '';
    if (!code) throw new AccountError('TWO_FACTOR_REQUIRED', 'Ton compte a la double authentification : indique ton code (ou un code de secours).');
    let ok = !!user.totp_secret && verifyTotpCode(code, decryptField(user.totp_secret));
    if (!ok && user.totp_backup_codes?.length) ok = (await consumeBackupCode(code, user.totp_backup_codes)) !== null;
    if (!ok) throw new AccountError('BAD_CREDENTIALS', 'Code de double authentification invalide.');
  }

  // Prévenance AVANT : l'adresse du compte est prévenue qu'une suppression vient d'être confirmée (au cas où ce ne serait pas son propriétaire).
  const email = user.email; const name = user.username || null;
  void Promise.resolve(sendAccountDeletionNotice(email, name, 'requested')).catch(() => undefined);

  // Abonnement Stripe annulé AVANT la suppression : on ne supprime pas un compte qui continuerait d'être facturé.
  const sub = await subscriptionRepository.findActiveByUserId(userId);
  let cancelled = false;
  if (sub?.external_subscription_id && sub.payment_provider === 'stripe') {
    try { await deps.cancelSubscription(sub.external_subscription_id); cancelled = true; }
    catch (e) { throw new AccountError('SUBSCRIPTION_CANCEL_FAILED', 'Impossible d\'annuler ton abonnement pour le moment : ton compte n\'a pas été supprimé. Réessaie plus tard ou contacte le support.'); }
  }

  const guildIds = (await query('SELECT guild_id FROM guild_members WHERE user_id = $1', [userId])).rows.map((r: any) => r.guild_id as string);
  const client: PoolClient = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);

    // 1) Registre des pièces : résumé ANONYME (totaux par domaine, nature et motif) avant d'effacer les lignes du joueur : les statistiques restent exactes.
    await client.query(
      `INSERT INTO investcoins_ledger_archive (domain, nature, reason, entries, credited, debited)
       SELECT domain, nature, reason, COUNT(*), COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0), COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0)
       FROM investcoins_transactions WHERE user_id = $1 GROUP BY domain, nature, reason
       ON CONFLICT ((COALESCE(domain, '')), nature, reason) DO UPDATE SET entries = investcoins_ledger_archive.entries + EXCLUDED.entries,
         credited = investcoins_ledger_archive.credited + EXCLUDED.credited, debited = investcoins_ledger_archive.debited + EXCLUDED.debited`, [userId]);

    // 2) Abonnements payants : trace comptable minimale, SANS identifiant de joueur ni e-mail (obligation légale de conservation, 10 ans).
    await client.query(
      `INSERT INTO billing_records_archive (tier, payment_provider, external_subscription_id, started_at, current_period_end, canceled_at)
       SELECT tier, payment_provider, external_subscription_id, started_at, current_period_end, canceled_at
       FROM subscriptions WHERE user_id = $1 AND external_subscription_id IS NOT NULL`, [userId]);

    // 3) Données libres du joueur : ses retours (texte libre) sont supprimés ; les notifications des AUTRES joueurs qui citent son pseudo aussi.
    await client.query('DELETE FROM feedback WHERE user_id = $1', [userId]);
    if (user.username) {
      const like = `%${String(user.username).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      await client.query(`DELETE FROM notifications WHERE kind IN ('friend_request', 'friend_accepted') AND user_id <> $1 AND body LIKE $2`, [userId, like]);
    }

    // 4) Journal d'audit : plus d'auteur, plus d'adresse IP, plus d'identifiant de la personne, plus de cible/e-mail/pseudo dans les détails.
    await client.query(
      `UPDATE audit_logs SET user_id = CASE WHEN user_id = $1 THEN NULL ELSE user_id END,
         ip_address = CASE WHEN user_id = $1 THEN NULL ELSE ip_address END,
         entity_id = CASE WHEN entity_id = $1 THEN NULL ELSE entity_id END,
         metadata = metadata - 'target' - 'email' - 'username'
       WHERE user_id = $1 OR entity_id = $1`, [userId]);
    // La suppression elle-même est journalisée, de façon anonyme (ni identifiant, ni IP, ni e-mail) : seulement qu'une suppression a eu lieu.
    await auditLog({ userId: null, action: 'account_deleted', entityType: 'user', entityId: null, metadata: { subscriptionCancelled: cancelled, hadPaidSubscription: !!sub, accountAgeDays: Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) } }, client);

    await client.query('DELETE FROM users WHERE id = $1', [userId]);   // cascade : données de jeu, prêts, pièces, amis, guildes (appartenance), photo, codes…
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  invalidateUserStatus(userId);   // un jeton encore valide ne doit plus rien ouvrir
  // Guildes : si le joueur en était le chef, le membre le plus ancien reprend ; guilde vide : supprimée.
  for (const gid of guildIds) await socialService.healGuild(gid).catch((e) => console.error('Guild heal error:', e));
  void Promise.resolve(sendAccountDeletionNotice(email, name, 'done')).catch(() => undefined);
  return { deleted: true, subscriptionCancelled: cancelled };
};
