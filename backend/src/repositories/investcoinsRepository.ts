import type { QueryResult } from 'pg';
import { query, getClient } from '../utils/db';

// Tout ce qui sait exécuter une requête : le pool, ou un client engagé dans
// une transaction en cours (pour que débit + mise à jour du portefeuille
// réussissent ou échouent ENSEMBLE).
export interface Queryable {
  query: (text: string, params?: any[]) => Promise<QueryResult<any>>;
}

export class InsufficientFundsError extends Error {
  constructor() {
    super('Solde InvestCoins insuffisant');
    this.name = 'InsufficientFundsError';
  }
}

// 'credit' / 'repayment' : pièces créées à l'emprunt / détruites au remboursement (module Banque, voir config/bankRules.ts).
export type LedgerNature = 'creation' | 'destruction' | 'exchange' | 'credit' | 'repayment';

// Chaque écriture porte son domaine et sa nature (voir migration 013) :
// - achat/vente (trade_*) et apport/travaux immobiliers (re_exchange_*) = simple
//   échange entre le solde et un actif ;
// - tout autre crédit = pièces CRÉÉES par la plateforme ;
// - tout autre débit = pièces DÉTRUITES (frais, taxes, intérêts...).
// Le domaine vient de metadata.domain ; absent = hors domaine (NULL).
const classify = (
  amount: number,
  reason: string,
  metadata?: { domain?: unknown }
): { domain: string | null; nature: LedgerNature } => ({
  domain: typeof metadata?.domain === 'string' ? metadata.domain : null,
  nature: reason === 'bank_disburse' ? 'credit'
    : reason === 'bank_recovery_grant' ? 'creation'   // capital de base offert après une procédure de rétablissement
    : reason.startsWith('bank_') ? 'repayment'
    : reason.startsWith('trade_') || reason.startsWith('re_exchange_') ? 'exchange'
    : amount > 0 ? 'creation' : 'destruction',
});

// Crédit FLÉCHÉ : des pièces empruntées non dépensées (table bank_credit_balances) ne se dépensent que dans le domaine du prêt.
// Un débit dans le domaine D est refusé s'il entamerait les pièces réservées à un AUTRE domaine ; un débit sans domaine est refusé
// s'il entamerait n'importe quelle réserve. Les écritures « bank_* » (remboursements) échappent à la règle.
const isBankReason = (reason: string): boolean => reason.startsWith('bank_');

// Après un remboursement, la somme des réserves ne doit jamais dépasser le solde (les pièces rendues à la banque étaient peut-être réservées).
const shrinkReservesToBalance = async (db: Queryable, userId: string, balance: number): Promise<void> => {
  const rows = (await db.query('SELECT domain, coins FROM bank_credit_balances WHERE user_id = $1 AND coins > 0 ORDER BY coins DESC FOR UPDATE', [userId])).rows;
  let total = rows.reduce((a: number, r: any) => a + Number(r.coins), 0);
  for (const r of rows) {
    if (total <= balance) break;
    const cut = Math.min(Number(r.coins), total - balance);
    await db.query('UPDATE bank_credit_balances SET coins = coins - $3 WHERE user_id = $1 AND domain = $2', [userId, r.domain, cut]);
    total -= cut;
  }
};

