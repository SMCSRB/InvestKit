import { BaseTimeframe, Timeframe, TF_MS, BASE_OF } from '../../config/cryptoMarketRules';

// Bougies et agrégation. Toutes les heures sont en UTC (millisecondes depuis 1970).
export interface Candle { ts: number; o: number; h: number; l: number; c: number; volume: number; marketCap?: number | null; partial?: boolean }

const DAY = 86_400_000;
export const BASE_MS: Record<BaseTimeframe, number> = { '1m': 60_000, '1h': 3_600_000, '1d': DAY };

// Début de la bougie d'unité `tf` qui contient `ts` : semaine = lundi 00:00 UTC ; mois = 1er du mois 00:00 UTC.
export const bucketStart = (ts: number, tf: Timeframe): number => {
  if (tf === '1M') { const d = new Date(ts); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); }
  if (tf === '1w') { const off = 4 * DAY; return Math.floor((ts - off) / TF_MS['1w']) * TF_MS['1w'] + off; }   // 1er janvier 1970 = jeudi
  const ms = TF_MS[tf];
  return Math.floor(ts / ms) * ms;
};

export const bucketEnd = (start: number, tf: Timeframe): number => {
  if (tf === '1M') { const d = new Date(start); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); }
  return start + TF_MS[tf];
};

// RÈGLE ANTI-TRICHE : une bougie de base n'est utilisable que si elle est TERMINÉE à la date simulée.
export const isBaseVisible = (ts: number, base: BaseTimeframe, nowMs: number): boolean => ts + BASE_MS[base] <= nowMs;

export const visibleBase = (candles: Candle[], base: BaseTimeframe, nowMs: number): Candle[] => candles.filter((c) => isBaseVisible(c.ts, base, nowMs));

// Agrège des bougies de base (triées par date croissante) vers l'unité `tf`. La dernière bougie est marquée `partial`
// tant que l'unité n'est pas terminée à `nowMs` ; elle n'est construite qu'avec des bougies de base déjà visibles.
export const aggregate = (base: Candle[], tf: Timeframe, nowMs: number): Candle[] => {
  if (BASE_OF[tf] === tf) return base.map((c) => ({ ...c, partial: false }));
  return rollup(base, tf, nowMs);
};

// Regroupe TOUJOURS des bougies plus fines en bougies d'unité `tf` (sans court-circuit) : ex. 24 bougies horaires → 1 bougie journalière.
export const rollup = (base: Candle[], tf: Timeframe, nowMs: number): Candle[] => {
  const out: Candle[] = [];
  let cur: Candle | null = null, curEnd = 0;
  for (const c of base) {
    const start = bucketStart(c.ts, tf);
    if (!cur || start !== cur.ts) {
      if (cur) out.push(cur);
      cur = { ts: start, o: c.o, h: c.h, l: c.l, c: c.c, volume: c.volume, marketCap: c.marketCap ?? null };
      curEnd = bucketEnd(start, tf);
    } else {
      cur.h = Math.max(cur.h, c.h); cur.l = Math.min(cur.l, c.l); cur.c = c.c; cur.volume += c.volume;
      if (c.marketCap != null) cur.marketCap = c.marketCap;
    }
    cur.partial = curEnd > nowMs;
  }
  if (cur) out.push(cur);
  for (const c of out) c.partial = bucketEnd(c.ts, tf) > nowMs;
  return out;
};

// Bougie valide : valeurs finies, h ≥ max(o, c, l), l ≤ min(o, c, h), prix > 0 (un cours peut être très proche de 0 mais pas négatif), volume ≥ 0.
export const isValidCandle = (c: Candle): boolean => {
  const nums = [c.o, c.h, c.l, c.c, c.volume];
  if (!nums.every((x) => typeof x === 'number' && Number.isFinite(x))) return false;
  if (c.o < 0 || c.h < 0 || c.l < 0 || c.c < 0 || c.volume < 0) return false;
  const eps = 1e-12 + Math.max(c.h, 1e-12) * 1e-9;
  return c.h + eps >= Math.max(c.o, c.c, c.l) && c.l - eps <= Math.min(c.o, c.c, c.h);
};

// Nombre de trous (unités manquantes entre deux bougies consécutives) : signalé à l'import, jamais comblé par des données inventées.
export const countGaps = (sorted: Candle[], base: BaseTimeframe): number => {
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) gaps += Math.max(0, Math.round((sorted[i].ts - sorted[i - 1].ts) / BASE_MS[base]) - 1);
  return gaps;
};
