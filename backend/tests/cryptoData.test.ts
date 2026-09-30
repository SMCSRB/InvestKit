import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import zlib from 'zlib';
import { bucketStart, bucketEnd, aggregate, isBaseVisible, isValidCandle, countGaps, Candle } from '../src/engine/crypto/candles';
import { readZipFirstEntry, parseBinanceKlines, cryptoCompareProvider } from '../src/services/crypto/providers';
import { liquidityTierFor, cryptoDataService } from '../src/services/crypto/dataService';
import { runImport } from '../src/services/crypto/importer';
import { generateDemoCandles, DemoSpec } from '../src/data/crypto/demoData';
import { CATALOG } from '../src/data/crypto/catalog';
import { TIMEFRAMES, BASE_OF } from '../src/config/cryptoMarketRules';
import { BASE_MS } from '../src/engine/crypto/candles';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb } from './helpers';

const D = 86_400_000;
const utc = (s: string) => Date.parse(s + 'T00:00:00Z');
const c = (ts: number, o: number, h: number, l: number, cl: number, v = 10): Candle => ({ ts, o, h, l, c: cl, volume: v });

describe('catalogue', () => {
  it('~110 actifs, symboles uniques, descriptions rédigées, risque 1-5, faillites documentées', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(100);
    expect(new Set(CATALOG.map((x) => x.symbol)).size).toBe(CATALOG.length);
    for (const e of CATALOG) { expect(e.description.length, e.symbol).toBeGreaterThan(40); expect(e.risk).toBeGreaterThanOrEqual(1); expect(e.launch).toMatch(/^\d{4}-\d{2}$/); }
    const syms = CATALOG.map((x) => x.symbol);
    expect(syms).toEqual(expect.arrayContaining(['BTC', 'ETH', 'USDT', 'USDC', 'LUNA', 'FTT']));
    expect(CATALOG.find((x) => x.symbol === 'ETH')!.launch >= '2015-07').toBe(true);   // pas d'anachronisme annoncé
    for (const s of ['LUNA', 'UST', 'FTT']) expect(CATALOG.find((x) => x.symbol === s)!.collapse?.explanation.length, s).toBeGreaterThan(80);
    expect(CATALOG.filter((x) => x.stable).map((x) => x.symbol).sort()).toEqual(['DAI', 'USDC', 'USDT', 'UST']);
  });
});

describe('bougies : agrégation et alignement', () => {
  it('alignement UTC : semaine = lundi, mois = 1er, 4 h sur multiples de 4 h', () => {
    expect(new Date(bucketStart(utc('2024-05-16'), '1w')).toISOString()).toBe('2024-05-13T00:00:00.000Z');   // jeudi → lundi
    expect(new Date(bucketStart(utc('2024-05-13'), '1w')).toISOString()).toBe('2024-05-13T00:00:00.000Z');
    expect(new Date(bucketStart(utc('2024-05-19') + 86_399_000, '1w')).toISOString()).toBe('2024-05-13T00:00:00.000Z');   // dimanche soir
    expect(new Date(bucketStart(Date.parse('2024-05-16T22:30:00Z'), '1M')).toISOString()).toBe('2024-05-01T00:00:00.000Z');
    expect(new Date(bucketEnd(utc('2024-12-01'), '1M')).toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(new Date(bucketStart(Date.parse('2024-05-16T22:30:00Z'), '4h')).toISOString()).toBe('2024-05-16T20:00:00.000Z');
  });
  it('agrégation OHLCV : ouverture = première, clôture = dernière, extrêmes, volumes additionnés, partial', () => {
    const days = [c(utc('2024-05-13'), 10, 12, 9, 11, 5), c(utc('2024-05-14'), 11, 15, 10, 14, 6), c(utc('2024-05-15'), 14, 14, 8, 9, 7)];
    const w = aggregate(days, '1w', utc('2024-05-16'));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ ts: utc('2024-05-13'), o: 10, h: 15, l: 8, c: 9, volume: 18, partial: true });
    expect(aggregate(days, '1w', utc('2024-05-20'))[0].partial).toBe(false);
    const hours = Array.from({ length: 8 }, (_, i) => c(Date.parse('2024-05-16T00:00:00Z') + i * 3_600_000, 100 + i, 101 + i, 99 + i, 100 + i + 0.5));
    const h4 = aggregate(hours, '4h', Date.parse('2024-05-16T08:00:00Z'));
    expect(h4).toHaveLength(2);
    expect(h4[0]).toMatchObject({ o: 100, c: 103.5, partial: false });
    expect(aggregate(days, '1d', utc('2024-06-01')).every((x) => x.partial === false)).toBe(true);
  });
  it('visibilité : une bougie n\'est utilisable que terminée', () => {
    expect(isBaseVisible(utc('2024-05-15'), '1d', utc('2024-05-16'))).toBe(true);
    expect(isBaseVisible(utc('2024-05-15'), '1d', utc('2024-05-16') - 1)).toBe(false);
    expect(isBaseVisible(utc('2024-05-16'), '1d', utc('2024-05-16'))).toBe(false);
  });
  it('validation : incohérences et valeurs absurdes rejetées ; trous comptés, jamais comblés', () => {
    expect(isValidCandle(c(0, 10, 12, 9, 11))).toBe(true);
    expect(isValidCandle(c(0, 10, 9, 9, 11))).toBe(false);        // plus haut < clôture
    expect(isValidCandle(c(0, 10, 12, 11, 11))).toBe(false);      // plus bas > ouverture
    expect(isValidCandle(c(0, -1, 2, -1, 1))).toBe(false);
    expect(isValidCandle(c(0, NaN, 2, 1, 1))).toBe(false);
    expect(isValidCandle({ ...c(0, 1, 2, 1, 1), volume: -5 })).toBe(false);
    expect(isValidCandle(c(0, 0.00000001, 0.00000002, 0.00000001, 0.00000002))).toBe(true);
    expect(countGaps([c(0, 1, 1, 1, 1), c(D, 1, 1, 1, 1), c(4 * D, 1, 1, 1, 1)], '1d')).toBe(2);
  });
});

