// Achat « pour 100 InvestCoins » : la quantité doit être la PLUS GRANDE dont (montant arrondi + frais) tient dans le budget.
// Cas signalé (1er janvier 2020, BTC à 6 404,87 InvestCoins) : 0,01530544 reçus au lieu de ~0,015452 (≈ 0,94 pièce perdue).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId, setFlatFx } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as svc } from '../src/services/crypto/tradingService';

const D = 86_400_000;
const START = Date.parse('2020-01-01T00:00:00Z');
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;

describe.skipIf(!hasDb)('Crypto : achat pour un montant, quantité maximale et estimation détaillée', () => {
  beforeAll(async () => {
    await setupDb(); await importDemo(); await setFlatFx(1.1234);
    await query(`UPDATE crypto_candles SET o = 7195.23, h = 7195.23, l = 7195.23, c = 7195.23 WHERE asset_id = (SELECT id FROM crypto_assets WHERE symbol = 'DEMO1') AND tf = '1d' AND ts = to_timestamp($1::float8 / 1000.0)`, [START - D]);
  }, 120_000);
  afterAll(teardownDb);
  const player = async (balance = 387) => { const id = await createUser({ id: calmUserId(), balance, tier: 'pro' }); await clockService.create(id, 'y2020'); return id; };
  const totalFor = async (u: string, qty: string) => { const q: any = await svc.quote(u, 'DEMO1', 'buy', qty, undefined); return q.execution.notionalCoins + q.execution.feeCoins; };

  it('ordre de 100 : la quantité est maximale (une unité de plus dépasserait 100), au plus une pièce de budget non utilisée', async () => {
    const u = await player();
    const q: any = await svc.quote(u, 'DEMO1', 'buy', undefined, 100);
    const qty = Number(q.quantity);
    expect(q.execution.notionalCoins + q.execution.feeCoins).toBeLessThanOrEqual(100);
    expect(await totalFor(u, (qty + 1e-8).toFixed(8))).toBeGreaterThan(100);       // maximalité : la plus petite unité en plus ne tient plus
    expect(q.execution.rawNotionalCoins).toBeGreaterThan(q.execution.notionalCoins - 1);   // l'arrondi n'avale pas une pièce entière
    expect(qty).toBeGreaterThan(0.01545);                                           // ≈ (100 − 1) / 6 406,86 = 0,015452 (et non 0,015305)
    expect(qty).toBeLessThanOrEqual((100 - 1) / q.execution.priceCoins + 1e-8);
  });

  it('chaque ligne se recoupe : prix d\'exécution × quantité = brut ; brut arrondi = montant ; montant + frais = total débité', async () => {
    const u = await player();
    const before = await balanceOf(u);
    const q: any = await svc.quote(u, 'DEMO1', 'buy', undefined, 100);
    const r = await svc.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins: 100 });
    const f = r.order!.fill!;
    expect(f.quantity).toBe(q.quantity);                                            // l'exécution = l'estimation
    const raw = f.priceCoins * Number(f.quantity);
    expect(raw).toBeCloseTo(q.execution.rawNotionalCoins, 6);
    expect(f.notionalCoins).toBe(Math.ceil(raw - 1e-9));                            // arrondi à la pièce supérieure, contre le joueur
    expect(f.notionalCoins - raw).toBeLessThan(1);
    expect(f.notionalCoins + f.feeCoins).toBe(q.execution.notionalCoins + q.execution.feeCoins);
    expect(before - (await balanceOf(r.order!.fill ? u : u))).toBe(f.notionalCoins + f.feeCoins);   // montant réellement débité
    expect(f.notionalCoins + f.feeCoins).toBeLessThanOrEqual(100);
  });

  it('plusieurs budgets : toujours maximal et jamais au-dessus du budget', async () => {
    const u = await player(100_000);
    for (const budget of [20, 37, 100, 150, 387, 1000, 2500]) {
      const q: any = await svc.quote(u, 'DEMO1', 'buy', undefined, budget);
      const total = q.execution.notionalCoins + q.execution.feeCoins;
      expect(total, `budget ${budget}`).toBeLessThanOrEqual(budget);
      if (Number(q.quantity) > 0) expect(await totalFor(u, (Number(q.quantity) + 1e-8).toFixed(8)), `budget ${budget} maximal`).toBeGreaterThan(budget);
    }
  });
});
