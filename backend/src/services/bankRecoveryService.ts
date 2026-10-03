import { query } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { virtualPortfolioRepository } from '../repositories/virtualPortfolioRepository';
import { getDomain } from '../data/marketData';
import { RECOVERY } from '../config/bankRules';
import { BankError, withTx, ensureAccount, logBankEvent } from './bankService';
import { auditLog } from './auditService';

// ─────────────────────────────────────────────────────────────────────────
// PROCÉDURE DE RÉTABLISSEMENT (après un défaut sur un prêt d'un domaine). Ce n'est PAS une remise à zéro gratuite :
//  - la dette du domaine est effacée (le prêt passe « written_off », l'écart est suivi pour l'administrateur) ;
//  - le domaine est remis à zéro : titres ou biens perdus, partie repartant de la première année, RANG PERDU ;
//  - les pièces empruntées non dépensées de ce domaine sont reprises ;
//  - capital de base (le capital de départ, config/economy.ts) complété seulement si le joueur a moins ;
//  - interdiction de nouveau crédit 30 jours (temps réel) ; au plus 3 procédures par compte, espacées de 30 jours.
// Les badges de domaine sont aujourd'hui dans le navigateur du joueur, pas sur le serveur : ils ne peuvent pas être retirés d'ici
// (voir docs/banque.md) ; la procédure est journalisée (table bank_recoveries) pour le faire quand ils seront rattachés au serveur.
// ─────────────────────────────────────────────────────────────────────────
type Db = { query: any };
const q = (db: Db, sql: string, params: any[] = []) => db.query(sql, params);
const DOMAIN_LABEL: Record<string, string> = { real_estate: 'Immobilier', stocks: 'Bourse', crypto: 'Crypto' };
const DAY_MS = 86_400_000;

const domainOk = (d: unknown): string => {
  if (typeof d !== 'string' || !DOMAIN_LABEL[d]) throw new BankError('INVALID_INPUT', `Domaine : ${Object.keys(DOMAIN_LABEL).join(', ')}`);
  return d;
};

const assess = async (db: Db, userId: string, domain: string) => {
  const acc = (await q(db, 'SELECT * FROM bank_accounts WHERE user_id = $1', [userId])).rows[0];
  const defaulted = (await q(db, `SELECT * FROM bank_loans WHERE user_id = $1 AND domain = $2 AND status = 'defaulted' FOR UPDATE`, [userId, domain])).rows;
  const reasons: string[] = [];
  if (defaulted.length === 0) reasons.push(`Aucun de tes prêts ${DOMAIN_LABEL[domain]} n'est en défaut : la procédure ne s'applique qu'après un défaut.`);
  const recoveries = acc?.recoveries ?? 0;
  if (recoveries >= RECOVERY.maxLifetime) reasons.push(`Tu as déjà utilisé ${recoveries} procédures de rétablissement (maximum ${RECOVERY.maxLifetime}).`);
  if (acc?.last_recovery_at && Date.now() - new Date(acc.last_recovery_at).getTime() < RECOVERY.cooldownDays * DAY_MS) {
    const left = Math.ceil((RECOVERY.cooldownDays * DAY_MS - (Date.now() - new Date(acc.last_recovery_at).getTime())) / DAY_MS);
    reasons.push(`Une procédure a déjà eu lieu récemment : encore ${left} jour(s) d'attente.`);
  }
  const writtenOffH = defaulted.reduce((a: number, l: any) => a + Number(l.balance_h), 0);
  const reserve = Number((await q(db, 'SELECT COALESCE(SUM(coins), 0) AS s FROM bank_credit_balances WHERE user_id = $1 AND domain = $2', [userId, domain])).rows[0].s);
  const wallet = await investcoinsRepository.getBalance(userId, db);
  const seized = Math.min(reserve, wallet);
  const afterSeizure = wallet - seized;
  const grant = Math.max(0, RECOVERY.baseCapitalCoins - afterSeizure);
  const ranks = Number((await q(db, 'SELECT COUNT(*) AS n FROM leaderboard_rankings WHERE user_id = $1 AND domain = $2', [userId, domain])).rows[0].n);
  let assets = 'ton portefeuille de titres';
  if (domain === 'real_estate') {
    const n = Number((await q(db, `SELECT COUNT(*) AS n FROM re_properties p JOIN re_games g ON g.id = p.game_id WHERE g.user_id = $1 AND p.status <> 'sold'`, [userId])).rows[0].n);
    assets = `tes ${n} bien(s) immobilier(s) et toute ta partie Immobilier`;
  }
  return { acc, defaulted, reasons, writtenOffCoins: Math.round(writtenOffH) / 100, reserve, seized, grant, ranks, assets, recoveries };
};

