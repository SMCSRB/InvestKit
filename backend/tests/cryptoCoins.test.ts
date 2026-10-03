import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId, ledgerSum, setFlatFx } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as svc } from '../src/services/crypto/tradingService';
import { cryptoLoanService as loans } from '../src/services/crypto/loanService';
import { fxService } from '../src/services/fxService';

const D = 86_400_000;
const START = Date.parse('2020-01-01T00:00:00Z');
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const order = (u: string, o: any) => svc.placeOrder(u, { clientOrderId: cid(), ...o });
const closeAt = async (sym: string, ts: number) => Number((await query(`SELECT c FROM crypto_candles cc JOIN crypto_assets a ON a.id = cc.asset_id WHERE a.symbol = $1 AND cc.tf = '1d' AND cc.ts = to_timestamp($2::float8 / 1000.0)`, [sym, ts])).rows[0].c);

describe.skipIf(!hasDb)('Crypto en InvestCoins : conversion avec le taux BCE du jour de jeu', () => {
  const player = async (balance = 100_000) => { const id = await createUser({ id: calmUserId(), balance, tier: 'pro' }); await clockService.create(id, 'y2020'); return id; };
  beforeAll(async () => { await setupDb(); await importDemo(); }, 120_000);
  afterAll(teardownDb);

  it('achat au marché à 1,25 $ pour 1 InvestCoin : montant = dollars ÷ 1,25 arrondi contre le joueur, taux enregistré, aperçu = exécution', async () => {
    await setFlatFx(1.25);
    const u = await player();
    const before = await balanceOf(u);
    const q = await svc.quote(u, 'DEMO1', 'buy', '0.5', undefined);
    const r = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.5' });
    const f = r.order!.fill!;
    const ref = await closeAt('DEMO1', START - D);
    expect(f.refPrice).toBe(ref);
    expect(f.fxUsdPerCoin).toBe(1.25);
    expect(f.refPriceCoins).toBeCloseTo(ref / 1.25, 8);
    expect(f.notionalCoins).toBe(Math.ceil((f.price * 0.5) / 1.25 - 1e-9));
    expect(await balanceOf(u)).toBe(before - f.notionalCoins - f.feeCoins);
    expect(q.fxUsdPerCoin).toBe(1.25);
    expect(q.execution.notionalCoins).toBe(f.notionalCoins);
    expect(q.execution.priceCoins).toBeCloseTo(f.price / 1.25, 8);
    expect((await query(`SELECT fx_usd_per_coin::float8 AS f FROM crypto_fills WHERE order_id = $1`, [r.order!.id])).rows[0].f).toBe(1.25);
  });

  it('arrondis toujours contre le joueur (achat au-dessus, vente en dessous) avec un taux à décimales', async () => {
    await setFlatFx(1.0831);
    const u = await player();
    const b = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.37' });
    const fb = b.order!.fill!;
    const rawB = (fb.price * 0.37) / 1.0831;
    expect(fb.notionalCoins).toBe(Math.ceil(rawB - 1e-9));
    expect(fb.notionalCoins).toBeGreaterThanOrEqual(rawB - 1e-6);
    const s = await order(u, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '0.37' });
    const fs = s.order!.fill!;
    const rawS = (fs.price * 0.37) / 1.0831;
    expect(fs.notionalCoins).toBe(Math.floor(rawS + 1e-9));
    expect(fs.notionalCoins).toBeLessThanOrEqual(rawS + 1e-6);
  });

  it('AUCUNE boucle d\'argent : acheter puis revendre le même jour fait toujours perdre (écart, frais, arrondis)', async () => {
    for (const rate of [0.9, 1, 1.0831, 1.25, 1.6]) {
      await setFlatFx(rate);
      const u = await player(100_000);
      const start = await balanceOf(u);
      for (const qty of ['0.01', '0.37', '2.5']) {
        await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: qty });
        await order(u, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: qty });
      }
      expect(await balanceOf(u), `taux ${rate}`).toBeLessThan(start);
      expect(await ledgerSum(u)).toBe((await balanceOf(u)) - start);          // le registre dit exactement la même chose
    }
  });

  it('sans taux de change : aperçu et ordres refusés (503), rien n\'est écrit ; lecture du portefeuille et des cours sans plantage', async () => {
    await setFlatFx(1.25);
    const u = await player();
    await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.5' });
    const balance = await balanceOf(u);
    const orders = (await query(`SELECT COUNT(*)::int AS n FROM crypto_orders WHERE user_id = $1`, [u])).rows[0].n;
    await query('DELETE FROM fx_rates');
    await expect(svc.quote(u, 'DEMO1', 'buy', '0.1', undefined)).rejects.toMatchObject({ code: 'FX_UNAVAILABLE' });
    await expect(order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })).rejects.toMatchObject({ code: 'FX_UNAVAILABLE' });
    await expect(order(u, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '0.1' })).rejects.toMatchObject({ code: 'FX_UNAVAILABLE' });
    await expect(order(u, { symbol: 'DEMO1', side: 'sell', type: 'limit', quantity: '0.1', price: 5 })).rejects.toMatchObject({ code: 'FX_UNAVAILABLE' });
    expect(await balanceOf(u)).toBe(balance);
    expect((await query(`SELECT COUNT(*)::int AS n FROM crypto_orders WHERE user_id = $1`, [u])).rows[0].n).toBe(orders);

    const http = await request(app).post('/api/v1/crypto/orders').set('Authorization', tok(u)).send({ clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' });
    expect(http.status).toBe(503);
    expect(http.body).toMatchObject({ code: 'FX_UNAVAILABLE' });
    expect(http.body.error).toMatch(/Taux de change indisponible/);

    const p = await svc.portfolio(u);
    expect(p.fxUnavailable).toBe(true);
    expect(p.positions[0]).toMatchObject({ valueCoins: null, priceCoins: null, unrealizedCoins: null });
    expect(p.positions[0].priceUsd).toBeGreaterThan(0);                                  // l'affichage peut rester en dollars
    const assets = (await request(app).get('/api/v1/crypto/assets').set('Authorization', tok(u))).body;
    expect(assets.fx).toMatchObject({ available: false, usdPerCoin: null });
    expect(assets.assets[0].priceCoins).toBeNull();
    expect(assets.assets[0].price).toBeGreaterThan(0);
    const st = (await request(app).get('/api/v1/crypto/state').set('Authorization', tok(u))).body;
    expect(st.fx).toMatchObject({ available: false });
    const candles = await request(app).get('/api/v1/crypto/candles?symbol=DEMO1&tf=1d&unit=coins').set('Authorization', tok(u));
    expect(candles.status).toBe(503);
    expect((await request(app).get('/api/v1/crypto/candles?symbol=DEMO1&tf=1d').set('Authorization', tok(u))).status).toBe(200);   // en dollars : toujours possible
  });

  it('week-end et jours fériés : dernier jour ouvré (4 jours : accepté, 11 jours : indisponible)', async () => {
    const u = await player();
    await query('DELETE FROM fx_rates');
    await fxService.importRates([{ day: '2019-12-27', perEur: 1.11 }]);                // vendredi ; le jeu est au 1er janvier 2020 : dernier taux publié avant = 31/12, absent
    const st = (await request(app).get('/api/v1/crypto/state').set('Authorization', tok(u))).body;
    expect(st.fx).toMatchObject({ available: true, usdPerCoin: 1.11, rateDay: '2019-12-27', staleDays: 4, demo: false });
    await query('DELETE FROM fx_rates');
    await fxService.importRates([{ day: '2019-12-20', perEur: 1.11 }]);
    expect((await request(app).get('/api/v1/crypto/state').set('Authorization', tok(u))).body.fx).toMatchObject({ available: false });
  });

  it('prix d\'un ordre en attente en InvestCoins : comparé au prix actuel converti ; stop et objectif refusés s\'ils sont du mauvais côté', async () => {
    await setFlatFx(1.25);
    const u = await player();
    const ref = await closeAt('DEMO1', START - D);
    await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '1' });
    // prix actuel : ref dollars = ref ÷ 1,25 InvestCoins. Un « stop » à 0,9 × ref (nombre de dollars) est AU-DESSUS du prix en pièces (0,8 × ref) : refusé.
    await expect(order(u, { symbol: 'DEMO1', side: 'sell', type: 'stop_loss', quantity: '1', price: ref * 0.9 })).rejects.toThrow(/sous le prix actuel/);
    await expect(order(u, { symbol: 'DEMO1', side: 'sell', type: 'take_profit', quantity: '1', price: (ref / 1.25) * 0.99 })).rejects.toThrow(/au-dessus du prix actuel/);
    const ok = await order(u, { symbol: 'DEMO1', side: 'sell', type: 'stop_loss', quantity: '1', price: (ref / 1.25) * 0.5 });
    expect(ok.order).toMatchObject({ status: 'open', triggerCoins: (ref / 1.25) * 0.5 });
  });

  it('ordre limite : déclenché sur les bougies converties en InvestCoins (jour par jour), exécuté avec le taux du jour', async () => {
    await setFlatFx(1.25);
    const u = await player();
    const lows = (await query(`SELECT MIN(l) AS lo FROM crypto_candles cc JOIN crypto_assets a ON a.id = cc.asset_id WHERE a.symbol = 'DEMO1' AND cc.tf = '1h' AND cc.ts >= to_timestamp($1::float8 / 1000.0) AND cc.ts < to_timestamp($2::float8 / 1000.0)`, [START, START + D])).rows[0];
    const lowUsd = Number(lows.lo), lowCoins = lowUsd / 1.25;
    const hit = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '0.2', price: lowCoins * 1.002 });      // touché dans la journée
    const miss = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '0.2', price: lowCoins * 0.98 });      // jamais atteint
    const wrongUnit = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '0.2', price: lowUsd * 0.98 });   // en dollars : vaudrait 1,25 fois plus que le prix en pièces → déclenché trop tôt
    expect([hit.order!.status, miss.order!.status, wrongUnit.order!.status]).toEqual(['open', 'open', 'open']);
    const adv = await svc.advance(u, 'day');
    const byId = Object.fromEntries(adv.events.map((e: any) => [e.orderId, e.status]));
    expect(byId[hit.order!.id]).toBe('filled');
    expect(byId[miss.order!.id]).toBeUndefined();                                         // reste en attente
    const f = (await svc.listOrders(u, 'filled')).find((o: any) => o.id === hit.order!.id)!.fill!;
    expect(f.fxUsdPerCoin).toBe(1.25);
    expect(f.price / 1.25).toBeLessThanOrEqual((lowCoins * 1.002) * 1.0001);               // exécuté au prix limite (ordre « maker », sans écart)
    expect(f.notionalCoins).toBe(Math.ceil((f.price * 0.2) / 1.25 - 1e-9));
    expect((await svc.listOrders(u, 'open')).some((o: any) => o.id === miss.order!.id)).toBe(true);
  });

  it('prêt sur portefeuille : garantie valorisée en InvestCoins avec le taux du jour ; sans taux : évaluation reportée, aucune vente forcée', async () => {
    await setFlatFx(1.25);
    const u = await player(200_000);
    const r = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '3' });
    const view = await loans.view(u) as any;
    const ref = await closeAt('DEMO1', START - D);
    expect(view.collateral[0].valueCoins).toBe(Math.floor((ref * 3) / 1.25));
    expect(view.capacityCoins).toBeLessThanOrEqual(Math.floor(((ref * 3) / 1.25) * 0.3));
    expect(r.order!.fill!.notionalCoins).toBeGreaterThan(0);
    const b = await loans.borrow(u, Math.max(25, Math.floor(view.capacityCoins / 2)));
    expect(b.loanId).toBeDefined();
    await query('DELETE FROM fx_rates');
    const adv = await svc.advance(u, 'day');
    expect(adv.loanEvents.map((e: any) => e.kind)).toContain('margin_check_postponed');
    expect(adv.loanEvents.map((e: any) => e.kind)).not.toContain('liquidation');
    await expect(loans.quote(u, 50)).rejects.toMatchObject({ code: 'FX_UNAVAILABLE' });
  });

  it('API : cours en InvestCoins à côté du dollar, bougies converties jour par jour', async () => {
    await setFlatFx(1.25);
    const u = await player();
    const a = (await request(app).get('/api/v1/crypto/assets').set('Authorization', tok(u))).body;
    expect(a.fx).toMatchObject({ available: true, usdPerCoin: 1.25, demo: true });
    const d1 = a.assets.find((x: any) => x.symbol === 'DEMO1');
    expect(d1.priceCoins).toBeCloseTo(d1.price / 1.25, 8);
    const one = (await request(app).get('/api/v1/crypto/assets/DEMO1').set('Authorization', tok(u))).body;
    expect(one.asset.priceCoins).toBeCloseTo(one.asset.price / 1.25, 8);
    const usd = (await request(app).get('/api/v1/crypto/candles?symbol=DEMO1&tf=1d&limit=5').set('Authorization', tok(u))).body;
    const coins = (await request(app).get('/api/v1/crypto/candles?symbol=DEMO1&tf=1d&limit=5&unit=coins').set('Authorization', tok(u))).body;
    expect(usd.unit).toBe('usd'); expect(coins.unit).toBe('coins');
    expect(coins.candles).toHaveLength(usd.candles.length);
    coins.candles.forEach((c: any, i: number) => { expect(c.c).toBeCloseTo(usd.candles[i].c / 1.25, 8); expect(c.h).toBeGreaterThanOrEqual(c.l); expect(c.ts).toBe(usd.candles[i].ts); });
  });
});