const applyWith = async (
  db: Queryable,
  userId: string,
  amount: number,
  reason: string,
  metadata?: { domain?: unknown; [key: string]: unknown }
): Promise<number> => {
  // Le ledger est en pièces ENTIÈRES. Un montant décimal serait arrondi en
  // silence par la base (un achat à 0,4 🪙 deviendrait gratuit) : on refuse
  // plutôt que d'arrondir dans le dos de l'appelant.
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error(`Montant InvestCoins invalide : ${amount}`);
  }

  let balance: number;

  if (amount < 0) {
    // Débit CONDITIONNEL et atomique : la ligne est verrouillée pendant
    // l'UPDATE, et la condition est réévaluée sur la valeur à jour. Deux
    // achats simultanés ne peuvent donc pas dépenser deux fois le même solde.
    const bank = isBankReason(reason);
    const spendDomain = typeof metadata?.domain === 'string' ? metadata.domain : '';
    const result = await db.query(
      `UPDATE investcoins_balance
       SET balance = balance + $2, updated_at = NOW()
       WHERE user_id = $1 AND balance + $2 >= 0
         AND ($4::boolean OR balance + $2 >= COALESCE((SELECT SUM(coins) FROM bank_credit_balances WHERE user_id = $1 AND domain <> $3), 0))
       RETURNING balance`,
      [userId, amount, spendDomain, bank]
    );
    if (result.rows.length === 0) throw new InsufficientFundsError();
    balance = result.rows[0].balance;
    if (bank) await shrinkReservesToBalance(db, userId, balance);
    else if (spendDomain) {
      // Les pièces empruntées du domaine sont dépensées en premier.
      await db.query('UPDATE bank_credit_balances SET coins = GREATEST(0, coins + $3) WHERE user_id = $1 AND domain = $2', [userId, spendDomain, amount]);
    }
  } else {
    const result = await db.query(
      `INSERT INTO investcoins_balance (user_id, balance, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET balance = investcoins_balance.balance + EXCLUDED.balance, updated_at = NOW()
       RETURNING balance`,
      [userId, amount]
    );
    balance = result.rows[0].balance;
  }

  const { domain, nature } = classify(amount, reason, metadata);
  await db.query(
    `INSERT INTO investcoins_transactions (user_id, amount, reason, metadata, domain, nature)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, amount, reason, metadata ? JSON.stringify(metadata) : null, domain, nature]
  );

  return balance;
};

export const investcoinsRepository = {
  async getBalance(userId: string, db: Queryable = { query }): Promise<number> {
    const result = await db.query('SELECT balance FROM investcoins_balance WHERE user_id = $1', [userId]);
    return result.rows[0]?.balance ?? 0;
  },

  // Crédite (amount > 0) ou débite (amount < 0) le solde ET journalise la
  // transaction, de façon atomique. Sans `db`, ouvre sa propre transaction ;
  // avec un client existant, s'intègre à la transaction de l'appelant.
  // Lève InsufficientFundsError si un débit dépasserait le solde.
  async applyTransaction(
    userId: string,
    amount: number,
    reason: string,
    metadata?: { domain?: unknown; [key: string]: unknown },
    db?: Queryable
  ): Promise<number> {
    if (db) return applyWith(db, userId, amount, reason, metadata);

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const balance = await applyWith(client, userId, amount, reason, metadata);
      await client.query('COMMIT');
      return balance;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Statistique d'administration : pièces créées, détruites et échangées PAR DOMAINE (colonnes domain et
  // nature du ledger). `netInjected` = somme de toutes les écritures du domaine = pièces que le domaine a
  // fait entrer dans (+) ou sortir de (−) l'économie des joueurs ; `created` / `destroyed` isolent les
  // créations et destructions « pures », `exchangeNet` les allers-retours achat/vente.
  async ledgerStatsByDomain() {
    const result = await query(
      `SELECT COALESCE(domain, '(hors domaine)') AS domain, nature,
              COUNT(*)::int AS entries,
              COALESCE(SUM(amount), 0)::bigint AS net,
              COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::bigint AS credited,
              COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0)::bigint AS debited
       FROM investcoins_transactions GROUP BY 1, 2 ORDER BY 1, 2`
    );
    const byDomain: Record<string, { created: number; destroyed: number; credited: number; repaid: number; exchangeNet: number; netInjected: number; entries: number }> = {};
    for (const r of result.rows) {
      const d = (byDomain[r.domain] ??= { created: 0, destroyed: 0, credited: 0, repaid: 0, exchangeNet: 0, netInjected: 0, entries: 0 });
      d.entries += r.entries;
      d.netInjected += Number(r.net);
      if (r.nature === 'creation') d.created += Number(r.credited);
      else if (r.nature === 'destruction') d.destroyed += Number(r.debited);
      else if (r.nature === 'credit') d.credited += Number(r.credited);
      else if (r.nature === 'repayment') d.repaid += Number(r.debited);
      else d.exchangeNet += Number(r.net);
    }
    return byDomain;
  },

  // Puits d'InvestCoins : pièces détruites PAR DOMAINE et PAR MOTIF (courtage, impôts, intérêts de prêt…), hors remboursements de prêts.
  async sinksByDomainAndReason() {
    const result = await query(
      `SELECT COALESCE(domain, '(hors domaine)') AS domain, reason, COUNT(*)::int AS entries, COALESCE(-SUM(amount), 0)::bigint AS destroyed
       FROM investcoins_transactions WHERE nature = 'destruction' GROUP BY 1, 2 ORDER BY 1, 2`
    );
    const out: Record<string, Record<string, { entries: number; destroyed: number }>> = {};
    for (const r of result.rows) (out[r.domain] ??= {})[r.reason] = { entries: r.entries, destroyed: Number(r.destroyed) };
    return out;
  },

  async getRecentTransactions(userId: string, limit = 20) {
    const result = await query(
      `SELECT amount, reason, metadata, created_at FROM investcoins_transactions
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },
};
