import { query, getClient } from '../utils/db';

export const investcoinsRepository = {
  async getBalance(userId: string): Promise<number> {
    const result = await query('SELECT balance FROM investcoins_balance WHERE user_id = $1', [userId]);
    return result.rows[0]?.balance ?? 0;
  },

  // Crédite (amount > 0) ou débite (amount < 0) le solde et journalise la
  // transaction, de façon atomique (le solde ne doit jamais désynchroniser
  // de la somme des transactions).
  async applyTransaction(userId: string, amount: number, reason: string, metadata?: object): Promise<number> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO investcoins_balance (user_id, balance, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET balance = investcoins_balance.balance + $2, updated_at = NOW()`,
        [userId, amount]
      );

      await client.query(
        `INSERT INTO investcoins_transactions (user_id, amount, reason, metadata)
         VALUES ($1, $2, $3, $4)`,
        [userId, amount, reason, metadata ? JSON.stringify(metadata) : null]
      );

      const result = await client.query(
        'SELECT balance FROM investcoins_balance WHERE user_id = $1',
        [userId]
      );

      await client.query('COMMIT');
      return result.rows[0].balance;
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
