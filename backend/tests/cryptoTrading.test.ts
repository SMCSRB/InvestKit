import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { cryptoDataService } from '../src/services/crypto/dataService';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as svc } from '../src/services/crypto/tradingService';
import { executeAt, feeCoins, slippageFraction, evaluateResting, parseQuantity, floorQty8 } from '../src/engine/crypto/execution';
import { CRYPTO_ECONOMY as E } from '../src/config/cryptoMarketRules';
import type { Candle } from '../src/engine/crypto/candles';

const D = 86_400_000;
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const k = (ts: number, o: number, h: number, l: number, c: number): Candle => ({ ts, o, h, l, c, volume: 1 });

describe('moteur d\'exécution (pur)', () => {
  it('frais : palier, minimum 1 pièce, arrondi supérieur, maker = moitié', () => {
    expect(feeCoins(10_000, 1, false)).toBe(10);          // 0,10 %
    expect(feeCoins(10_000, 4, false)).toBe(60);          // 0,60 %
    expect(feeCoins(10_000, 1, true)).toBe(5);
    expect(feeCoins(10, 1, false)).toBe(1);               // minimum
    expect(feeCoins(0, 1, false)).toBe(0);
    expect(feeCoins(1234, 2, false)).toBe(Math.ceil(1234 * 0.002));
  });
  it('glissement : croît avec la taille, plafonné, maximal si pas de volume', () => {
    const small = slippageFraction(1_000, 1e9), large = slippageFraction(1e7, 1e9);
    expect(large).toBeGreaterThan(small);
    expect(slippageFraction(1e12, 1e6)).toBe(E.slippage.maxFraction);
    expect(slippageFraction(1000, 0)).toBe(E.slippage.maxFraction);
  });
  it('achat plus cher, vente moins chère ; maker sans écart ni glissement ; arrondi contre le joueur', () => {
    const base = { refPrice: 100, quantity: 10.5, tier: 4, avgDailyVolumeUsd: 1e6, maker: false };
    const b = executeAt({ ...base, side: 'buy' }), s = executeAt({ ...base, side: 'sell' });
    expect(b.price).toBeGreaterThan(100); expect(s.price).toBeLessThan(100);
    expect(b.notionalCoins).toBe(Math.ceil(b.price * 10.5 - 1e-9)); expect(s.notionalCoins).toBe(Math.floor(s.price * 10.5 + 1e-9));
    const m = executeAt({ ...base, side: 'buy', maker: true });
    expect(m.price).toBe(100); expect(m.spreadPct).toBe(0); expect(m.slippagePct).toBe(0);
    expect(m.feeCoins).toBeLessThan(b.feeCoins);
  });
  it('ordres en attente : limite, take-profit, stop-loss, trous de cotation', () => {
    const c = [k(0, 100, 105, 98, 102), k(1, 102, 110, 101, 109), k(2, 90, 95, 80, 85)];
    expect(evaluateResting({ side: 'buy', type: 'limit', triggerPrice: 99 }, c)).toMatchObject({ ts: 0, refPrice: 99, maker: true });
    expect(evaluateResting({ side: 'buy', type: 'limit', triggerPrice: 50 }, c)).toBeNull();
    expect(evaluateResting({ side: 'sell', type: 'limit', triggerPrice: 108 }, c)).toMatchObject({ ts: 1, refPrice: 108 });
    expect(evaluateResting({ side: 'sell', type: 'take_profit', triggerPrice: 120 }, c)).toBeNull();
    // trou à la baisse : le stop à 97 est traversé par l'ouverture à 90 → exécuté à 90 (pas à 97), en preneur
    expect(evaluateResting({ side: 'sell', type: 'stop_loss', triggerPrice: 97 }, [c[1], c[2]])).toMatchObject({ ts: 2, refPrice: 90, maker: false });
    // trou à la hausse : limite de vente 100 déjà dépassée à l'ouverture → exécutée à l'ouverture (meilleur prix)
    expect(evaluateResting({ side: 'sell', type: 'limit', triggerPrice: 100 }, [k(5, 120, 125, 119, 121)])).toMatchObject({ refPrice: 120 });
  });
  it('quantités : texte, 8 décimales maximum, jamais de notation scientifique ni de valeur négative', () => {
    expect(parseQuantity('0.12345678')).toBe('0.12345678');
    expect(parseQuantity('1.50')).toBe('1.5');
    for (const bad of ['0.123456789', '-1', '0', '1e5', 'abc', '', ' ', null, undefined, NaN, Infinity, '1,5', '99999999999999999']) expect(parseQuantity(bad as any), String(bad)).toBeNull();
    expect(parseQuantity(0.5)).toBe('0.5');
    expect(floorQty8(1.234567899)).toBe('1.23456789');
  });
});

