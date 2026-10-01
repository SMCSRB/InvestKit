import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as svc } from '../src/services/crypto/tradingService';
import { eventsService, randomEventOn, activeEffects } from '../src/services/crypto/eventsService';
import { HISTORIC_EVENTS, RANDOM_EVENT_PARAMS } from '../src/data/crypto/events';
import { CachedPriceService, ProviderUnavailableError, PriceProvider } from '../src/services/crypto/realtime';
import { executeAt } from '../src/engine/crypto/execution';
import { TRADING_TAX } from '../src/config/tradingRules';
import { CATALOG } from '../src/data/crypto/catalog';

const D = 86_400_000;
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const utc = (s: string) => Date.parse(s + 'T00:00:00Z');

describe('événements : données', () => {
  it('clés uniques, dates valides, textes rédigés, leçon présente ; cohérents avec les faillites du catalogue', () => {
    expect(new Set(HISTORIC_EVENTS.map((e) => e.key)).size).toBe(HISTORIC_EVENTS.length);
    for (const e of HISTORIC_EVENTS) { expect(Number.isFinite(Date.parse(e.date)), e.key).toBe(true); expect(e.message.length, e.key).toBeGreaterThan(60); expect(e.lesson.length, e.key).toBeGreaterThan(60); }
    const byKey = Object.fromEntries(HISTORIC_EVENTS.map((e) => [e.key, e.date]));
    expect(byKey['terra-2022-05']).toBe(CATALOG.find((c) => c.symbol === 'LUNA')!.collapse!.date);
    expect(byKey['ftx-2022-11']).toBe(CATALOG.find((c) => c.symbol === 'FTT')!.collapse!.date);
    for (const need of ['covid-2020-03', 'btc-peak-2017-12', 'fed-2022-03', 'mtgox-2014-02']) expect(byKey[need], need).toBeDefined();
  });
  it('tirages aléatoires déterministes, fréquences conformes aux paramètres, effets bornés dans le temps', () => {
    const t0 = utc('2020-01-01');
    const a = Array.from({ length: 400 }, (_, i) => randomEventOn('user-A', t0 + i * D));
    const b = Array.from({ length: 400 }, (_, i) => randomEventOn('user-A', t0 + i * D));
    const c = Array.from({ length: 400 }, (_, i) => randomEventOn('user-B', t0 + i * D));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    const big = Array.from({ length: 20_000 }, (_, i) => randomEventOn('user-C', t0 + i * D));
    const freq = (k: string) => big.filter((x) => x === k).length / big.length;
    expect(freq('outage')).toBeGreaterThan(RANDOM_EVENT_PARAMS.outageProbPerDay * 0.6); expect(freq('outage')).toBeLessThan(RANDOM_EVENT_PARAMS.outageProbPerDay * 1.5);
    expect(freq('volatility')).toBeGreaterThan(RANDOM_EVENT_PARAMS.volatilityProbPerDay * 0.7); expect(freq('volatility')).toBeLessThan(RANDOM_EVENT_PARAMS.volatilityProbPerDay * 1.4);
    // un incident d'un jour donné n'agit que ce jour-là ; la volatilité 3 jours ; rien avant la date de départ
    const dayOut = big.findIndex((x) => x === 'outage'), dayVol = big.findIndex((x) => x === 'volatility');
    expect(activeEffects('user-C', t0 + dayOut * D, t0).outage).toBe(true);
    expect(activeEffects('user-C', t0 + (dayOut + 1) * D, t0).outage).toBe(dayOut + 1 < big.length && big[dayOut + 1] === 'outage');
    expect(activeEffects('user-C', t0 + (dayVol + 2) * D, t0).stress).toBe(RANDOM_EVENT_PARAMS.volatilityMultiplier);
    expect(activeEffects('user-C', t0 + dayOut * D, t0 + dayOut * D + D).outage).toBe(false);   // avant la date de départ
  });
  it('volatilité extrême : écart et glissement multipliés, plafond respecté', () => {
    const base = { side: 'buy' as const, refPrice: 100, quantity: 5, tier: 3, avgDailyVolumeUsd: 1e7, maker: false };
    const n = executeAt(base), s = executeAt({ ...base, stressMultiplier: 3 });
    expect(s.spreadPct).toBeCloseTo(n.spreadPct * 3, 9);
    expect(s.slippagePct).toBeCloseTo(n.slippagePct * 3, 9);
    expect(s.price).toBeGreaterThan(n.price);
    expect(executeAt({ ...base, maker: true, stressMultiplier: 3 }).price).toBe(100);
  });
});