export const bankRecoveryService = {
  async preview(userId: string, body: any) {
    const domain = domainOk(body?.domain);
    const a = await withTx(async (c) => { await ensureAccount(c, userId); return assess(c, userId, domain); });
    return {
      domain, domainLabel: DOMAIN_LABEL[domain], eligible: a.reasons.length === 0, reasons: a.reasons,
      willLose: { assets: a.assets, rank: a.ranks > 0, badges: 'Les badges de ce domaine seront retirés quand ils seront rattachés au serveur (aujourd\'hui ils sont enregistrés dans ton navigateur).' },
      willHappen: {
        debtWrittenOffCoins: a.writtenOffCoins, borrowedCoinsSeized: a.seized, baseCapitalTopUpCoins: a.grant, baseCapitalCoins: RECOVERY.baseCapitalCoins,
        creditBanDays: RECOVERY.creditBanDays, restart: 'La partie du domaine repart du début.',
      },
      limits: { usedProcedures: a.recoveries, maxProcedures: RECOVERY.maxLifetime, cooldownDays: RECOVERY.cooldownDays },
      confirmPhrase: RECOVERY.confirmPhrase,
    };
  },

  async start(userId: string, body: any) {
    const domain = domainOk(body?.domain);
    if (body?.confirm !== RECOVERY.confirmPhrase) throw new BankError('INVALID_INPUT', `Confirmation requise : écris ${RECOVERY.confirmPhrase} pour lancer la procédure.`);
    const work = async (c: Db) => {
      await ensureAccount(c, userId);
      const a = await assess(c, userId, domain);
      if (a.reasons.length > 0) throw new BankError('NOT_ALLOWED', a.reasons[0], { reasons: a.reasons });

      // 1. Dette du domaine effacée (suivie), pièces empruntées non dépensées reprises.
      for (const l of a.defaulted) {
        await q(c, `UPDATE bank_loans SET written_off_h = written_off_h + balance_h, balance_h = 0, due_principal_h = 0, due_interest_h = 0, status = 'written_off', closed_at = NOW() WHERE id = $1`, [l.id]);
        await logBankEvent(c, userId, l.id, 'loan_written_off', 'Dette effacée dans le cadre de la procédure de rétablissement.', { domain });
      }
      if (a.seized > 0) await investcoinsRepository.applyTransaction(userId, -a.seized, 'bank_recovery_seizure', { domain }, c);
      await q(c, 'UPDATE bank_credit_balances SET coins = 0 WHERE user_id = $1 AND domain = $2', [userId, domain]);

      // 2. Remise à zéro du domaine et perte du rang.
      if (domain === 'real_estate') await q(c, 'DELETE FROM re_games WHERE user_id = $1', [userId]);
      else {
        const d = getDomain(domain)!;
        await q(c, `UPDATE virtual_portfolios SET positions = '[]', total_bought = 0, total_proceeds = 0, tax_state = '{}'::jsonb, simulated_year = $3, updated_at = NOW() WHERE user_id = $1 AND domain = $2`, [userId, domain, d.minYear]);
      }
      await q(c, 'DELETE FROM leaderboard_rankings WHERE user_id = $1 AND domain = $2', [userId, domain]);

      // 3. Capital de base complété si besoin (pièces créées, journalisées).
      if (a.grant > 0) await investcoinsRepository.applyTransaction(userId, a.grant, 'bank_recovery_grant', { domain }, c);

      // 4. Interdiction de crédit, compteurs, journal.
      await q(c, `UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'recovery', blocked_at = NOW(), blocked_until = NOW() + ($2 || ' days')::interval,
                    recoveries = recoveries + 1, last_recovery_at = NOW(), written_off_coins = written_off_coins + $3 WHERE user_id = $1`, [userId, String(RECOVERY.creditBanDays), a.writtenOffCoins]);
      await q(c, 'INSERT INTO bank_recoveries (user_id, domain, written_off_coins, seized_coins, grant_coins) VALUES ($1,$2,$3,$4,$5)', [userId, domain, a.writtenOffCoins, a.seized, a.grant]);
      const message = `Procédure de rétablissement terminée pour ${DOMAIN_LABEL[domain]} : dette de ${a.writtenOffCoins.toLocaleString('fr-FR')} InvestCoins effacée, ${DOMAIN_LABEL[domain]} remis à zéro et rang perdu${a.grant > 0 ? `, capital de base complété de ${a.grant} InvestCoins` : ''}. Aucun nouveau crédit pendant ${RECOVERY.creditBanDays} jours.`;
      await auditLog({ userId, action: 'bank_recovery', entityType: 'user', entityId: userId, metadata: { domain, writtenOffCoins: a.writtenOffCoins, grant: a.grant } }, c);
      await logBankEvent(c, userId, null, 'recovery', message, { domain, writtenOffCoins: a.writtenOffCoins, seized: a.seized, grant: a.grant });
      return { domain, message, writtenOffCoins: a.writtenOffCoins, borrowedCoinsSeized: a.seized, baseCapitalTopUpCoins: a.grant, creditBanDays: RECOVERY.creditBanDays,
        badgesNote: 'Les badges de ce domaine seront retirés quand ils seront rattachés au serveur.' };
    };
    if (domain === 'real_estate') return withTx(work);
    const d = getDomain(domain)!;
    return virtualPortfolioRepository.withLock(userId, 'accelerated', domain, d.minYear, async (_p, tx) => work(tx as any));
  },

  async history(userId: string) {
    return { recoveries: (await query('SELECT id, domain, written_off_coins, seized_coins, grant_coins, created_at FROM bank_recoveries WHERE user_id = $1 ORDER BY id DESC', [userId])).rows };
  },
};