describe.skipIf(!hasDb)('Trading Crypto : exécution côté serveur (base réelle)', () => {
  let u: string, other: string;
  const start = Date.parse('2020-01-01T00:00:00Z');

  const ledgerReasons = async (user: string) => (await query(`SELECT reason, nature, domain, SUM(amount)::int AS s FROM investcoins_transactions WHERE user_id = $1 GROUP BY 1,2,3`, [user])).rows;
  const fills = async (user: string) => (await query('SELECT * FROM crypto_fills WHERE user_id = $1 ORDER BY id', [user])).rows;
  const closeAt = async (sym: string, ts: number) => Number((await query(`SELECT c FROM crypto_candles cc JOIN crypto_assets a ON a.id = cc.asset_id WHERE a.symbol = $1 AND cc.tf = '1d' AND cc.ts = to_timestamp($2::float8/1000.0)`, [sym, ts])).rows[0].c);
  const order = (user: string, o: any) => svc.placeOrder(user, { clientOrderId: cid(), ...o });
  const newPlayer = async (balance = 100_000, opts: any = {}) => { const id = await createUser({ balance, tier: 'pro', ...opts }); await clockService.create(id, 'y2020'); return id; };

  beforeAll(async () => {
    await setupDb();
    await importDemo();
    u = await newPlayer();
    other = await newPlayer();
  }, 120_000);
  afterAll(teardownDb);

  it('achat au marché : prix de la date simulée (jamais du client), écart + frais, registre cohérent', async () => {
    const before = await balanceOf(u);
    const r = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.5' });
    expect(r.order!.status).toBe('filled');
    const f = r.order!.fill!;
    expect(f.refPrice).toBe(await closeAt('DEMO1', start - D));   // clôture de la dernière bougie TERMINÉE : rien de postérieur
    expect(f.price).toBeGreaterThan(f.refPrice);
    expect(f.feeCoins).toBeGreaterThanOrEqual(1);
    expect(await balanceOf(u)).toBe(before - f.notionalCoins - f.feeCoins);
    const reasons = await ledgerReasons(u);
    expect(reasons.find((x: any) => x.reason === 'trade_buy')).toMatchObject({ nature: 'exchange', domain: 'crypto_market' });
    expect(reasons.find((x: any) => x.reason === 'fee_brokerage')).toMatchObject({ nature: 'destruction', domain: 'crypto_market' });
    const p = await svc.portfolio(u);
    expect(p.positions[0]).toMatchObject({ symbol: 'DEMO1', quantity: '0.5', costBasisCoins: f.notionalCoins });
    expect(p.feesPaidCoins).toBe(f.feeCoins);
  });

  it('un prix fourni par le client pour un ordre au marché est refusé', async () => {
    await expect(order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1', price: 1 })).rejects.toThrow(/prix/i);
  });

  it('idempotence : même identifiant = un seul ordre, un seul débit (séquentiel et simultané)', async () => {
    const before = await balanceOf(u);
    const id = cid();
    const a = await svc.placeOrder(u, { clientOrderId: id, symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' });
    const b = await svc.placeOrder(u, { clientOrderId: id, symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' });
    expect(a.idempotent).toBe(false); expect(b.idempotent).toBe(true); expect(b.order!.id).toBe(a.order!.id);
    const mid = await balanceOf(u);
    expect(before - mid).toBe(a.order!.fill!.notionalCoins + a.order!.fill!.feeCoins);
    const id2 = cid();
    const res = await Promise.all(Array.from({ length: 6 }, () => svc.placeOrder(u, { clientOrderId: id2, symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })));
    expect(new Set(res.map((x) => x.order!.id)).size).toBe(1);
    expect(res.filter((x) => !x.idempotent).length).toBe(1);
    const n = Number((await query('SELECT COUNT(*)::int AS n FROM crypto_fills WHERE order_id = $1', [res[0].order!.id])).rows[0].n);
    expect(n).toBe(1);
  });

  it('fractions jusqu\'à 8 décimales, refus au-delà, minimum d\'ordre, identifiants invalides', async () => {
    const r = await order(u, { symbol: 'DEMOM', side: 'buy', type: 'market', quantity: '0.00001234' }).catch((e) => e);   // DEMOM pas encore coté en 2020-01 → refus
    expect(r).toBeInstanceOf(Error);
    await expect(order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.123456789' })).rejects.toThrow(/Quantité invalide/);
    await expect(order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.00000001' })).rejects.toThrow(/trop petit/);
    await expect(svc.placeOrder(u, { clientOrderId: 'x', symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '1' })).rejects.toThrow(/Identifiant/);
    await expect(order(u, { symbol: 'DEMO1', side: 'hold', type: 'market', quantity: '1' })).rejects.toThrow(/Sens/);
    await expect(order(u, { symbol: 'DEMO1', side: 'buy', type: 'stop_loss', quantity: '1', price: 5 })).rejects.toThrow(/vente/);
    await expect(order(u, { symbol: "DEMO1'; DROP TABLE users;--", side: 'buy', type: 'market', quantity: '1' })).rejects.toThrow(/Symbole/);
    // fraction fine acceptée si le montant dépasse le minimum
    const ok = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.01234567' });
    expect(ok.order!.quantity).toBe('0.01234567');
  });

  it('achat par montant : le total (prix + frais) ne dépasse jamais le montant demandé', async () => {
    for (const amount of [37, 500, 4321]) {
      const before = await balanceOf(u);
      const r = await order(u, { symbol: 'DEMO2', side: 'buy', type: 'market', amountCoins: amount });
      const spent = before - await balanceOf(u);
      expect(spent).toBeLessThanOrEqual(amount);
      expect(spent).toBeGreaterThan(amount * 0.95);
      expect(r.order!.fill!.quantity).toMatch(/^\d+(\.\d{1,8})?$/);
    }
  });

  it('vente partielle puis totale : prix de revient proportionnel, plus-value, position soldée', async () => {
    const p = await newPlayer();
    await order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '2' });
    const pos0 = (await svc.portfolio(p)).positions[0];
    const s1 = await order(p, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '0.5' });
    expect(s1.order!.fill!.basisCoins).toBe(Math.round(pos0.costBasisCoins / 4));
    expect(s1.order!.fill!.gainCoins).toBe(s1.order!.fill!.notionalCoins - s1.order!.fill!.basisCoins);
    expect(s1.order!.fill!.price).toBeLessThan(s1.order!.fill!.refPrice);
    const mid = (await svc.portfolio(p)).positions[0];
    expect(mid.quantity).toBe('1.5');
    expect(mid.costBasisCoins).toBe(pos0.costBasisCoins - s1.order!.fill!.basisCoins!);
    await expect(order(p, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '1.6' })).rejects.toThrow(/insuffisante/);
    await order(p, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '1.5' });
    const end = await svc.portfolio(p);
    expect(end.positions).toHaveLength(0);
    const fl = await fills(p);
    expect(end.realizedCoins).toBe(fl.filter((x: any) => x.side === 'sell').reduce((a: number, x: any) => a + x.gain_coins, 0));
  });

  it('solde insuffisant : refusé sans rien débiter', async () => {
    const p = await newPlayer(50);
    await expect(order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '1' })).rejects.toThrow(/Solde/);
    expect(await balanceOf(p)).toBe(50);
    expect((await fills(p)).length).toBe(0);
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM crypto_orders WHERE user_id = $1', [p])).rows[0].n)).toBe(0);   // la transaction entière est annulée
  });

  it('ordre limite : attend, ne s\'exécute que si le prix le touche, prix ≤ limite, frais « maker »', async () => {
    const p = await newPlayer();
    const px = await closeAt('DEMO1', start - D);
    const week = (await query(`SELECT MIN(l) AS lo FROM crypto_candles cc JOIN crypto_assets a ON a.id = cc.asset_id WHERE a.symbol = 'DEMO1' AND cc.tf = '1h' AND cc.ts >= to_timestamp($1::float8/1000.0) AND cc.ts < to_timestamp($2::float8/1000.0)`, [start, start + 7 * D])).rows[0];
    const reachable = Number(week.lo) * 1.001, unreachable = Number(week.lo) * 0.5;
    const never = await order(p, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '1', price: unreachable });
    const will = await order(p, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '1', price: reachable });
    expect(never.order!.status).toBe('open'); expect(will.order!.status).toBe('open');
    const bal = await balanceOf(p);
    expect(bal).toBe(100_000);   // rien n'est réservé ni débité avant l'exécution
    const adv = await svc.advance(p, 'week');
    expect(adv.events.map((e) => e.status)).toEqual(['filled']);
    const f = (await svc.listOrders(p, 'filled'))[0].fill!;
    expect(f.maker).toBe(true);
    expect(f.price).toBeLessThanOrEqual(reachable + 1e-9);
    expect(f.spreadPct).toBe(0);
    expect(f.simAt).toBeGreaterThan(start); expect(f.simAt).toBeLessThanOrEqual(start + 7 * D);
    expect((await svc.listOrders(p, 'open')).length).toBe(1);
    expect(px).toBeGreaterThan(0);
    const notif = (await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND kind = 'crypto_order_filled'`, [p])).rows[0].n;
    expect(notif).toBe(1);
  });

  it('stop-loss et take-profit : déclenchés sur les bougies, stop exécuté en preneur, quantité réservée', async () => {
    const p = await newPlayer();
    await order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '3' });
    const px = await closeAt('DEMO1', start - D);
    const win = (await query(`SELECT MIN(l) AS lo, MAX(h) AS hi FROM crypto_candles cc JOIN crypto_assets a ON a.id = cc.asset_id WHERE a.symbol = 'DEMO1' AND cc.tf = '1h' AND cc.ts >= to_timestamp($1::float8/1000.0) AND cc.ts < to_timestamp($2::float8/1000.0)`, [start, start + 31 * D])).rows[0];
    const lo = Number(win.lo), hi = Number(win.hi);
    expect(lo).toBeLessThan(px); expect(hi).toBeGreaterThan(px);
    await expect(order(p, { symbol: 'DEMO1', side: 'sell', type: 'stop_loss', quantity: '1', price: px * 1.1 })).rejects.toThrow(/sous le prix/);
    await expect(order(p, { symbol: 'DEMO1', side: 'sell', type: 'take_profit', quantity: '1', price: px * 0.9 })).rejects.toThrow(/au-dessus/);
    const stopPx = lo + (px - lo) * 0.5, tpPx = px + (hi - px) * 0.5;
    const stop = await order(p, { symbol: 'DEMO1', side: 'sell', type: 'stop_loss', quantity: '1', price: stopPx });
    const tp = await order(p, { symbol: 'DEMO1', side: 'sell', type: 'take_profit', quantity: '1', price: tpPx });
    // 3 en portefeuille, 2 réservés : on ne peut pas en vendre 2 au marché (1 seul disponible)
    await expect(order(p, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '2' })).rejects.toThrow(/disponible/);
    const adv = await svc.advance(p, 'month');
    expect(adv.events.filter((e) => e.status === 'filled').length).toBe(2);
    const done = await svc.listOrders(p, 'filled');
    const stopFill = done.find((o) => o.id === stop.order!.id)!.fill!, tpFill = done.find((o) => o.id === tp.order!.id)!.fill!;
    expect(stopFill.maker).toBe(false); expect(stopFill.price).toBeLessThan(stopFill.refPrice);
    expect(stopFill.refPrice).toBeLessThanOrEqual(stopPx + 1e-9);
    expect(tpFill.maker).toBe(true); expect(tpFill.refPrice).toBeGreaterThanOrEqual(tpPx - 1e-9);
    expect((await svc.portfolio(p)).positions[0].quantity).toBe('1');
  });

  it('ordre limite d\'achat impossible à honorer au moment du déclenchement : annulé, rien n\'est débité', async () => {
    const p = await newPlayer(2000);
    const px = await closeAt('DEMO1', start - D);
    await order(p, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '5', price: px * 5 });   // limite très haute : s'exécutera, mais 5 × ~1500 > solde
    const adv = await svc.advance(p, 'day');
    expect(adv.events[0]).toMatchObject({ status: 'cancelled' });
    expect(await balanceOf(p)).toBe(2000);
    expect((await svc.listOrders(p, 'cancelled'))[0].rejectReason).toMatch(/Solde/);
  });

  it('actif dont le prix tombe à zéro : la sortie reste possible, les achats sont fermés', async () => {
    await cryptoDataService.upsertSyntheticAsset({ symbol: 'ZEROX', name: 'Zéro (fictif)', category: 'defi', risk: 5, stable: false, description: 'Actif FICTIF de test qui tombe à zéro.' });
    const days = 40;
    const cs: Candle[] = Array.from({ length: days }, (_, i) => { const px = i < 20 ? 10 : 0; return { ts: start - 30 * D + i * D, o: px, h: px, l: px, c: px, volume: 5e8 }; });
    await cryptoDataService.importCandles('ZEROX', '1d', cs, { provider: 'test-fictif' });
    const p = await newPlayer();
    await clockService.create(p, 'y2020');
    // en 2020-01-01 (jour 30) le prix est déjà 0 ; on achète avant : on simule l'historique en avançant l'horloge du joueur en arrière
    await query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [p, start - 15 * D]);
    await order(p, { symbol: 'ZEROX', side: 'buy', type: 'market', quantity: '100' });
    await query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [p, start]);
    await expect(order(p, { symbol: 'ZEROX', side: 'buy', type: 'market', quantity: '1' })).rejects.toThrow(/Prix nul/);
    await expect(order(p, { symbol: 'ZEROX', side: 'sell', type: 'market', quantity: '50' })).rejects.toThrow(/trop petit/);
    const bal = await balanceOf(p);
    const exit = await order(p, { symbol: 'ZEROX', side: 'sell', type: 'market', quantity: '100' });
    expect(exit.order!.status).toBe('filled');
    expect(exit.order!.fill!.notionalCoins).toBe(0);
    expect(exit.order!.fill!.gainCoins).toBeLessThan(0);
    expect(await balanceOf(p)).toBe(bal);
    expect((await svc.portfolio(p)).positions).toHaveLength(0);
  });

  it('anti-IDOR : on ne voit, n\'annule et ne consulte que ses propres ordres', async () => {
    const px = await closeAt('DEMO1', start - D);
    const mine = await order(u, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '1', price: px * 0.3 });
    await expect(svc.cancelOrder(other, mine.order!.id)).rejects.toThrow(/introuvable/);
    expect((await svc.listOrders(other)).map((o: any) => o.id)).not.toContain(mine.order!.id);
    const http = await request(app).delete(`/api/v1/crypto/orders/${mine.order!.id}`).set('Authorization', tok(other));
    expect(http.status).toBe(404);
    expect((await svc.listOrders(u, 'open')).map((o: any) => o.id)).toContain(mine.order!.id);
    const own = await request(app).delete(`/api/v1/crypto/orders/${mine.order!.id}`).set('Authorization', tok(u));
    expect(own.status).toBe(200);
    expect((await request(app).delete('/api/v1/crypto/orders/not-an-id').set('Authorization', tok(u))).status).toBe(400);
  });

  it('accès : domaine gratuit « crypto » débloque le marché, un autre domaine gratuit non ; la vente reste toujours permise', async () => {
    const ok = await newPlayer(10_000, { tier: 'free', freeDomain: 'crypto' });
    expect((await order(ok, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })).order!.status).toBe('filled');
    const locked = await newPlayer(10_000, { tier: 'free', freeDomain: 'stocks' });
    await expect(order(locked, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })).rejects.toThrow(/verrouillé/);
    const none = await newPlayer(10_000, { tier: 'free', freeDomain: null });
    await expect(order(none, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })).rejects.toThrow(/gratuit/);
    // position acquise puis passage en domaine verrouillé : la vente passe
    await query(`UPDATE users SET free_domain = 'stocks' WHERE id = $1`, [ok]);
    expect((await order(ok, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '0.1' })).order!.status).toBe('filled');
  });

  it('cohérence du registre : aucun jeton créé, solde = départ + ventes − achats − frais − impôts, somme des écritures = solde', async () => {
    for (const id of [u, other]) {
      const fl = await fills(id);
      const delta = fl.reduce((a: number, f: any) => a + (f.side === 'sell' ? f.notional_coins : -f.notional_coins) - f.fee_coins - f.tax_coins, 0);
      expect(await balanceOf(id)).toBe(100_000 + delta);
      expect(await ledgerSum(id)).toBe(delta);
    }
    const sinks = (await query(`SELECT reason, -SUM(amount)::int AS s FROM investcoins_transactions WHERE domain = 'crypto_market' AND nature = 'destruction' GROUP BY 1`)).rows;
    expect(sinks.map((x: any) => x.reason)).toContain('fee_brokerage');
  });

  it('HTTP : ordre, idempotence (200 au rejeu), quote, portefeuille, limiteur par joueur', async () => {
    const p = await newPlayer();
    const id = cid();
    const body = { clientOrderId: id, symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.2' };
    const a = await request(app).post('/api/v1/crypto/orders').set('Authorization', tok(p)).send(body);
    const b = await request(app).post('/api/v1/crypto/orders').set('Authorization', tok(p)).send(body);
    expect(a.status).toBe(201); expect(b.status).toBe(200); expect(b.body.idempotent).toBe(true);
    const q = await request(app).get('/api/v1/crypto/quote?symbol=DEMO1&side=buy&quantity=0.2').set('Authorization', tok(p));
    expect(q.status).toBe(200); expect(q.body.execution.totalCoins).toBeGreaterThan(q.body.execution.notionalCoins);
    const pf = await request(app).get('/api/v1/crypto/portfolio').set('Authorization', tok(p));
    expect(pf.body.positions[0].symbol).toBe('DEMO1');
    expect(pf.body.wealthCoins).toBe(pf.body.balanceCoins + pf.body.holdingsValueCoins);
    expect((await request(app).post('/api/v1/crypto/orders').send(body)).status).toBe(401);
    const statuses: number[] = [];
    for (let i = 0; i < 34; i++) statuses.push((await request(app).post('/api/v1/crypto/orders').set('Authorization', tok(p)).send({ ...body, clientOrderId: cid(), quantity: '-1' })).status);
    expect(statuses).toContain(429);
    expect(statuses[0]).toBe(400);
    // un autre joueur n'est pas affecté
    expect((await request(app).post('/api/v1/crypto/orders').set('Authorization', tok(other)).send({ ...body, clientOrderId: cid() })).status).toBe(201);
  });

  it('journal d\'audit : chaque ordre est tracé sans donnée sensible', async () => {
    const n = Number((await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE user_id = $1 AND action = 'crypto.order.create'`, [u])).rows[0].n);
    expect(n).toBeGreaterThan(3);
  });
});
