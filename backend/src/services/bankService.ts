import type { PoolClient } from 'pg';
import { query, getClient } from '../utils/db';
import { investcoinsRepository, InsufficientFundsError } from '../repositories/investcoinsRepository';
import { buildCoinSchedule, earlyRepaymentPenaltyH, BankInputError } from '../engine/bank';
import { convertEurosToCoins } from '../engine/immo/rent';
import { BANK_LIMITS, EARLY_REPAYMENT, BankProduct } from '../config/bankRules';

// ─────────────────────────────────────────────────────────────────────────
// BANQUE : registre unique des dettes. Tout se calcule ici, côté serveur.
// Les pièces sont créées à l'emprunt (nature « credit ») et détruites au remboursement (« repayment »), capital ET intérêts.
// Voir config/bankRules.ts pour la règle de conception : les pièces ne sortent jamais du jeu.
// ─────────────────────────────────────────────────────────────────────────
export type BankErrorCode = 'INVALID_INPUT' | 'CREDIT_BLOCKED' | 'LIMIT_REACHED' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'NOT_ALLOWED';
export class BankError extends Error {
  constructor(public code: BankErrorCode, message: string, public details?: object) { super(message); this.name = 'BankError'; }
}

type Db = { query: PoolClient['query'] };
const q = (db: Db, sql: string, params: any[] = []) => (db.query as any)(sql, params);

