import { cryptoDataService } from './dataService';
import { Timeframe } from '../../config/cryptoMarketRules';

// Comparaison de 2 à 4 actifs : séries rebasées à 100 sur leur première date commune (visible). Toujours bornée par la date simulée.
export const compareAssets = async (symbols: string[], tf: Timeframe, nowMs: number, limit: number) => {
  const sets = await Promise.all(symbols.map((s) => cryptoDataService.getCandles(s, tf, nowMs, { limit })));
  const maps = sets.map((r) => new Map(r.candles.map((c) => [c.ts, c.c])));
  const common = [...maps[0].keys()].filter((t) => maps.every((m) => m.has(t))).sort((a, b) => a - b);
  if (common.length < 2) return { tf, symbols, points: [] as { ts: number }[], series: symbols.map((s) => ({ symbol: s, values: [] as number[] })), note: 'Pas assez de dates communes entre ces actifs.' };
  const series = symbols.map((s, i) => ({ symbol: s, values: common.map((t) => Math.round((maps[i].get(t)! / maps[i].get(common[0])!) * 10000) / 100) }));
  return { tf, symbols, points: common.map((ts) => ({ ts })), series, note: null as string | null };
};
