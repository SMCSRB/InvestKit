import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { leaderboardRepository } from '../src/repositories/leaderboardRepository';

describe.skipIf(!hasDb)('classement : les ex æquo ne dépassent jamais la taille demandée', () => {
  const domain = `tie-${Date.now()}`;
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => {
    await query('DELETE FROM leaderboard_rankings WHERE domain = $1', [domain]);
    await teardownDb();
  });

  it('30 joueurs à 0 % (même rang 1) : 5 entrées renvoyées, total exact, appelant classé', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) ids.push(await createUser());
    for (const id of ids) {
      await leaderboardRepository.upsertSnapshot({ query } as any, { userId: id, mode: 'test', domain, year: 2020, performancePct: 0, capitalCommitted: 500 });
    }
    const board = await leaderboardRepository.getBoard({ mode: 'test', domain, year: 2020, minCapital: 100, limit: 5, callerId: ids[7] });
    expect(board.entries).toHaveLength(5);
    expect(board.entries.every((e) => e.rank === 1)).toBe(true);
    expect(board.totalRanked).toBe(30);
    expect(board.entries.some((e) => e.isMe)).toBe(true); // l'appelant passe en tête de son groupe d'ex æquo
    expect(board.me?.rank).toBe(1);
  });
});
