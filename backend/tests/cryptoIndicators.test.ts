import { describe, it, expect } from 'vitest';
// @ts-ignore — module ESM du frontend, fonctions pures
import { sma, ema, bollinger, rsi, macd, computeIndicator, toPoints } from '../../app/lib/indicators.js';

const close = (a: (number | null)[], b: (number | null)[], eps = 1e-9) => {
  expect(a.length).toBe(b.length);
  a.forEach((x, i) => (b[i] === null ? expect(x, `i=${i}`).toBeNull() : expect(x as number, `i=${i}`).toBeCloseTo(b[i] as number, 6)));
};

describe('indicateurs techniques', () => {
  it('SMA : valeurs connues et préchauffage', () => {
    close(sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
    close(sma([10], 3), [null]);
  });
  it('EMA : amorcée par la SMA, formule k = 2/(p+1)', () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    close(e, [null, null, 2, 3, 4]);   // suite linéaire : EMA de pas 1 → 3 puis 4 (k=0,5)
    const f = ema([2, 4, 6, 8, 20], 3);
    expect(f[2]).toBeCloseTo(4, 9);
    expect(f[3]).toBeCloseTo(6, 9);
    expect(f[4]).toBeCloseTo(13, 9);
  });
  it('Bollinger : bandes = SMA ± m × écart-type (population)', () => {
    const b = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);   // exemple classique : moyenne 5, écart-type 2
    expect(b.mid[7]).toBeCloseTo(5, 9);
    expect(b.upper[7]).toBeCloseTo(9, 9);
    expect(b.lower[7]).toBeCloseTo(1, 9);
    expect(b.mid[6]).toBeNull();
  });
  it('RSI de Wilder : 100 sans baisse, 0 sans hausse, valeur de référence', () => {
    const up = rsi(Array.from({ length: 30 }, (_, i) => i + 1), 14);
    expect(up[14]).toBe(100);
    const down = rsi(Array.from({ length: 30 }, (_, i) => 100 - i), 14);
    expect(down[29]).toBeCloseTo(0, 9);
    // Exemple de la littérature (Wilder / StockCharts), période 14 : premier RSI ≈ 70,46
    const px = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];
    expect(rsi(px, 14)[14]).toBeCloseTo(70.46, 1);
    expect(rsi(px, 14)[13]).toBeNull();
  });
  it('MACD : ligne = EMA12 − EMA26, signal = EMA9 du MACD, histogramme = différence', () => {
    const v = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 5) * 10 + i * 0.3);
    const m = macd(v, 12, 26, 9);
    const e12 = ema(v, 12), e26 = ema(v, 26);
    expect(m.macd[24]).toBeNull();
    expect(m.macd[25]).toBeCloseTo(e12[25]! - e26[25]!, 9);
    expect(m.signal[32]).toBeNull();
    expect(m.signal[33]).not.toBeNull();
    expect(m.hist[60]).toBeCloseTo(m.macd[60]! - m.signal[60]!, 9);
  });
  it('paramètres invalides : repli sur les valeurs par défaut, jamais de plantage', () => {
    expect(() => sma([1, 2, 3], 0)).not.toThrow();
    expect(() => macd([1, 2, 3], 26, 12, -1)).not.toThrow();
    const m = macd(Array.from({ length: 60 }, (_, i) => i), 26, 12, 9);   // rapide ≥ lente : corrigé
    expect(m.macd.some((x: number | null) => x !== null)).toBe(true);
  });
  it('computeIndicator : points horodatés en secondes, valeurs absentes sautées', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({ ts: 1_600_000_000_000 + i * 86_400_000, o: i, h: i + 1, l: i - 1, c: i, volume: 10 + i }));
    const r = computeIndicator(candles, { type: 'sma', params: { period: 5 } });
    expect(r.lines[0].points.length).toBe(26);
    expect(r.lines[0].points[0].time).toBe(1_600_000_000 + 4 * 86_400);
    expect(computeIndicator(candles, { type: 'bollinger', params: {} }).lines.length).toBe(3);
    expect(computeIndicator(candles, { type: 'inconnu', params: {} }).lines).toEqual([]);
    expect(toPoints(candles, candles.map(() => null))).toEqual([]);
  });
});
