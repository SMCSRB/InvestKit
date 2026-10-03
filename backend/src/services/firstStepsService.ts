import { getClient, query } from '../utils/db';
import type { Queryable } from '../repositories/investcoinsRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { FIRST_STEP_BONUSES, FIRST_STEPS_TOTAL_COINS, FIRST_STEP_MIN_INVESTMENT_COINS, type FirstStepKey } from '../config/economy';

// Bonus « premiers pas » : trois récompenses uniques par compte, versées par le serveur au moment où l'action a RÉELLEMENT eu lieu
// (achat enregistré, chapitre validé par la correction du quiz). Le navigateur ne demande jamais un bonus : il n'existe aucune route pour ça.
// Unicité : clé primaire (compte, clé). Plafond : trois clés possibles (contrainte en base), montants dans config/economy.ts.
const isStep = (k: string): k is FirstStepKey => Object.prototype.hasOwnProperty.call(FIRST_STEP_BONUSES, k);

const grantWith = async (db: Queryable, userId: string, step: FirstStepKey): Promise<number> => {
  const coins = FIRST_STEP_BONUSES[step];
  const inserted = await db.query(
    'INSERT INTO first_step_bonuses (user_id, step_key, coins) VALUES ($1, $2, $3) ON CONFLICT (user_id, step_key) DO NOTHING RETURNING step_key',
    [userId, step, coins]
  );
  if (inserted.rows.length === 0) return 0;                       // déjà versé : rien de plus, jamais
  await investcoinsRepository.applyTransaction(userId, coins, 'first_step_bonus', { step }, db);
  return coins;
};

// Verse le bonus s'il n'a jamais été versé. Dans la transaction de l'action (si `db` est fourni) : si l'action échoue, le bonus aussi.
// Renvoie le nombre de pièces versées (0 si déjà reçu).
export const grantFirstStep = async (userId: string, step: FirstStepKey, db?: Queryable): Promise<number> => {
  if (!isStep(step)) throw new Error(`Bonus inconnu : ${String(step)}`);
  if (db) return grantWith(db, userId, step);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const coins = await grantWith(client as unknown as Queryable, userId, step);
    await client.query('COMMIT');
    return coins;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Premier investissement : seulement à partir d'un montant minimal (réglé dans economy.ts).
export const grantFirstInvestment = async (userId: string, investedCoins: number, db: Queryable): Promise<number> =>
  investedCoins >= FIRST_STEP_MIN_INVESTMENT_COINS ? grantFirstStep(userId, 'first_investment', db) : 0;

export interface FirstStepsState {
  steps: { key: FirstStepKey; coins: number; earned: boolean; earnedAt: string | null }[];
  earnedCoins: number;
  totalCoins: number;
  minInvestmentCoins: number;
}

// État lu par l'interface (et plus tard par le guide « premiers pas ») : le serveur dit ce qui est acquis, le navigateur n'invente rien.
export const firstStepsState = async (userId: string, db: Queryable = { query } as Queryable): Promise<FirstStepsState> => {
  const rows = (await db.query('SELECT step_key, created_at FROM first_step_bonuses WHERE user_id = $1', [userId])).rows;
  const got = new Map<string, Date>(rows.map((r: any) => [String(r.step_key), r.created_at]));
  const steps = (Object.keys(FIRST_STEP_BONUSES) as FirstStepKey[]).map((key) => ({
    key, coins: FIRST_STEP_BONUSES[key], earned: got.has(key), earnedAt: got.has(key) ? new Date(got.get(key)!).toISOString() : null,
  }));
  return { steps, earnedCoins: steps.filter((s) => s.earned).reduce((a, s) => a + s.coins, 0), totalCoins: FIRST_STEPS_TOTAL_COINS, minInvestmentCoins: FIRST_STEP_MIN_INVESTMENT_COINS };
};
