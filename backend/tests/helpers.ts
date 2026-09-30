import { randomUUID } from 'crypto';
import { initDatabase, executeSchema, query, closePool } from '../src/utils/db';

export const hasDb = !!process.env.TEST_DATABASE_URL;

export const setupDb = async (): Promise<void> => {
  initDatabase();
  await executeSchema(); // schema.sql + migrations (idempotents)
};

export const teardownDb = async (): Promise<void> => {
  await closePool();
};

export const createUser = async (
  opts: { balance?: number; tier?: 'free' | 'pro'; proOverride?: boolean; freeDomain?: string | null; verified?: boolean; code?: string; referredBy?: string } = {}
): Promise<string> => {
  const id = randomUUID();
  await query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, subscription_tier, pro_override,
                        free_domain, verified, verification_code, referred_by_user_id, referral_code)
     VALUES ($1, $2, 'x', 'T', 'T', $3, $4, $5, $6, $7, $8, $9)`,
    [
      id, `${id}@test.local`, opts.tier ?? 'free', opts.proOverride ?? false, opts.freeDomain ?? null,
      opts.verified ?? true, opts.code ?? null, opts.referredBy ?? null, id.slice(0, 8),
    ]
  );
  if (opts.balance !== undefined) {
    await query('INSERT INTO investcoins_balance (user_id, balance) VALUES ($1, $2)', [id, opts.balance]);
  }
  return id;
};

export const balanceOf = async (userId: string): Promise<number> => {
  const r = await query('SELECT balance FROM investcoins_balance WHERE user_id = $1', [userId]);
  return r.rows[0]?.balance ?? 0;
};

export const ledgerSum = async (userId: string): Promise<number> => {
  const r = await query('SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1', [userId]);
  return r.rows[0].s;
};