export const withTx = async <T>(fn: (c: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const uuidOk = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const fr = (n: number): string => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const coinsOfH = (h: number | string): number => Math.round(Number(h)) / 100;

// Pièces réellement dépensables dans un domaine : solde moins les pièces empruntées réservées à un AUTRE domaine.
export const spendableCoins = async (db: Db, userId: string, domain: string): Promise<number> => {
  const balance = await investcoinsRepository.getBalance(userId, db as any);
  const r = await q(db, 'SELECT COALESCE(SUM(coins), 0) AS s FROM bank_credit_balances WHERE user_id = $1 AND domain <> $2', [userId, domain]);
  return Math.max(0, balance - Number(r.rows[0].s));
};

// Échéances mensuelles des prêts bancaires à annuités d'un domaine (actifs et en défaut), en pièces par mois.
export const monthlyInstalmentCoins = async (db: Db, userId: string, domain: string): Promise<number> => {
  const loans = (await q(db, `SELECT principal_coins, annual_rate_pct, months FROM bank_loans WHERE user_id = $1 AND domain = $2 AND status IN ('active','defaulted') AND repayment_type = 'annuity'`, [userId, domain])).rows;
  let h = 0;
  for (const l of loans) h += buildCoinSchedule({ principalCoins: l.principal_coins, annualRatePct: Number(l.annual_rate_pct), months: l.months }).rows[0].paymentH;
  return h / 100;
};

export const logBankEvent = async (db: Db, userId: string, loanId: string | null, kind: string, message: string, details: object = {}) => {
  await q(db, 'INSERT INTO bank_events (user_id, loan_id, kind, message, details) VALUES ($1,$2,$3,$4,$5)', [userId, loanId, kind, message, JSON.stringify(details)]);
};

export const ensureAccount = async (db: Db, userId: string) => {
  await q(db, 'INSERT INTO bank_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
  return (await q(db, 'SELECT * FROM bank_accounts WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
};

// Dette en cours d'un joueur (capital restant, en pièces entières arrondies au-dessus) : prêts actifs ET défaillants.
export const outstandingCoins = async (db: Db, userId: string): Promise<number> => {
  const r = await q(db, `SELECT COALESCE(SUM(balance_h), 0) AS h FROM bank_loans WHERE user_id = $1 AND status IN ('active', 'defaulted')`, [userId]);
  return Math.ceil(Number(r.rows[0].h) / 100);
};

// Verrou de sécurité avant tout emprunt : compte bloqué, nombre de prêts, dette totale.
export const assertCanBorrow = async (db: Db, userId: string, principalCoins: number): Promise<void> => {
  if (!Number.isInteger(principalCoins) || principalCoins <= 0) throw new BankError('INVALID_INPUT', 'Le montant emprunté doit être un nombre entier de pièces supérieur à zéro');
  let acc = await ensureAccount(db, userId);
  // Interdiction de crédit après une procédure de rétablissement : elle expire d'elle-même.
  if (acc.credit_blocked && acc.blocked_reason === 'recovery' && acc.blocked_until && new Date(acc.blocked_until).getTime() <= Date.now()) {
    const stillDefaulted = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND status = 'defaulted'`, [userId])).rows[0].n);
    await q(db, `UPDATE bank_accounts SET credit_blocked = $2, blocked_reason = $3, blocked_until = NULL WHERE user_id = $1`, [userId, stillDefaulted > 0, stillDefaulted > 0 ? 'default' : null]);
    acc = await ensureAccount(db, userId);
  }
  if (acc.credit_blocked) {
    throw new BankError('CREDIT_BLOCKED', 'Tu ne peux plus emprunter : un de tes prêts est en défaut. Rembourse-le, ou engage la procédure de rétablissement.', { reason: acc.blocked_reason });
  }
  const active = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND status = 'active'`, [userId])).rows[0].n);
  if (active >= BANK_LIMITS.maxActiveLoansPerUser) {
    throw new BankError('LIMIT_REACHED', `Tu as déjà ${active} prêts en cours (maximum ${BANK_LIMITS.maxActiveLoansPerUser}).`);
  }
  const debt = await outstandingCoins(db, userId);
  if (debt + principalCoins > BANK_LIMITS.maxOutstandingPrincipalCoins) {
    throw new BankError('LIMIT_REACHED', `Dette totale limitée à ${fr(BANK_LIMITS.maxOutstandingPrincipalCoins)} 🪙 (tu dois déjà ${fr(debt)} 🪙).`);
  }
};

export interface OriginateInput {
  userId: string; product: BankProduct; domain: string; principalCoins: number; annualRatePct: number; months: number;
  clockTotal: number; repaymentType?: 'annuity' | 'interest_only'; earmark?: boolean; meta?: object;
}

// Ouvre un prêt : dette enregistrée, pièces CRÉES (nature « credit »), et — par défaut — fléchées vers le domaine du prêt.
export const originateLoan = async (db: Db, o: OriginateInput): Promise<{ loanId: string }> => {
  await assertCanBorrow(db, o.userId, o.principalCoins);
  const type = o.repaymentType ?? 'annuity';
  if (type === 'annuity') buildCoinSchedule({ principalCoins: o.principalCoins, annualRatePct: o.annualRatePct, months: o.months }); // valide les entrées
  const ins = await q(db,
    `INSERT INTO bank_loans (user_id, product, domain, repayment_type, principal_coins, annual_rate_pct, months, balance_h, opened_clock_total, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [o.userId, o.product, o.domain, type, o.principalCoins, o.annualRatePct, o.months, o.principalCoins * 100, o.clockTotal, JSON.stringify(o.meta ?? {})]);
  const loanId = ins.rows[0].id as string;
  await investcoinsRepository.applyTransaction(o.userId, o.principalCoins, 'bank_disburse', { domain: o.domain, loanId, product: o.product }, db as any);
  if (o.earmark !== false) {
    await q(db, `INSERT INTO bank_credit_balances (user_id, domain, coins) VALUES ($1,$2,$3)
                 ON CONFLICT (user_id, domain) DO UPDATE SET coins = bank_credit_balances.coins + EXCLUDED.coins`, [o.userId, o.domain, o.principalCoins]);
  }
  await logBankEvent(db, o.userId, loanId, 'loan_opened', `Prêt accordé : ${fr(o.principalCoins)} 🪙 à ${o.annualRatePct.toFixed(2).replace('.', ',')} % sur ${o.months} mois.`, { product: o.product, domain: o.domain });
  return { loanId };
};

// Règle un mois d'horloge pour les prêts à annuités d'un domaine : une échéance tombe, elle est payée si le solde le permet,
// sinon elle s'accumule. 3 échéances impayées de suite = défaut : le compte est bloqué, la dette reste due.
export const settleMonth = async (db: Db, userId: string, domain: string, clockTotal: number) => {
  const events: { loanId: string; kind: string; message: string }[] = [];
  const loans = (await q(db,
    `SELECT * FROM bank_loans WHERE user_id = $1 AND domain = $2 AND status = 'active' AND repayment_type = 'annuity'
       AND (last_clock_total IS NULL OR last_clock_total < $3) ORDER BY created_at FOR UPDATE`, [userId, domain, clockTotal])).rows;
  for (const loan of loans) {
    const sched = buildCoinSchedule({ principalCoins: loan.principal_coins, annualRatePct: Number(loan.annual_rate_pct), months: loan.months });
    let accrued: number = loan.accrued_instalments;
    let dueP = Number(loan.due_principal_h), dueI = Number(loan.due_interest_h);
    let balanceH = Number(loan.balance_h), remainder: number = loan.remainder_h;
    let missed: number = loan.missed_instalments, paidP = Number(loan.principal_paid_h), paidI = Number(loan.interest_paid_h);
    let status: string = 'active';
    if (accrued < loan.months) {
      const row = sched.rows[accrued];
      accrued += 1; dueP += row.principalH; dueI += row.interestH;
    }
    if (dueP + dueI > 0) {
      const conv = convertEurosToCoins(remainder, -(dueP + dueI), 1);
      const debit = -conv.coins;
      const wallet = await investcoinsRepository.getBalance(userId, db as any);
      if (wallet >= debit) {
        if (debit > 0) await investcoinsRepository.applyTransaction(userId, -debit, 'bank_repayment', { domain, loanId: loan.id, principalH: dueP, interestH: dueI }, db as any);
        balanceH -= dueP; paidP += dueP; paidI += dueI; remainder = conv.remainderCents; dueP = 0; dueI = 0; missed = 0;
      } else {
        missed += 1;
        const msg = `Échéance impayée (${fr(coinsOfH(dueP + dueI))} 🪙 dus) : solde insuffisant. ${missed} échéance(s) impayée(s) de suite.`;
        await logBankEvent(db, userId, loan.id, 'instalment_missed', msg, { missed });
        events.push({ loanId: loan.id, kind: 'instalment_missed', message: msg });
        if (missed >= BANK_LIMITS.missedInstalmentsBeforeDefault) {
          status = 'defaulted';
          await q(db, `UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', blocked_at = NOW(), defaults = defaults + 1 WHERE user_id = $1`, [userId]);
          const dmsg = `Défaut de paiement : ${missed} échéances impayées de suite. La dette de ${fr(coinsOfH(balanceH))} 🪙 reste due, et tu ne peux plus emprunter tant qu'elle n'est pas réglée.`;
          await logBankEvent(db, userId, loan.id, 'loan_defaulted', dmsg, {});
          events.push({ loanId: loan.id, kind: 'loan_defaulted', message: dmsg });
        }
      }
    }
    if (status === 'active' && accrued >= loan.months && dueP + dueI === 0) {
      status = 'repaid';
      await logBankEvent(db, userId, loan.id, 'loan_repaid', 'Prêt entièrement remboursé.', {});
      events.push({ loanId: loan.id, kind: 'loan_repaid', message: 'Prêt entièrement remboursé.' });
    }
    await q(db,
      `UPDATE bank_loans SET accrued_instalments = $2, due_principal_h = $3, due_interest_h = $4, balance_h = $5, remainder_h = $6,
         missed_instalments = $7, principal_paid_h = $8, interest_paid_h = $9, last_clock_total = $10, status = $11::varchar,
         closed_at = CASE WHEN $11::varchar = 'repaid' THEN NOW() ELSE closed_at END WHERE id = $1`,
      [loan.id, accrued, dueP, dueI, balanceH, remainder, missed, paidP, paidI, clockTotal, status]);
  }
  return events;
};

