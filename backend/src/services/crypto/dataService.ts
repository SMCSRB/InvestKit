import { query, getClient } from '../../utils/db';
import { CATALOG } from '../../data/crypto/catalog';
import { BASE_OF, BaseTimeframe, CANDLES, LIQUIDITY_TIERS, Timeframe } from '../../config/cryptoMarketRules';
import { BASE_MS, Candle, aggregate, countGaps, isValidCandle } from '../../engine/crypto/candles';

export class CryptoDataError extends Error { constructor(public code: 'INVALID_INPUT' | 'NOT_FOUND' | 'FX_UNAVAILABLE', message: string) { super(message); this.name = 'CryptoDataError'; } }

const DAY = 86_400_000;
const rowToCandle = (r: any): Candle => ({ ts: new Date(r.ts).getTime(), o: r.o, h: r.h, l: r.l, c: r.c, volume: r.volume, marketCap: r.market_cap });

export const liquidityTierFor = (avgDailyVolume: number, stable = false): number => {
  if (stable) return 1;
  return LIQUIDITY_TIERS.find((t) => avgDailyVolume >= t.minAvgDailyVolume)!.tier;
};

export const cryptoDataService = {
  // Inscrit / met à jour le catalogue (sans toucher aux dates de bougies). Idempotent.
  async seedCatalog(db: { query: any } = { query }): Promise<number> {
    for (const e of CATALOG) {
      await db.query(
        `INSERT INTO crypto_assets (symbol, name, category, risk, stable, description, launch_hint, collapse_date, collapse_title, collapse_explanation, provider_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, risk = EXCLUDED.risk, stable = EXCLUDED.stable, description = EXCLUDED.description,
           launch_hint = EXCLUDED.launch_hint, collapse_date = EXCLUDED.collapse_date, collapse_title = EXCLUDED.collapse_title, collapse_explanation = EXCLUDED.collapse_explanation,
           provider_ids = EXCLUDED.provider_ids, updated_at = NOW()
         WHERE crypto_assets.synthetic = FALSE`,
        [e.symbol, e.name, e.category, e.risk, !!e.stable, e.description, e.launch, e.collapse?.date ?? null, e.collapse?.title ?? null, e.collapse?.explanation ?? null, JSON.stringify(e.providers ?? {})]
      );
    }
    return CATALOG.length;
  },

  // Enregistre un actif de démonstration FICTIF (voir data/crypto/demoData.ts).
  async upsertSyntheticAsset(spec: { symbol: string; name: string; category: string; risk: number; stable?: boolean; description: string; crashDate?: string }): Promise<number> {
    const r = await query(
      `INSERT INTO crypto_assets (symbol, name, category, risk, stable, description, synthetic, collapse_date, collapse_title, collapse_explanation)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8,$9)
       ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, synthetic = TRUE, updated_at = NOW() RETURNING id`,
      [spec.symbol, spec.name, spec.category, spec.risk, !!spec.stable, spec.description, spec.crashDate ?? null, spec.crashDate ? 'Effondrement (scénario fictif)' : null, spec.crashDate ? 'Scénario FICTIF qui rejoue la faillite d\'un projet : le cours perd plus de 99,9 % en quelques jours.' : null]);
    return r.rows[0].id;
  },

  async assetId(symbol: string): Promise<number> {
    const r = await query('SELECT id FROM crypto_assets WHERE symbol = $1', [symbol]);
    if (!r.rows[0]) throw new CryptoDataError('NOT_FOUND', `Actif inconnu : ${symbol}`);
    return r.rows[0].id;
  },

  // Insère des bougies (validées, par lots). Renvoie le nombre écrit, rejeté et les trous détectés. Ne comble JAMAIS les trous.
  async importCandles(symbol: string, tf: BaseTimeframe, candles: Candle[], meta: { provider: string; fromMs?: number; toMs?: number } = { provider: 'inconnu' }) {
    const assetId = await cryptoDataService.assetId(symbol);
    const run = (await query(`INSERT INTO crypto_import_runs (provider, symbol, tf, from_ts, to_ts) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [meta.provider, symbol, tf, meta.fromMs ? new Date(meta.fromMs) : null, meta.toMs ? new Date(meta.toMs) : null])).rows[0].id;
    try {
      const valid = candles.filter(isValidCandle).sort((a, b) => a.ts - b.ts);
      const rejected = candles.length - valid.length;
      const gaps = countGaps(valid, tf);
      const client = await getClient();
      try {
        await client.query('BEGIN');
        for (let i = 0; i < valid.length; i += 1000) {
          const chunk = valid.slice(i, i + 1000);
          await client.query(
            `INSERT INTO crypto_candles (asset_id, tf, ts, o, h, l, c, volume, market_cap)
             SELECT $1, $2, to_timestamp(x.ts / 1000.0), x.o, x.h, x.l, x.c, x.v, x.mc
             FROM unnest($3::float8[], $4::float8[], $5::float8[], $6::float8[], $7::float8[], $8::float8[], $9::float8[]) AS x(ts, o, h, l, c, v, mc)
             ON CONFLICT (asset_id, tf, ts) DO UPDATE SET o = EXCLUDED.o, h = EXCLUDED.h, l = EXCLUDED.l, c = EXCLUDED.c, volume = EXCLUDED.volume,
               market_cap = COALESCE(EXCLUDED.market_cap, crypto_candles.market_cap)`,
            [assetId, tf, chunk.map((c) => c.ts), chunk.map((c) => c.o), chunk.map((c) => c.h), chunk.map((c) => c.l), chunk.map((c) => c.c), chunk.map((c) => c.volume), chunk.map((c) => c.marketCap ?? null)]);
        }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
      await cryptoDataService.refreshAssetStats(symbol);
      await query(`UPDATE crypto_import_runs SET status = 'ok', rows_written = $2, rows_rejected = $3, gaps = $4, finished_at = NOW() WHERE id = $1`, [run, valid.length, rejected, gaps]);
      return { written: valid.length, rejected, gaps };
    } catch (e: any) {
      await query(`UPDATE crypto_import_runs SET status = 'error', error = $2, finished_at = NOW() WHERE id = $1`, [run, String(e.message).slice(0, 500)]);
      throw e;
    }
  },

  // Met à jour première / dernière bougie et palier de liquidité (volume quotidien moyen des 90 derniers jours de données).
  async refreshAssetStats(symbol: string): Promise<void> {
    const id = await cryptoDataService.assetId(symbol);
    const r = (await query(
      `SELECT MIN(ts) AS first_ts, MAX(ts) AS last_ts FROM crypto_candles WHERE asset_id = $1 AND tf = '1d'`, [id])).rows[0];
    const vol = (await query(
      `SELECT COALESCE(AVG(volume), 0) AS v FROM (SELECT volume FROM crypto_candles WHERE asset_id = $1 AND tf = '1d' ORDER BY ts DESC LIMIT 90) t`, [id])).rows[0].v;
    const stable = (await query('SELECT stable FROM crypto_assets WHERE id = $1', [id])).rows[0].stable;
    await query(`UPDATE crypto_assets SET first_candle_at = $2, last_candle_at = $3, liquidity_tier = $4, updated_at = NOW() WHERE id = $1`,
      [id, r.first_ts, r.last_ts, liquidityTierFor(Number(vol), stable)]);
  },

  // ── Lecture (TOUJOURS bornée par la date simulée du joueur) ──────────────────────────────────────────
  async listAssets(nowMs: number, opts: { q?: string; category?: string; sort?: string } = {}) {
    const rows = (await query(
      `SELECT a.id, a.symbol, a.name, a.category, a.risk, a.stable, a.synthetic, a.liquidity_tier, a.collapse_date, a.collapse_title,
              l.c AS last_c, l.ts AS last_ts, l.volume AS last_vol, l.market_cap AS last_mc,
              p1.c AS c_1d, p7.c AS c_7d, p30.c AS c_30d, m.ath, m.atl
       FROM crypto_assets a
       JOIN LATERAL (SELECT ts, c, volume, market_cap FROM crypto_candles WHERE asset_id = a.id AND tf = '1d' AND ts <= to_timestamp(($1::float8 - 86400000) / 1000.0) ORDER BY ts DESC LIMIT 1) l ON TRUE
       LEFT JOIN LATERAL (SELECT c FROM crypto_candles WHERE asset_id = a.id AND tf = '1d' AND ts <= l.ts - INTERVAL '1 day' ORDER BY ts DESC LIMIT 1) p1 ON TRUE
       LEFT JOIN LATERAL (SELECT c FROM crypto_candles WHERE asset_id = a.id AND tf = '1d' AND ts <= l.ts - INTERVAL '7 days' ORDER BY ts DESC LIMIT 1) p7 ON TRUE
       LEFT JOIN LATERAL (SELECT c FROM crypto_candles WHERE asset_id = a.id AND tf = '1d' AND ts <= l.ts - INTERVAL '30 days' ORDER BY ts DESC LIMIT 1) p30 ON TRUE
       LEFT JOIN LATERAL (SELECT MAX(h) AS ath, MIN(l) AS atl FROM crypto_candles WHERE asset_id = a.id AND tf = '1d' AND ts <= l.ts) m ON TRUE`, [nowMs])).rows;
    const pct = (a: number, b: number | null) => (b && b > 0 ? Math.round(((a / b) - 1) * 10000) / 100 : null);
    let out = rows.map((r: any) => {
      const collapsed = r.collapse_date && new Date(r.collapse_date).getTime() <= nowMs;
      return {
        symbol: r.symbol, name: r.name, category: r.category, risk: r.risk, stable: r.stable, synthetic: r.synthetic, liquidityTier: r.liquidity_tier,
        price: r.last_c, change1d: pct(r.last_c, r.c_1d), change7d: pct(r.last_c, r.c_7d), change30d: pct(r.last_c, r.c_30d),
        volume24h: Math.round(r.last_vol), marketCap: r.last_mc ? Math.round(r.last_mc) : null, allTimeHigh: r.ath, allTimeLow: r.atl,
        collapsed: !!collapsed, collapseTitle: collapsed ? r.collapse_title : null, priceAt: new Date(r.last_ts).getTime() + DAY,
        // Plus aucune cotation depuis plus de 7 jours à cette date (actif disparu ou données interrompues) : dernier cours connu conservé.
        stale: nowMs - new Date(r.last_ts).getTime() > 7 * DAY,
      };
    });
    if (opts.q) { const q = opts.q.toLowerCase(); out = out.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)); }
    if (opts.category) out = out.filter((a) => a.category === opts.category);
    const sorters: Record<string, (a: any, b: any) => number> = {
      marketCap: (a, b) => (b.marketCap ?? b.volume24h) - (a.marketCap ?? a.volume24h), volume: (a, b) => b.volume24h - a.volume24h,
      change1d: (a, b) => (b.change1d ?? -1e9) - (a.change1d ?? -1e9), change30d: (a, b) => (b.change30d ?? -1e9) - (a.change30d ?? -1e9), name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    };
    out.sort(sorters[opts.sort ?? 'marketCap'] ?? sorters.marketCap);
    return out;
  },

  // Dernier cours CONNU à la date simulée (clôture de la dernière bougie journalière terminée). Null = pas encore coté (ou aucune donnée).
  async priceAt(assetId: number, nowMs: number): Promise<{ price: number; at: number } | null> {
    const r = (await query(`SELECT ts, c FROM crypto_candles WHERE asset_id = $1 AND tf = '1d' AND ts <= to_timestamp(($2::float8 - 86400000) / 1000.0) ORDER BY ts DESC LIMIT 1`, [assetId, nowMs])).rows[0];
    return r ? { price: r.c, at: new Date(r.ts).getTime() + DAY } : null;
  },

  async getAsset(symbol: string, nowMs: number) {
    const list = await cryptoDataService.listAssets(nowMs);
    const a = list.find((x) => x.symbol === symbol);
    if (!a) throw new CryptoDataError('NOT_FOUND', 'Actif introuvable ou pas encore coté à cette date');
    const db = (await query('SELECT description, category, collapse_date, collapse_title, collapse_explanation, launch_hint, first_candle_at FROM crypto_assets WHERE symbol = $1', [symbol])).rows[0];
    const collapsed = db.collapse_date && new Date(db.collapse_date).getTime() <= nowMs;
    return {
      ...a, description: db.description, launchHint: db.launch_hint,
      listedSince: db.first_candle_at ? new Date(db.first_candle_at).toISOString().slice(0, 10) : null,
      // L'explication d'une faillite n'est révélée qu'APRÈS la date de l'événement (sinon on préviendrait le joueur).
      collapse: collapsed ? { date: new Date(db.collapse_date).toISOString().slice(0, 10), title: db.collapse_title, explanation: db.collapse_explanation } : null,
    };
  },

  // Bougies d'une unité de temps, par lots (plus récentes d'abord dans la base, renvoyées par ordre chronologique), jamais au-delà de `nowMs`.
  async getCandles(symbol: string, tf: Timeframe, nowMs: number, opts: { before?: number; limit?: number } = {}) {
    const limit = Math.min(CANDLES.maxLimit, Math.max(1, Math.trunc(opts.limit ?? CANDLES.defaultLimit)));
    const assetId = await cryptoDataService.assetId(symbol);
    const base = BASE_OF[tf];
    const ratio = base === tf ? 1 : tf === '1M' ? 31 : tf === '1w' ? 7 : tf === '4h' ? 4 : tf === '15m' ? 15 : 5;
    const latestVisible = nowMs - BASE_MS[base];
    const before = opts.before !== undefined ? Math.min(opts.before, nowMs) : nowMs;
    const fetchN = limit * ratio + ratio;
    const rows = (await query(
      `SELECT ts, o, h, l, c, volume, market_cap FROM crypto_candles WHERE asset_id = $1 AND tf = $2 AND ts <= to_timestamp($3::float8 / 1000.0) AND ts < to_timestamp($4::float8 / 1000.0)
       ORDER BY ts DESC LIMIT $5`, [assetId, base, latestVisible, before, fetchN])).rows.reverse().map(rowToCandle);
    let agg = aggregate(rows, tf, nowMs);
    const moreInDb = rows.length === fetchN;
    if (moreInDb && ratio > 1 && agg.length) agg = agg.slice(1);          // la plus ancienne unité peut être tronquée par la limite : on l'écarte
    const hasMore = moreInDb;
    if (agg.length > limit) agg = agg.slice(agg.length - limit);
    return { symbol, tf, candles: agg, hasMore, nextBefore: agg.length ? agg[0].ts : null, serverTime: nowMs };
  },

  // Résolutions réellement disponibles pour un actif à cette date (selon ce qui a été importé).
  async availableTimeframes(symbol: string, nowMs: number): Promise<Timeframe[]> {
    const assetId = await cryptoDataService.assetId(symbol);
    const rows = (await query(`SELECT DISTINCT tf FROM crypto_candles WHERE asset_id = $1 AND ts <= to_timestamp(($2::float8 - 60000) / 1000.0)`, [assetId, nowMs])).rows.map((r: any) => r.tf);
    const out: Timeframe[] = [];
    if (rows.includes('1m')) out.push('1m', '5m', '15m');
    if (rows.includes('1h')) out.push('1h', '4h');
    if (rows.includes('1d')) out.push('1d', '1w', '1M');
    return out;
  },
};

