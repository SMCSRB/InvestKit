import { getClient } from '../utils/db';
import type { Queryable } from '../repositories/investcoinsRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { DAILY_REWARD_COINS, DAILY_REWARD_MAX_DAYS_PER_WEEK } from '../config/economy';

// Récompense quotidienne : montant fixe, au plus DAILY_REWARD_MAX_DAYS_PER_WEEK jours payés par semaine (lundi → dimanche, UTC).
// Aucune série, aucun bonus qui grandit, aucune pénalité si on ne vient pas. Le serveur décide de tout (jour, semaine, montant)
// et chaque versement est écrit au registre (motif « daily_reward »).
const DAY_MS = 24 * 60 * 60 * 1000;
export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

// Lundi (UTC) de la semaine qui contient `date`, au format AAAA-MM-JJ.
export const weekStartKey = (date: Date): string => {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const sinceMonday = (new Date(midnight).getUTCDay() + 6) % 7;
  return dayKey(new Date(midnight - sinceMonday * DAY_MS));
};
export const nextWeekStartKey = (date: Date): string => dayKey(new Date(Date.parse(`${weekStartKey(date)}T00:00:00Z`) + 7 * DAY_MS));

export interface DailyRewardStatus {
  canClaim: boolean;
  reason: 'ALREADY_CLAIMED' | 'WEEKLY_CAP' | null;
  coins: number;                    // montant de la prochaine récompense
  claimedThisWeek: number;
  maxPerWeek: number;
  nextWeekStart: string;            // lundi où le plafond est remis à zéro
}

export const dailyRewardStatus = async (userId: string, db: Queryable, now: Date = new Date()): Promise<DailyRewardStatus> => {
  const week = weekStartKey(now);
  const rows = (await db.query('SELECT claim_day::text AS d FROM daily_reward_claims WHERE user_id = $1 AND week_start = $2::date', [userId, week])).rows;
  const today = dayKey(now);
  const claimedToday = rows.some((r: any) => r.d === today);
  const claimedThisWeek = rows.length;
  const reason = claimedToday ? 'ALREADY_CLAIMED' : claimedThisWeek >= DAILY_REWARD_MAX_DAYS_PER_WEEK ? 'WEEKLY_CAP' : null;
  return { canClaim: reason === null, reason, coins: DAILY_REWARD_COINS, claimedThisWeek, maxPerWeek: DAILY_REWARD_MAX_DAYS_PER_WEEK, nextWeekStart: nextWeekStartKey(now) };
};

export type ClaimResult =
  | { claimed: true; reward: number; balance: number; claimedThisWeek: number; maxPerWeek: number }
  | { claimed: false; reason: 'ALREADY_CLAIMED' | 'WEEKLY_CAP'; maxPerWeek: number; nextWeekStart: string }
  | { claimed: false; reason: 'USER_NOT_FOUND' };

// La ligne utilisateur est verrouillée (FOR UPDATE) pendant toute la transaction : des réclamations simultanées passent l'une après
// l'autre, et seule la première trouve « pas encore réclamé aujourd'hui ». `now` est injectable pour tester les semaines sans attendre.
export const claimDailyReward = async (userId: string, now: Date = new Date()): Promise<ClaimResult> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return { claimed: false, reason: 'USER_NOT_FOUND' };
    }
    const status = await dailyRewardStatus(userId, client as unknown as Queryable, now);
    if (!status.canClaim) {
      await client.query('ROLLBACK');
      return { claimed: false, reason: status.reason!, maxPerWeek: status.maxPerWeek, nextWeekStart: status.nextWeekStart };
    }
    const balance = await investcoinsRepository.applyTransaction(
      userId, DAILY_REWARD_COINS, 'daily_reward', { day: dayKey(now), week: weekStartKey(now) }, client
    );
    await client.query(
      'INSERT INTO daily_reward_claims (user_id, claim_day, week_start, coins) VALUES ($1, $2::date, $3::date, $4)',
      [userId, dayKey(now), weekStartKey(now), DAILY_REWARD_COINS]
    );
    await client.query('UPDATE users SET last_daily_claim_at = $1, updated_at = NOW() WHERE id = $2', [now, userId]);
    await client.query('COMMIT');
    return { claimed: true, reward: DAILY_REWARD_COINS, balance, claimedThisWeek: status.claimedThisWeek + 1, maxPerWeek: status.maxPerWeek };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