describe('temps réel : architecture (cache, repli, refus des prix périmés)', () => {
  it('cache, repli sur le fournisseur suivant, cotation périmée signalée puis refusée', async () => {
    let now = 1_000, calls = 0, fail = false;
    const a: PriceProvider = { id: 'a', latest: async (s) => { calls++; if (fail) throw new Error('down'); return { symbol: s, price: 100, at: now, source: 'a' }; } };
    const b: PriceProvider = { id: 'b', latest: async (s) => ({ symbol: s, price: 99, at: now, source: 'b' }) };
    const svcP = new CachedPriceService([a, b], { ttlMs: 1000, maxStaleMs: 10_000, now: () => now });
    expect((await svcP.get('BTC')).price).toBe(100);
    await svcP.get('BTC'); expect(calls).toBe(1);             // servi par le cache
    now += 2000; fail = true;
    expect((await svcP.get('BTC')).source).toBe('b');        // repli
    const only = new CachedPriceService([a], { ttlMs: 1000, maxStaleMs: 10_000, now: () => now });
    fail = false; await only.get('ETH'); fail = true; now += 5000;
    expect(await only.get('ETH')).toMatchObject({ stale: true });
    now += 20_000;
    await expect(only.get('ETH')).rejects.toBeInstanceOf(ProviderUnavailableError);
    const junk = new CachedPriceService([{ id: 'j', latest: async (s) => ({ symbol: s, price: -5, at: now, source: 'j' }) }], { ttlMs: 1, maxStaleMs: 1 });
    await expect(junk.get('X')).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});

describe.skipIf(!hasDb)('Crypto : impôt à la sortie, échanges, événements (base réelle)', () => {
  const start = utc('2020-01-01');
  const newPlayer = async (balance = 200_000, opts: any = {}) => { const id = await createUser({ id: calmUserId(), balance, tier: 'pro', ...opts }); await clockService.create(id, 'y2020'); return id; };
  const order = (u: string, o: any) => svc.placeOrder(u, { clientOrderId: cid(), ...o });
  const fee = async (u: string) => Number((await query(`SELECT COALESCE(SUM(fee_coins),0)::int AS f FROM crypto_fills WHERE user_id = $1`, [u])).rows[0].f);

  beforeAll(async () => { await setupDb(); await importDemo(); }, 120_000);
  afterAll(async () => { TRADING_TAX.enabled = false; await teardownDb(); });

  it('impôt : seulement à la sortie vers l\'euro, sur la plus-value, au-dessus du seuil annuel ; journalisé comme destruction', async () => {
    TRADING_TAX.enabled = true;
    try {
      const p = await newPlayer();
      await order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '20' });
      // avancer jusqu'à une plus-value : on cherche un mois où le prix est supérieur au prix d'achat
      let gainFill: any = null;
      for (let i = 0; i < 12 && !gainFill; i++) {
        await svc.advance(p, 'month');
        const pf = await svc.portfolio(p);
        if (pf.positions[0].unrealizedCoins > 1500) gainFill = (await order(p, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '10' })).order!.fill;
      }
      expect(gainFill, 'une plus-value doit exister sur les données de démonstration').toBeTruthy();
      expect(gainFill.gainCoins).toBeGreaterThan(300);
      const year = new Date(gainFill.simAt).getUTCFullYear();
      const it = TRADING_TAX.incomeTaxPct(year, 'crypto'), ps = TRADING_TAX.socialPct(year);
      expect(gainFill.taxCoins).toBe(Math.ceil(gainFill.gainCoins * it / 100) + Math.ceil(gainFill.gainCoins * ps / 100));
      const t = (await query(`SELECT reason, nature, domain FROM investcoins_transactions WHERE user_id = $1 AND reason = 'tax_capital_gains'`, [p])).rows[0];
      expect(t).toMatchObject({ nature: 'destruction', domain: 'crypto_market' });
      // moins-value : aucun impôt
      const loss = await order(p, { symbol: 'DEMO1', side: 'sell', type: 'market', quantity: '1' });
      if (loss.order!.fill!.gainCoins! <= 0) expect(loss.order!.fill!.taxCoins).toBe(0);
      const pf = await svc.portfolio(p);
      expect(pf.taxPaidCoins).toBeGreaterThan(0);
      expect(pf.cryptoSalesThisYear).toBeGreaterThan(0);
    } finally { TRADING_TAX.enabled = false; }
  });

  it('échange crypto contre crypto : aucun impôt, aucune pièce créée, prix de revient reporté, seuls les frais sont payés', async () => {
    TRADING_TAX.enabled = true;
    try {
      const p = await newPlayer();
      await order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '3' });
      const basis0 = (await svc.portfolio(p)).positions[0].costBasisCoins;
      for (let i = 0; i < 3; i++) await svc.advance(p, 'month');   // le prix bouge : l'échange porterait une plus-value latente
      const balBefore = await balanceOfUser(p);
      const r = await svc.swap(p, { from: 'DEMO1', to: 'DEMO2', quantity: '1.5', clientOrderId: cid() });
      expect(r.idempotent).toBe(false);
      expect(r.order!.toSymbol).toBe('DEMO2');
      expect(r.order!.fill!.taxCoins).toBe(0);
      const fl = (await query(`SELECT * FROM crypto_fills WHERE order_id = $1 ORDER BY id`, [r.order!.id])).rows;
      expect(fl).toHaveLength(2);
      expect(fl.every((x: any) => x.swap)).toBe(true);
      // seuls les frais quittent le solde
      expect(balBefore - await balanceOfUser(p)).toBe(fl[0].fee_coins);
      const pf = await svc.portfolio(p);
      const d1 = pf.positions.find((x: any) => x.symbol === 'DEMO1')!, d2 = pf.positions.find((x: any) => x.symbol === 'DEMO2')!;
      expect(d1.quantity).toBe('1.5');
      expect(d1.costBasisCoins + d2.costBasisCoins).toBe(basis0);       // prix de revient conservé au total
      expect(pf.realizedCoins).toBe(0);                                 // aucune plus-value réalisée
      expect(pf.cryptoSalesThisYear).toBe(0);                           // ne compte pas dans les cessions vers l'euro
      // idempotence + erreurs
      const id = cid();
      const a = await svc.swap(p, { from: 'DEMO1', to: 'DEMO2', quantity: '0.5', clientOrderId: id });
      const b = await svc.swap(p, { from: 'DEMO1', to: 'DEMO2', quantity: '0.5', clientOrderId: id });
      expect(b.idempotent).toBe(true); expect(b.order!.id).toBe(a.order!.id);
      await expect(svc.swap(p, { from: 'DEMO1', to: 'DEMO1', quantity: '1', clientOrderId: cid() })).rejects.toThrow(/différents/);
      await expect(svc.swap(p, { from: 'DEMO1', to: 'DEMO2', quantity: '99', clientOrderId: cid() })).rejects.toThrow(/insuffisante/);
      await expect(svc.swap(p, { from: 'DEMO1', to: 'NOPE', quantity: '0.1', clientOrderId: cid() })).rejects.toThrow();
    } finally { TRADING_TAX.enabled = false; }
  });

  it('événements historiques : révélés seulement quand la date simulée les franchit, une seule fois, avec leçon et notification', async () => {
    const p = await newPlayer(1000);
    expect(await eventsService.list(p)).toHaveLength(0);
    // 2020-01-01 → 2020-03-01 : avant le jeudi noir (12 mars) → aucun événement historique
    await svc.advance(p, 'month'); await svc.advance(p, 'month');
    expect((await eventsService.list(p)).filter((e) => e.origin === 'historic')).toHaveLength(0);
    // → 2020-04-01 : le 12 mars est passé
    await svc.advance(p, 'month');
    const ev = (await eventsService.list(p)).filter((e) => e.origin === 'historic');
    expect(ev.map((e) => e.key)).toContain('covid-2020-03');
    expect(ev.every((e) => e.date <= '2020-04-01')).toBe(true);          // jamais d'événement futur
    expect(ev.find((e) => e.key === 'covid-2020-03')!.lesson.length).toBeGreaterThan(50);
    const before = (await eventsService.list(p)).length;
    await svc.advance(p, 'day');
    expect((await eventsService.list(p)).filter((e) => e.key === 'covid-2020-03')).toHaveLength(1);   // pas de doublon
    expect((await eventsService.list(p)).length).toBeGreaterThanOrEqual(before);
    const n = Number((await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND kind = 'crypto_event'`, [p])).rows[0].n);
    expect(n).toBeGreaterThanOrEqual(1);
    // un joueur qui démarre APRÈS un événement ne le voit jamais
    const q = await newPlayer(1000);
    await query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0), start_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [q, utc('2020-06-01')]);
    await svc.advance(p, 'day');
    expect((await eventsService.list(q)).filter((e) => e.origin === 'historic')).toHaveLength(0);
  });

  it('incident technique : pas d\'ordre au marché ce jour-là (ordres en attente autorisés) ; volatilité : coûts majorés', async () => {
    const p = await newPlayer();
    // on cherche un jour d'incident pour ce joueur dans les données disponibles
    let outDay = -1, volDay = -1;
    for (let i = 1; i < 1500 && (outDay < 0 || volDay < 0); i++) { const k = randomEventOn(p, start + i * D); if (k === 'outage' && outDay < 0) outDay = i; if (k === 'volatility' && volDay < 0) volDay = i; }
    expect(outDay).toBeGreaterThan(0);
    await query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [p, start + outDay * D]);
    await expect(order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })).rejects.toThrow(/indisponible/);
    await expect(svc.swap(p, { from: 'DEMO1', to: 'DEMO2', quantity: '0.1', clientOrderId: cid() })).rejects.toThrow(/indisponible|insuffisante/);
    const lim = await order(p, { symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '0.1', price: 1 });
    expect(lim.order!.status).toBe('open');
    // le lendemain (sauf double incident) le marché rouvre
    await query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [p, start + (outDay + 2) * D]);
    if (!activeEffects(p, start + (outDay + 2) * D, start).outage) expect((await order(p, { symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '0.1' })).order!.status).toBe('filled');
    if (volDay > 0) {
      await query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [p, start + volDay * D]);
      if (!activeEffects(p, start + volDay * D, start).outage) {
        const q = await svc.quote(p, 'DEMO1', 'buy', '0.5', undefined);
        expect(q.execution.spreadPct).toBeCloseTo(0.02 * RANDOM_EVENT_PARAMS.volatilityMultiplier, 6);
      }
    }
  });

  it('les frais de ce domaine apparaissent comme destruction dans les statistiques d\'administration', async () => {
    const r = (await query(`SELECT COALESCE(SUM(-amount),0)::int AS s FROM investcoins_transactions WHERE domain = 'crypto_market' AND reason = 'fee_brokerage'`)).rows[0];
    expect(r.s).toBeGreaterThan(0);
    expect(await fee((await query(`SELECT user_id FROM crypto_fills LIMIT 1`)).rows[0].user_id)).toBeGreaterThan(0);
  });
});

const balanceOfUser = balanceOf;
