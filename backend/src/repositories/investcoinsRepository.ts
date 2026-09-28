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

const applyWith = async (
  db: Queryable,
  userId: string,
  amount: number,
  reason: string,
  metadata?: object
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
    const result = await db.query(
      `UPDATE investcoins_balance
       SET balance = balance + $2, updated_at = NOW()
       WHERE user_id = $1 AND balance + $2 >= 0
       RETURNING balance`,
      [userId, amount]
    );
    if (result.rows.length === 0) throw new InsufficientFundsError();
    balance = result.rows[0].balance;
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

  await db.query(
    `INSERT INTO investcoins_transactions (user_id, amount, reason, metadata)
     VALUES ($1, $2, $3, $4)`,
    [userId, amount, reason, metadata ? JSON.stringify(metadata) : null]
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
    metadata?: object,
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

  async getRecentTransactions(userId: string, limit = 20) {
    const result = await query(
      `SELECT amount, reason, metadata, created_at FROM investcoins_transactions
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  },
};
