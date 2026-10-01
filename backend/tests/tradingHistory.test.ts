import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { tradingService, TradingError } from '../src/services/tradingService';

describe.skipIf(!hasDb)('historique d\'un titre : jamais de données postérieures à l\'année simulée', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });

  it('début de partie : une seule année ; après une avancée : une de plus ; jamais le futur', async () => {
    const u = await createUser({ balance: 500, tier: 'pro' });
    const h0 = await tradingService.history(u, 'stocks', 'TTE');
    expect(h0.illustrative).toBe(true);
    expect(h0.points.map((p) => p.year)).toEqual([h0.simulatedYear]);
    await tradingService.advanceYear(u, 'stocks');
    const h1 = await tradingService.history(u, 'stocks', 'TTE');
    expect(h1.simulatedYear).toBe(h0.simulatedYear + 1);
    expect(h1.points).toHaveLength(2);
    expect(Math.max(...h1.points.map((p) => p.year))).toBeLessThanOrEqual(h1.simulatedYear);
  });

  it('symbole inconnu ou invalide refusé', async () => {
    const u = await createUser({ balance: 500 });
    await expect(tradingService.history(u, 'stocks', 'NOPE')).rejects.toBeInstanceOf(TradingError);
    await expect(tradingService.history(u, 'stocks', undefined)).rejects.toBeInstanceOf(TradingError);
    await expect(tradingService.history(u, 'nimporte', 'TTE')).rejects.toBeInstanceOf(TradingError);
  });
});