// Le blocage se lève quand plus aucun prêt du joueur n'est en défaut.
const unblockIfClean = async (db: Db, userId: string) => {
  const n = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND status = 'defaulted'`, [userId])).rows[0].n);
  if (n === 0) await q(db, `UPDATE bank_accounts SET credit_blocked = FALSE, blocked_reason = NULL WHERE user_id = $1 AND blocked_reason = 'default'`, [userId]);
};

export const bankService = {
  // Remboursement anticipé TOTAL : capital restant + intérêts déjà tombés + indemnité (1 % si plus d'un an restait, 0,5 % sinon).
  async earlyRepay(userId: string, loanIdRaw: unknown) {
    if (!uuidOk(loanIdRaw)) throw new BankError('INVALID_INPUT', 'Identifiant de prêt invalide');
    return withTx(async (c) => {
      const loan = (await q(c, `SELECT * FROM bank_loans WHERE id = $1 AND user_id = $2 FOR UPDATE`, [loanIdRaw, userId])).rows[0];
      if (!loan) throw new BankError('NOT_FOUND', 'Prêt introuvable');
      if (loan.status !== 'active' && loan.status !== 'defaulted') throw new BankError('INVALID_INPUT', 'Ce prêt est déjà clos');
      if (loan.repayment_type === 'interest_only') throw new BankError('INVALID_INPUT', 'Un prêt sur portefeuille se rembourse depuis la carte du prêt (remboursement partiel ou total, sans indemnité).');
      const remainingMonths = Math.max(0, loan.months - loan.accrued_instalments);
      const balanceH = Number(loan.balance_h), dueI = Number(loan.due_interest_h);
      const penaltyH = earlyRepaymentPenaltyH(balanceH, remainingMonths, EARLY_REPAYMENT);
      const totalH = balanceH + dueI + penaltyH;
      const conv = convertEurosToCoins(loan.remainder_h, -totalH, 1);
      const debit = -conv.coins;
      try {
        if (debit > 0) await investcoinsRepository.applyTransaction(userId, -debit, 'bank_repayment', { domain: loan.domain, loanId: loan.id, principalH: balanceH, interestH: dueI + penaltyH, early: true }, c as any);
      } catch (e) {
        if (e instanceof InsufficientFundsError) throw new BankError('INSUFFICIENT_FUNDS', `Solde insuffisant : il faut ${debit} 🪙 pour solder ce prêt.`, { needed: debit });
        throw e;
      }
      await q(c, `UPDATE bank_loans SET status = 'repaid', balance_h = 0, due_principal_h = 0, due_interest_h = 0, missed_instalments = 0, remainder_h = $2,
                    principal_paid_h = principal_paid_h + $3, interest_paid_h = interest_paid_h + $4, closed_at = NOW() WHERE id = $1`,
        [loan.id, conv.remainderCents, balanceH, dueI + penaltyH]);
      const message = `Prêt soldé par anticipation : ${fr(debit)} 🪙 (capital ${fr(coinsOfH(balanceH))}, indemnité ${fr(coinsOfH(penaltyH))}).`;
      await logBankEvent(c, userId, loan.id, 'loan_repaid_early', message, { debit, penaltyH });
      await unblockIfClean(c, userId);
      return { loanId: loan.id, coinsPaid: debit, penaltyCoins: coinsOfH(penaltyH), message };
    });
  },

  async overview(userId: string) {
    const acc = (await q({ query } as any, 'SELECT * FROM bank_accounts WHERE user_id = $1', [userId])).rows[0];
    const loans = (await query(`SELECT * FROM bank_loans WHERE user_id = $1 ORDER BY created_at DESC`, [userId])).rows;
    const reserved = (await query(`SELECT domain, coins FROM bank_credit_balances WHERE user_id = $1 AND coins > 0 ORDER BY domain`, [userId])).rows;
    const items = loans.map((l: any) => {
      const sched = l.repayment_type === 'annuity' ? buildCoinSchedule({ principalCoins: l.principal_coins, annualRatePct: Number(l.annual_rate_pct), months: l.months }) : null;
      const next = sched && l.status === 'active' && l.accrued_instalments < l.months ? sched.rows[l.accrued_instalments] : null;
      return {
        id: l.id, product: l.product, domain: l.domain, status: l.status, repaymentType: l.repayment_type,
        principalCoins: l.principal_coins, annualRatePct: Number(l.annual_rate_pct), months: l.months, monthsElapsed: l.accrued_instalments,
        balanceCoins: coinsOfH(l.balance_h), overdueCoins: coinsOfH(Number(l.due_principal_h) + Number(l.due_interest_h)), missedInstalments: l.missed_instalments,
        nextInstalmentCoins: next ? coinsOfH(next.paymentH) : null,
        principalPaidCoins: coinsOfH(l.principal_paid_h), interestPaidCoins: coinsOfH(l.interest_paid_h),
        totalInterestCoins: sched ? coinsOfH(sched.totalInterestH) : null, meta: l.meta,
      };
    });
    const debt = items.filter((i: any) => i.status === 'active' || i.status === 'defaulted').reduce((a: number, i: any) => a + i.balanceCoins, 0);
    return {
      account: { creditBlocked: !!acc?.credit_blocked, blockedReason: acc?.blocked_reason ?? null, blockedUntil: acc?.blocked_until ?? null, defaults: acc?.defaults ?? 0, recoveries: acc?.recoveries ?? 0, writtenOffCoins: Number(acc?.written_off_coins ?? 0) },
      totals: { outstandingCoins: Math.round(debt * 100) / 100, activeLoans: items.filter((i: any) => i.status === 'active').length,
        maxActiveLoans: BANK_LIMITS.maxActiveLoansPerUser, maxOutstandingCoins: BANK_LIMITS.maxOutstandingPrincipalCoins },
      reservedCredit: reserved.map((r: any) => ({ domain: r.domain, coins: r.coins })),
      loans: items,
    };
  },

  async events(userId: string, limitRaw?: unknown) {
    const limit = limitRaw === undefined ? 50 : Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new BankError('INVALID_INPUT', 'limit invalide');
    const rows = (await query('SELECT id, loan_id, kind, message, details, created_at FROM bank_events WHERE user_id = $1 ORDER BY id DESC LIMIT $2', [userId, limit])).rows;
    return { events: rows };
  },

  // Statistique d'administration : dette en cours par produit et domaine, défauts, comptes bloqués.
  async adminStats() {
    const outstanding = (await query(
      `SELECT product, domain, COUNT(*)::int AS loans, COALESCE(CEIL(SUM(balance_h) / 100.0), 0)::bigint AS coins
       FROM bank_loans WHERE status IN ('active', 'defaulted') GROUP BY 1, 2 ORDER BY 1, 2`)).rows;
    const defaulted = Number((await query(`SELECT COUNT(*) AS n FROM bank_loans WHERE status = 'defaulted'`)).rows[0].n);
    const blocked = Number((await query(`SELECT COUNT(*) AS n FROM bank_accounts WHERE credit_blocked`)).rows[0].n);
    const wo = (await query(`SELECT COALESCE(SUM(written_off_coins), 0) AS w, COALESCE(SUM(recoveries), 0) AS r FROM bank_accounts`)).rows[0];
    const writtenOff = Number(wo.w), recoveries = Number(wo.r);
    return {
      outstanding: outstanding.map((r: any) => ({ product: r.product as string, domain: r.domain as string, loans: r.loans as number, outstandingCoins: Number(r.coins) })),
      defaultedLoans: defaulted, blockedAccounts: blocked, writtenOffCoins: writtenOff, recoveries,
    };
  },
};

export { BankInputError };
