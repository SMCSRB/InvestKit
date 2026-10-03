// Bug signalé : « 387 pièces, achat de 150, refus Solde insuffisant ». Cause : des pièces EMPRUNTÉES réservées à un autre domaine
// (règle voulue du crédit fléché) ne sont pas dépensables en Crypto ; l'écran affichait le solde brut et le message ne l'expliquait pas.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId, setFlatFx } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as svc } from '../src/services/crypto/tradingService';

const D = 86_400_000;
const START = Date.parse('2020-01-01T00:00:00Z');
const FX = 1.1234;                // 7 195,23 $ ÷ 1,1234 = 6 404,87 InvestCoins l'unité (cas du joueur)
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;

describe.skipIf(!hasDb)('Crypto : solde, pièces empruntées réservées ailleurs, achat puis revente', () => {
  beforeAll(async () => {
    await setupDb(); await importDemo(); await setFlatFx(FX);
    // « BTC » du cas : 7 195,23 $ la veille du 1er janvier 2020
    await query(`UPDATE crypto_candles SET o = 7195.23, h = 7195.23, l = 7195.23, c = 7195.23 WHERE asset_id = (SELECT id FROM crypto_assets WHERE symbol = 'DEMO1') AND tf = '1d' AND ts = to_timestamp($1::float8 / 1000.0)`, [(START - D)]);
  }, 120_000);
  afterAll(teardownDb);

  // Joueur du cas : 387 pièces, une ancienne position « ETH » (3,84769425 achetées à 1 pièce = 1 $), date simulée 1er janvier 2020.
  const player = async () => {
    const id = await createUser({ id: calmUserId(), balance: 387, tier: 'pro' });
    await clockService.create(id, 'y2020');
    await query(`INSERT INTO crypto_positions (user_id, asset_id, quantity, cost_basis_coins) VALUES ($1, (SELECT id FROM crypto_assets WHERE symbol = 'DEMO2'), 3.84769425, 442)`, [id]);
    return id;
  };
  const buy150 = (u: string) => svc.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins: 150 });

  it('le prix de départ du cas est bien 6 404,87 InvestCoins', async () => {
    const u = await player();
    const q: any = await svc.quote(u, 'DEMO1', 'buy', undefined, 150);
    expect(q.refPriceCoins).toBeCloseTo(6404.87, 1);
  });

  it('387 pièces à soi, ancienne position présente : l\'achat de 150 passe (total ≤ 150), l\'aperçu dit « abordable »', async () => {
    const u = await player();
    const q: any = await svc.quote(u, 'DEMO1', 'buy', undefined, 150);
    expect(q.execution.notionalCoins + q.execution.feeCoins).toBeLessThanOrEqual(150);
    expect(q.affordable).toBe(true);
    expect(q.funds).toMatchObject({ balanceCoins: 387, spendableCoins: 387, reservedElsewhereCoins: 0 });
    const r = await buy150(u);
    const f = r.order!.fill!;
    expect(f.notionalCoins + f.feeCoins).toBeLessThanOrEqual(150);
    expect(await balanceOf(u)).toBe(387 - f.notionalCoins - f.feeCoins);
    const pf: any = await svc.portfolio(u);
    expect(pf.spendableCoins).toBe(pf.balanceCoins);
  });

  it('pièces empruntées réservées à l\'Immobilier : refus expliqué avec les chiffres, aperçu « non abordable », rien n\'est débité', async () => {
    const u = await player();
    await query(`INSERT INTO bank_credit_balances (user_id, domain, coins) VALUES ($1, 'real_estate', 300)`, [u]);
    const pf: any = await svc.portfolio(u);
    expect(pf.balanceCoins).toBe(387);
    expect(pf.spendableCoins).toBe(87);                 // 387 − 300 réservées à l'Immobilier
    expect(pf.reservedElsewhereCoins).toBe(300);
    const q: any = await svc.quote(u, 'DEMO1', 'buy', undefined, 150);
    expect(q.affordable).toBe(false);
    expect(q.affordableMessage).toContain('300');
    expect(q.affordableMessage).toContain('87');
    const e: any = await buy150(u).catch((x) => x);
    expect(e.message).toContain('pièces empruntées réservées à un autre domaine');
    expect(e.message).toContain('Tu peux en dépenser 87');
    expect(await balanceOf(u)).toBe(387);
    expect((await query(`SELECT COUNT(*)::int AS n FROM crypto_fills WHERE user_id = $1`, [u])).rows[0].n).toBe(0);
  });

  it('vraiment pas assez de pièces : message simple avec le total et le montant disponible', async () => {
    const u = await createUser({ id: calmUserId(), balance: 20, tier: 'pro' });
    await clockService.create(u, 'y2020');
    const e: any = await buy150(u).catch((x) => x);
    expect(e.message).toMatch(/Solde InvestCoins insuffisant : il faut \d+ \(prix \+ frais\), tu as 20/);
  });

  it('acheter puis revendre tout de suite : aucun gain gratuit, seulement les frais et l\'écart perdus', async () => {
    const u = await player();
    const before = await balanceOf(u);
    const b = (await buy150(u)).order!.fill!;
    const s = (await svc.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'sell', type: 'market', quantity: String(b.quantity) })).order!.fill!;
    const after = await balanceOf(u);
    expect(after).toBeLessThan(before);                                           // jamais plus qu'au départ
    expect(before - after).toBeGreaterThanOrEqual(b.feeCoins + s.feeCoins);       // au moins les deux frais
    expect(s.notionalCoins).toBeLessThanOrEqual(b.notionalCoins);                  // on revend au mieux au prix payé
  });
});