describe('fournisseurs de données (adaptateurs, sans réseau)', () => {
  it('lit un ZIP (avec descripteur de données) et les CSV Binance, dont les heures en microsecondes', () => {
    const csv = 'open_time,open,high,low,close,volume,close_time,quote\n1704067200000,42000,42500,41900,42300,10,1704070799999,423000,100,1,1,0\n1735689600000000,93000,93500,92900,93400,5,1735693199999999,466000,50,1,1,0\n';
    const raw = Buffer.from(csv);
    const comp = zlib.deflateRawSync(raw);
    const name = Buffer.from('x.csv');
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 42);
    const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(46 + name.length, 12); eocd.writeUInt32LE(local.length + name.length + comp.length, 16);
    const zip = Buffer.concat([local, name, comp, central, name, eocd]);
    const rows = parseBinanceKlines(readZipFirstEntry(zip).toString('utf8'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ ts: 1704067200000, o: 42000, h: 42500, l: 41900, c: 42300, volume: 423000 });
    expect(rows[1].ts).toBe(1735689600000);            // microsecondes ramenées en millisecondes
    expect(() => readZipFirstEntry(Buffer.from('pas un zip'))).toThrow();
  });

  it('CryptoCompare : pagination vers le passé, lignes à zéro avant le lancement ignorées, déduplication, erreur API signalée', async () => {
    const t0 = 1_600_000_000;
    const mk = (time: number, px: number) => ({ time, open: px, high: px * 1.1, low: px * 0.9, close: px, volumeto: px * 100 });
    const pages = [
      { Response: 'Success', Data: { Data: [mk(t0 - 86_400 * 2, 0), mk(t0 - 86_400, 5), mk(t0, 6)] } },
      { Response: 'Success', Data: { Data: [mk(t0 - 86_400 * 5, 0), mk(t0 - 86_400 * 4, 0), mk(t0 - 86_400 * 3, 4)] } },
    ];
    let calls = 0;
    const http = async () => pages[calls++] ?? { Response: 'Success', Data: { Data: [] } };
    const out = await cryptoCompareProvider('k', 0).fetchCandles({ symbol: 'ABC', tf: '1d', fromMs: (t0 - 86_400 * 10) * 1000, toMs: t0 * 1000 }, http as any);
    expect(out.map((x) => x.ts / 1000)).toEqual([t0 - 86_400 * 3, t0 - 86_400, t0]);   // les zéros d'avant lancement sont écartés
    expect(out[0].volume).toBe(400);
    await expect(cryptoCompareProvider('k', 0).fetchCandles({ symbol: 'ABC', tf: '1d', fromMs: 0, toMs: t0 * 1000 }, (async () => ({ Response: 'Error', Message: 'rate limit' })) as any)).rejects.toThrow(/rate limit/);
  });

  it('paliers de liquidité', () => {
    expect(liquidityTierFor(2_000_000_000)).toBe(1);
    expect(liquidityTierFor(80_000_000)).toBe(2);
    expect(liquidityTierFor(6_000_000)).toBe(3);
    expect(liquidityTierFor(10_000)).toBe(4);
    expect(liquidityTierFor(10, true)).toBe(1);
  });
});

