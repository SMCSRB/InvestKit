// Classement : seuil unique « 2 500 investis ET 5 jours actifs » pour tous les domaines, barre de progression, capital de départ réel du compte.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { leaderboardRepository } from '../src/repositories/leaderboardRepository';
import { rankingProgress, startingCapitalOf } from '../src/services/rankingEligibility';
import { RANKING_MIN_INVESTED, RANKING_MIN_ACTIVE_DAYS, STARTING_CAPITAL, PRO_STARTING_BONUS } from '../src/config/economy';

describe.skipIf(!hasDb)('classement : seuil investi + jours actifs, tous domaines', () => {
  const domain = `seuil-${Date.now()}`;
  beforeAll(setupDb);
  afterAll(async () => { await query('DELETE FROM leaderboard_rankings WHERE domain = $1', [domain]); await teardownDb(); });

  const snap = (userId: string, committed: number) => leaderboardRepository.upsertSnapshot({ query } as any, { userId, mode: 'test', domain, year: 2020, performancePct: 5, capitalCommitted: committed });
  const board = (callerId: string) => leaderboardRepository.getBoard({ mode: 'test', domain, year: 2020, minCapital: RANKING_MIN_INVESTED, limit: 10, callerId });

  it('les deux seuils sont ceux de economy.ts (2 500 pièces, 5 jours actifs)', () => {
    expect(RANKING_MIN_INVESTED).toBe(2500);
    expect(RANKING_MIN_ACTIVE_DAYS).toBe(5);
  });

  it('classé seulement avec assez investi ET assez de jours actifs', async () => {
    const ok = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS });
    const fewDays = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS - 1 });
    const fewCoins = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS });
    await snap(ok, RANKING_MIN_INVESTED); await snap(fewDays, RANKING_MIN_INVESTED + 500); await snap(fewCoins, RANKING_MIN_INVESTED - 1);
    const b = await board(ok);
    expect(b.totalRanked).toBe(1);
    expect(b.me?.isMe).toBe(true);
    expect((await board(fewDays)).me).toBeNull();
    expect((await board(fewCoins)).me).toBeNull();
  });

  it('barre de progression : pièces investies et jours actifs, sans date limite', async () => {
    const u = await createUser({ activeDays: 3 });
    const p = await rankingProgress({ query } as any, u, 1800);
    expect(p).toEqual({ investedCoins: 1800, minInvestedCoins: 2500, activeDays: 3, minActiveDays: 5, ranked: false });
    const done = await rankingProgress({ query } as any, u, 2500);
    expect(done.ranked).toBe(false);          // 3 jours actifs : il en manque encore
    await query('UPDATE users SET active_days = 5 WHERE id = $1', [u]);
    expect((await rankingProgress({ query } as any, u, 2500)).ranked).toBe(true);
    expect((await rankingProgress({ query } as any, u, 2499.9)).ranked).toBe(false);
  });

  it('capital de départ réel : 10 000 en gratuit, 20 000 avec le bonus Pro versé une fois', async () => {
    const free = await createUser({ balance: STARTING_CAPITAL });
    expect(await startingCapitalOf({ query } as any, free)).toBe(STARTING_CAPITAL);
    const pro = await createUser({ balance: STARTING_CAPITAL + PRO_STARTING_BONUS, tier: 'pro' });
    await query(`INSERT INTO investcoins_transactions (user_id, amount, reason, nature, domain) VALUES ($1, $2, 'pro_starting_bonus', 'creation', NULL)`, [pro, PRO_STARTING_BONUS]);
    expect(await startingCapitalOf({ query } as any, pro)).toBe(STARTING_CAPITAL + PRO_STARTING_BONUS);
  });
});
