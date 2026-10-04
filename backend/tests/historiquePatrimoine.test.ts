// Historique du patrimoine (6g, G1) : le serveur écrit un point par jour, sans bruit, et le joueur le retrouve dans son export.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { wealthHistoryService } from '../src/services/wealthHistoryService';
import { walletService } from '../src/services/walletService';

const P = { liquidity: 9000, stocks: 500, crypto: 300, realEstateNet: 200, debts: 0, financial: 9800, total: 10000 };
const count = async (u: string) => Number((await query('SELECT COUNT(*)::int AS n FROM wealth_snapshots WHERE user_id = $1', [u])).rows[0].n);

describe.skipIf(!hasDb)('historique du patrimoine', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('un seul point par jour : le dernier du jour gagne', async () => {
    const u = await createUser();
    expect(await wealthHistoryService.record(u, P)).toBe(true);
    expect(await wealthHistoryService.record(u, { ...P, total: 10500 })).toBe(true);
    expect(await count(u)).toBe(1);
    expect((await wealthHistoryService.series(u))[0].total).toBe(10500);
  });

  it('rien n\'est écrit si rien n\'a changé', async () => {
    const u = await createUser();
    await wealthHistoryService.record(u, P);
    expect(await wealthHistoryService.record(u, P)).toBe(false);
  });

  it('la série est triée du plus ancien au plus récent et limitée aux derniers points', async () => {
    const u = await createUser();
    await wealthHistoryService.record(u, P);
    await query(`INSERT INTO wealth_snapshots (user_id, day, liquidity, stocks, crypto, real_estate_net, debts, financial, total)
                 VALUES ($1, CURRENT_DATE - 2, 1, 0, 0, 0, 0, 1, 1), ($1, CURRENT_DATE - 1, 2, 0, 0, 0, 0, 2, 2)`, [u]);
    const s = await wealthHistoryService.series(u);
    expect(s.map(x => x.total)).toEqual([1, 2, 10000]);
    expect((await wealthHistoryService.series(u, 2)).map(x => x.total)).toEqual([2, 10000]);
  });

  it('les montants sont arrondis, les valeurs non numériques deviennent 0, l\'immobilier peut être négatif', async () => {
    const u = await createUser();
    await wealthHistoryService.record(u, { ...P, liquidity: 10.6, stocks: NaN, realEstateNet: -40 });
    const p = (await wealthHistoryService.series(u))[0];
    expect([p.liquidity, p.stocks, p.realEstateNet]).toEqual([11, 0, -40]);
  });

  it('lire le portefeuille écrit le point du jour, avec les dates de jeu', async () => {
    const u = await createUser({ balance: 1234 });
    const w = await walletService.snapshot(u);
    const s = await wealthHistoryService.series(u);
    expect(s).toHaveLength(1);
    expect(s[0].total).toBe(w.totalWealth);
    expect(s[0].gameClock).toHaveProperty('stocks');
  });

  it('un joueur ne voit jamais les points d\'un autre', async () => {
    const a = await createUser(); const b = await createUser();
    await wealthHistoryService.record(a, P);
    expect(await wealthHistoryService.series(b)).toEqual([]);
  });

  it('la suppression du compte efface l\'historique', async () => {
    const u = await createUser();
    await wealthHistoryService.record(u, P);
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect(await count(u)).toBe(0);
  });
});