const spec = (over: Partial<DemoSpec> = {}): DemoSpec => ({ symbol: 'TEST1', name: 'Test (fictif)', start: '2021-01-01', days: 120, startPrice: 100, dailyVolPct: 4, driftPctPerDay: 0.1, baseVolume: 600_000_000, seed: 7, category: 'other', risk: 3, description: 'fictif', ...over });

describe('données de démonstration fictives', () => {
  it('cohérentes : le jour agrège bien les 24 heures, les minutes restent dans l\'heure, déterministes', () => {
    const a = generateDemoCandles(spec({ days: 12 }), 2), b = generateDemoCandles(spec({ days: 12 }), 2);
    expect(a.h1).toEqual(b.h1);
    expect(a.h1).toHaveLength(12 * 24);
    expect(a.d1).toHaveLength(12);
    for (const d of a.d1) { expect(isValidCandle(d)).toBe(true); const hrs = a.h1.filter((x) => x.ts >= d.ts && x.ts < d.ts + D); expect(d.o).toBe(hrs[0].o); expect(d.c).toBe(hrs[23].c); expect(d.h).toBe(Math.max(...hrs.map((x) => x.h))); }
    expect(a.m1).toHaveLength(2 * 24 * 60);
    expect(a.m1.every(isValidCandle)).toBe(true);
    const x = generateDemoCandles(spec({ symbol: 'TESTX', days: 40, startPrice: 1, crash: { dayIndex: 20, toFactor: 0.0001, days: 4 } }), 0);
    expect(x.d1[39].c).toBeLessThan(x.d1[15].c * 0.01);    // le scénario d'effondrement fait perdre plus de 99 %
  });
});

