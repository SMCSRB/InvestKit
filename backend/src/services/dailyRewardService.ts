import { getClient } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';

export const DAILY_BASE_REWARD = 50;
export const DAILY_STREAK_BONUS = 10; // par jour de streak, plafonné
export const DAILY_STREAK_CAP = 30;

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const isYesterday = (last: Date, now: Date): boolean => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return dayKey(new Date(last.getTime() + oneDayMs)) === dayKey(now);
};

export const canClaimDailyReward = (lastClaimAt: Date | null | undefined, now: Date = new Date()): boolean => {
  if (!lastClaimAt) return true;
  return dayKey(new Date(lastClaimAt)) !== dayKey(now);
};

export type ClaimResult =
  | { claimed: true; reward: number; newStreak: number; balance: number }
  | { claimed: false; reason: 'ALREADY_CLAIMED' | 'USER_NOT_FOUND' };

// La ligne utilisateur est verrouillée (FOR UPDATE) pendant toute la
// transaction : des réclamations simultanées passent l'une après l'autre, et
// seule la première trouve "pas encore réclamé aujourd'hui". `now` est
// injectable pour tester les séries de jours sans attendre.
export const claimDailyReward = async (userId: string, now: Date = new Date()): Promise<ClaimResult> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      'SELECT daily_streak, last_daily_claim_at FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return { claimed: false, reason: 'USER_NOT_FOUND' };
    }
    const { daily_streak: streak, last_daily_claim_at: last } = found.rows[0];

    if (!canClaimDailyReward(last, now)) {
      await client.query('ROLLBACK');
      return { claimed: false, reason: 'ALREADY_CLAIMED' };
    }

    const newStreak = last && isYesterday(new Date(last), now) ? streak + 1 : 1;
    const bonusStreak = Math.min(newStreak, DAILY_STREAK_CAP);
    const reward = DAILY_BASE_REWARD + (bonusStreak - 1) * DAILY_STREAK_BONUS;

    const balance = await investcoinsRepository.applyTransaction(
      userId, reward, 'daily_reward', { streak: newStreak }, client
    );
    await client.query(
      'UPDATE users SET daily_streak = $1, last_daily_claim_at = $2, updated_at = NOW() WHERE id = $3',
      [newStreak, now, userId]
    );
    await client.query('COMMIT');
    return { claimed: true, reward, newStreak, balance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