describe.skipIf(!hasDb)('données de marché en base : import, catalogue, lecture sans fuite du futur', () => {
  const S = 'TEST1';
  let candles: ReturnType<typeof generateDemoCandles>;
  beforeAll(async () => {
    await setupDb();
    await query(`DELETE FROM crypto_assets WHERE symbol LIKE 'TEST%'`);
    await cryptoDataService.seedCatalog();
    candles = generateDemoCandles(spec({ days: 400 }), 10);
    await cryptoDataService.upsertSyntheticAsset({ symbol: S, name: 'Test (fictif)', category: 'other', risk: 3, description: 'fictif' });
    await cryptoDataService.importCandles(S, '1d', candles.d1, { provider: 'test' });
    await cryptoDataService.importCandles(S, '1h', candles.h1, { provider: 'test' });
    await cryptoDataService.importCandles(S, '1m', candles.m1, { provider: 'test' });
  });
  afterAll(async () => { await query(`DELETE FROM crypto_assets WHERE symbol LIKE 'TEST%'`); await teardownDb(); });

  it('catalogue inscrit, idempotent ; un actif synthétique n\'est jamais écrasé par le catalogue', async () => {
    const n = (await query('SELECT COUNT(*)::int AS n FROM crypto_assets WHERE synthetic = FALSE')).rows[0].n;
    expect(n).toBeGreaterThanOrEqual(100);
    await cryptoDataService.seedCatalog();
    expect((await query('SELECT COUNT(*)::int AS n FROM crypto_assets WHERE synthetic = FALSE')).rows[0].n).toBe(n);
    expect((await query(`SELECT synthetic, first_candle_at IS NOT NULL AS f FROM crypto_assets WHERE symbol = $1`, [S])).rows[0]).toEqual({ synthetic: true, f: true });
    expect((await query(`SELECT COUNT(*)::int AS n FROM crypto_assets WHERE symbol = 'BTC' AND first_candle_at IS NOT NULL`)).rows[0].n).toBe(0);   // aucun cours inventé pour un vrai actif
  });

  it('import : bougies invalides rejetées, ré-import idempotent (pas de doublon), trous comptés, statistiques mises à jour', async () => {
    await cryptoDataService.upsertSyntheticAsset({ symbol: 'TEST2', name: 'Test 2', category: 'other', risk: 4, description: 'fictif' });
    const base = generateDemoCandles(spec({ symbol: 'TEST2', days: 10 }), 0).d1;
    const bad = [{ ...base[0], h: base[0].l - 1 }, { ...base[1], c: NaN }];
    const holes = [...base.slice(2, 5), ...base.slice(8)];
    const r1 = await cryptoDataService.importCandles('TEST2', '1d', [...bad, ...holes, base[5]], { provider: 'test' });
    expect(r1.rejected).toBe(2);
    expect(r1.written).toBe(holes.length + 1);
    expect(r1.gaps).toBeGreaterThan(0);
    await cryptoDataService.importCandles('TEST2', '1d', holes, { provider: 'test' });
    expect((await query(`SELECT COUNT(*)::int AS n FROM crypto_candles WHERE asset_id = (SELECT id FROM crypto_assets WHERE symbol = 'TEST2')`)).rows[0].n).toBe(holes.length + 1);
    const a = (await query(`SELECT first_candle_at, last_candle_at, liquidity_tier FROM crypto_assets WHERE symbol = 'TEST2'`)).rows[0];
    expect(new Date(a.first_candle_at).getTime()).toBe(base[2].ts);
    expect((await query(`SELECT status, rows_rejected FROM crypto_import_runs WHERE symbol = 'TEST2' ORDER BY id LIMIT 1`)).rows[0]).toEqual({ status: 'ok', rows_rejected: 2 });
  });

  it('importeur avec un fournisseur simulé : symbole inconnu signalé, réponse vide signalée « vide », erreur arrêtante ou continuée', async () => {
    const fake = { id: 'fake', name: 'Fake', supports: ['1d' as const], fetchCandles: async ({ symbol }: any) => { if (symbol === 'ETH') throw new Error('quota dépassé'); return []; } };
    const logs: string[] = [];
    const rep = await runImport({ provider: fake, symbols: ['NOPE', 'BTC', 'ETH'], tf: '1d', fromMs: 0, toMs: Date.now(), continueOnError: true, log: (m) => logs.push(m) });
    expect(rep.map((r) => r.status)).toEqual(['error', 'empty', 'error']);
    await expect(runImport({ provider: fake, symbols: ['ETH'], tf: '1d', fromMs: 0, toMs: Date.now() })).rejects.toThrow(/quota/);
    expect((await query(`SELECT COUNT(*)::int AS n FROM crypto_candles WHERE asset_id = (SELECT id FROM crypto_assets WHERE symbol = 'BTC')`)).rows[0].n).toBe(0);
  });

  it('ANTI-TRICHE : aucune unité de temps ne renvoie de donnée postérieure à la date simulée, sur 40 dates tirées au hasard', async () => {
    const start = utc('2021-01-01');
    const rng = (i: number) => start + 30 * D + ((i * 7919) % 360) * D + ((i * 104729) % 24) * 3_600_000 + ((i * 31) % 60) * 60_000;
    for (let i = 0; i < 40; i++) {
      const now = rng(i);
      for (const tf of TIMEFRAMES) {
        const r = await cryptoDataService.getCandles(S, tf, now, { limit: 50 });
        for (const k of r.candles) {
          expect(k.ts, `${tf} @${new Date(now).toISOString()}`).toBeLessThan(now);       // l'ouverture est dans le passé
          if (!k.partial) expect(k.ts + (tf === '1M' ? 28 * D : tf === '1w' ? 7 * D : { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': D }[tf as '1m'])).toBeLessThanOrEqual(now + 31 * D);
        }
        // la clôture d'une bougie de base n'est jamais celle d'une période non terminée : on le vérifie sur la série de base elle-même
        const base = await cryptoDataService.getCandles(S, BASE_OF[tf], now, { limit: 1000 });
        for (const k of base.candles) expect(k.ts + BASE_MS[BASE_OF[tf]]).toBeLessThanOrEqual(now);
      }
    }
  });

  it('un cours futur ne peut pas se deviner : le dernier cours connu ne change pas si on déplace la date de quelques minutes à l\'intérieur du jour', async () => {
    const id = await cryptoDataService.assetId(S);
    const day = utc('2021-06-10');
    const p0 = await cryptoDataService.priceAt(id, day), p1 = await cryptoDataService.priceAt(id, day + 23 * 3_600_000);
    expect(p0!.price).toBe(p1!.price);
    const next = await cryptoDataService.priceAt(id, day + D);
    expect(next!.at).toBe(day + D);
    expect(await cryptoDataService.priceAt(id, utc('2020-06-01'))).toBeNull();       // avant le premier cours : pas coté
  });

  it('liste des actifs : pas encore coté = invisible ; variations, plus haut/plus bas seulement sur le passé', async () => {
    expect((await cryptoDataService.listAssets(utc('2020-12-31'))).map((a) => a.symbol)).not.toContain(S);
    expect((await cryptoDataService.listAssets(utc('2021-01-01'))).map((a) => a.symbol)).not.toContain(S);       // la 1re bougie n'est pas encore terminée
    const now = utc('2021-03-15');
    const a = (await cryptoDataService.listAssets(now)).find((x) => x.symbol === S)!;
    expect(a.synthetic).toBe(true);
    const past = candles.d1.filter((k) => k.ts + D <= now);
    expect(a.price).toBe(past[past.length - 1].c);
    expect(a.allTimeHigh).toBe(Math.max(...past.map((k) => k.h)));
    expect(a.allTimeLow).toBe(Math.min(...past.map((k) => k.l)));
    expect(a.change1d).toBeCloseTo(Math.round((past[past.length - 1].c / past[past.length - 2].c - 1) * 10000) / 100, 2);
    const found = await cryptoDataService.listAssets(now, { q: 'test' });
    expect(found.find((x) => x.symbol === S)!.stale).toBe(false);
    expect(found.find((x) => x.symbol === 'TEST2')!.stale).toBe(true);        // données interrompues en janvier : dernier cours conservé, signalé
    expect((await cryptoDataService.listAssets(now, { q: 'zzz' })).length).toBe(0);
  });

  it('pagination par lots : pages consécutives sans chevauchement ni trou, curseur « avant »', async () => {
    const now = utc('2021-12-01');
    const p1 = await cryptoDataService.getCandles(S, '1d', now, { limit: 100 });
    expect(p1.candles).toHaveLength(100);
    expect(p1.hasMore).toBe(true);
    expect(p1.candles[99].ts).toBe(now - D);
    const p2 = await cryptoDataService.getCandles(S, '1d', now, { limit: 100, before: p1.nextBefore! });
    expect(p2.candles[p2.candles.length - 1].ts).toBe(p1.candles[0].ts - D);
    const p3 = await cryptoDataService.getCandles(S, '1d', now, { limit: 500, before: p2.nextBefore! });
    expect(p3.hasMore).toBe(false);
    expect(p3.candles[0].ts).toBe(utc('2021-01-01'));
    const w = await cryptoDataService.getCandles(S, '1w', now, { limit: 10 });
    for (const k of w.candles) expect(new Date(k.ts).getUTCDay()).toBe(1);
    expect((await cryptoDataService.getCandles(S, '1d', now, { limit: 999999 })).candles.length).toBeLessThanOrEqual(1000);
  });

  it('résolutions disponibles selon ce qui a été importé, et explication de faillite masquée avant la date de l\'événement', async () => {
    const tfs = await cryptoDataService.availableTimeframes(S, utc('2021-06-01'));
    expect(tfs).toEqual(['1h', '4h', '1d', '1w', '1M']);          // minutes seulement sur les 10 derniers jours importés (hors période)
    const late = await cryptoDataService.availableTimeframes(S, utc('2022-02-01'));
    expect(late).toContain('1m');
    await cryptoDataService.upsertSyntheticAsset({ symbol: 'TEST3', name: 'Test 3', category: 'defi', risk: 5, description: 'fictif', crashDate: '2021-05-01' });
    await cryptoDataService.importCandles('TEST3', '1d', generateDemoCandles(spec({ symbol: 'TEST3', days: 200 }), 0).d1, { provider: 'test' });
    const before = await cryptoDataService.getAsset('TEST3', utc('2021-04-20'));
    expect(before.collapse).toBeNull();                            // on ne prévient pas le joueur avant l'événement
    const after = await cryptoDataService.getAsset('TEST3', utc('2021-05-10'));
    expect(after.collapse?.title).toMatch(/Effondrement/);
    await expect(cryptoDataService.getAsset('NOPE', utc('2021-05-10'))).rejects.toThrow();
  });
});
