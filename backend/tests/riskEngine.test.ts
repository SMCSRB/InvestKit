import { describe, it, expect } from 'vitest';
import { simulateMonteCarlo, validateMonteCarlo, RiskInputError, makeRng, percentile, normalizeAllocation, stressTest, riskScore, portfolioVolPct, pearson, annualReturns, correlationMatrix } from '../src/engine/risk';
import { STRESS_SCENARIOS, RISK_RULES, ASSET_CLASSES } from '../src/config/riskRules';

const base = { initial: 10000, monthly: 200, years: 15, annualReturnPct: 7, annualVolPct: 15, paths: 3000, seed: 42 };

describe('Monte Carlo', () => {
  it('générateur : déterministe, loi normale centrée réduite', () => {
    const a = makeRng(1), b = makeRng(1);
    expect(a.uniform()).toBe(b.uniform());
    const r = makeRng(7); const xs = Array.from({ length: 20000 }, () => r.normal());
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length; const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
  });
  it('percentile : interpolation', () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
  });
  it('sans volatilité : résultat exact (capitalisation mensuelle) et P10 = P50 = P90', () => {
    const r = simulateMonteCarlo({ initial: 1000, monthly: 100, years: 10, annualReturnPct: 6, annualVolPct: 0, paths: 100, seed: 1 });
    let v = 1000; const m = Math.pow(1.06, 1 / 12);
    for (let t = 0; t < 120; t++) v = v * m + 100;
    expect(r.final.p50).toBeCloseTo(v, 1);
    expect(r.final.p10).toBeCloseTo(r.final.p90, 6);
    expect(r.final.contributions).toBe(1000 + 120 * 100);
    expect(r.probLoss).toBe(0);
  });
  it('percentiles ordonnés, trajectoire des versements exacte, déterminisme', () => {
    const r = simulateMonteCarlo(base);
    for (let i = 0; i <= base.years; i++) { expect(r.p10[i]).toBeLessThanOrEqual(r.p50[i]); expect(r.p50[i]).toBeLessThanOrEqual(r.p90[i]); }
    expect(r.years).toHaveLength(base.years + 1);
    expect(r.contributions[0]).toBe(10000);
    expect(r.contributions[base.years]).toBe(10000 + 200 * 12 * 15);
    expect(simulateMonteCarlo(base)).toEqual(r);
    expect(simulateMonteCarlo({ ...base, seed: 43 }).final.p50).not.toBe(r.final.p50);
  });
  it('la moyenne des trajectoires reste proche du rendement attendu (calibrage du modèle)', () => {
    const r = simulateMonteCarlo({ ...base, paths: 10000, seed: 5 });
    const m = Math.pow(1.07, 1 / 12); let v = 10000; for (let t = 0; t < 180; t++) v = v * m + 200;
    expect(Math.abs(r.final.mean - v) / v).toBeLessThan(0.03);
    expect(r.final.p50).toBeLessThan(r.final.mean);   // asymétrie log-normale : médiane < moyenne
  });
  it('plus de volatilité = éventail plus large ; plus de rendement = résultats plus hauts ; frais = résultats plus bas', () => {
    const lo = simulateMonteCarlo({ ...base, annualVolPct: 5 }), hi = simulateMonteCarlo({ ...base, annualVolPct: 30 });
    expect(hi.final.p90 - hi.final.p10).toBeGreaterThan((lo.final.p90 - lo.final.p10) * 2);
    expect(simulateMonteCarlo({ ...base, annualReturnPct: 9 }).final.p50).toBeGreaterThan(simulateMonteCarlo(base).final.p50);
    expect(simulateMonteCarlo({ ...base, feesPct: 2 }).final.p50).toBeLessThan(simulateMonteCarlo(base).final.p50);
    expect(simulateMonteCarlo({ ...base, contributionGrowthPct: 3 }).final.contributions).toBeGreaterThan(simulateMonteCarlo(base).final.contributions);
  });
  it('probabilités : perte quasi certaine si rendement négatif, rare si rendement positif et durée longue ; inflation', () => {
    expect(simulateMonteCarlo({ ...base, annualReturnPct: -5, annualVolPct: 10 }).probLoss).toBeGreaterThan(0.95);
    expect(simulateMonteCarlo({ ...base, annualReturnPct: 8, annualVolPct: 12, years: 25 }).probLoss).toBeLessThan(0.05);
    const a = simulateMonteCarlo({ ...base, inflationPct: 0 }), b = simulateMonteCarlo({ ...base, inflationPct: 6 });
    expect(b.probBeatInflation).toBeLessThanOrEqual(a.probBeatInflation);
  });
  it('validation stricte', () => {
    for (const bad of [{ ...base, years: 0 }, { ...base, years: 61 }, { ...base, years: 2.5 }, { ...base, annualVolPct: -1 }, { ...base, annualVolPct: 500 },
      { ...base, annualReturnPct: 'x' }, { ...base, initial: 0, monthly: 0 }, { ...base, paths: 10 }, { ...base, paths: 100000 }, { ...base, initial: -5 }, { ...base, seed: -1 },
      { ...base, initial: NaN }, null, undefined]) {
      expect(() => validateMonteCarlo(bad as any), JSON.stringify(bad)).toThrow(RiskInputError);
    }
  });
});

describe('allocation et tests de résistance', () => {
  it('normalisation : pourcentages ou montants, classes inconnues et valeurs invalides refusées', () => {
    const w = normalizeAllocation({ equity_world: 60, bonds: 40 });
    expect(w.equity_world).toBeCloseTo(0.6); expect(w.bonds).toBeCloseTo(0.4); expect(w.crypto).toBe(0);
    expect(normalizeAllocation({ cash: 5000 }).cash).toBe(1);
    for (const bad of [{}, null, [], { actions: 10 }, { cash: -1 }, { cash: 'a' }, { cash: 0 }, { cash: Infinity }]) expect(() => normalizeAllocation(bad as any)).toThrow(RiskInputError);
  });
  it('100 % actions internationales : retrouve les chutes sourcées (−57 % en 2008, −49 % en 2000, −34 % en 2020, −25 % en 2022)', () => {
    const r = stressTest({ equity_world: 100 }, 10000);
    const by = Object.fromEntries(r.results.map((x) => [x.id, x]));
    expect(by.gfc_2008.lossPct).toBe(-57); expect(by.dotcom_2000.lossPct).toBe(-49); expect(by.covid_2020.lossPct).toBe(-34); expect(by.inflation_2022.lossPct).toBe(-25);
    expect(by.gfc_2008.lossAmount).toBe(-5700);
    expect(r.worst.id).toBe('gfc_2008');
    expect(by.gfc_2008.recoveryMonths).toBe(60);
  });
  it('mélange : perte pondérée, liquidités protègent, obligations ne protègent pas en 2022 ; bitcoin −84 % en 2018', () => {
    const mix = stressTest({ equity_world: 50, cash: 50 }).results.find((x) => x.id === 'gfc_2008')!;
    expect(mix.lossPct).toBe(-28.5);
    expect(stressTest({ cash: 100 }).worst.lossPct).toBe(0);
    const bonds2022 = stressTest({ equity_world: 50, bonds: 50 }).results.find((x) => x.id === 'inflation_2022')!;
    expect(bonds2022.lossPct).toBeLessThan(stressTest({ equity_world: 50, cash: 50 }).results.find((x) => x.id === 'inflation_2022')!.lossPct);
    expect(stressTest({ crypto: 100 }).results.find((x) => x.id === 'crypto_winter_2018')!.lossPct).toBe(-84);
    expect(stressTest({ crypto: 100 }).results.find((x) => x.id === 'crypto_winter_2018')!.estimated).toBe(false);
    expect(mix.estimated).toBe(false);                                     // actions + liquidités en 2008 : que des valeurs sourcées
    expect(stressTest({ bonds: 100 }).results[0].estimated).toBe(true);     // obligations : valeur estimée, signalée
  });
  it('chaque scénario couvre chaque classe d\'actifs', () => {
    for (const s of STRESS_SCENARIOS) for (const c of ASSET_CLASSES) expect(s.shocks[c], `${s.id}/${c}`).toBeDefined();
  });
});

describe('score de risque décomposé', () => {
  it('poids des facteurs = 1 ; score borné ; facteurs expliqués', () => {
    expect(Object.values(RISK_RULES.scoreWeights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    const s = riskScore({ allocation: { equity_world: 70, bonds: 30 }, horizonYears: 15 });
    expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(100);
    expect(s.factors.map((f) => f.key)).toEqual(['volatility', 'drawdown', 'concentration', 'crypto', 'leverage', 'horizon']);
    for (const f of s.factors) { expect(f.explanation.length).toBeGreaterThan(20); expect(f.score).toBeGreaterThanOrEqual(0); expect(f.score).toBeLessThanOrEqual(100); }
    expect(Math.round(s.factors.reduce((a, f) => a + f.score * f.weight, 0))).toBe(s.score);
  });
  it('tout en liquidités = score minimal ; tout en crypto et endetté = score maximal ; ordre cohérent', () => {
    const cash = riskScore({ allocation: { cash: 1 }, horizonYears: 10 });
    const wild = riskScore({ allocation: { crypto: 1 }, horizonYears: 1, leverage: 2 });
    expect(cash.score).toBeLessThan(5); expect(cash.label).toBe('Prudent');
    expect(wild.score).toBeGreaterThan(80); expect(wild.label).toBe('Élevé');
    const balanced = riskScore({ allocation: { equity_world: 50, bonds: 40, cash: 10 } }).score;
    const aggressive = riskScore({ allocation: { equity_world: 70, crypto: 30 } }).score;
    expect(cash.score).toBeLessThan(balanced); expect(balanced).toBeLessThan(aggressive); expect(aggressive).toBeLessThan(wild.score);
  });
  it('monotonie : plus de crypto, plus de dette, horizon plus court, plus de concentration = score plus haut', () => {
    const s = (o: any) => riskScore({ allocation: { equity_world: 60, bonds: 40 }, ...o }).score;
    expect(riskScore({ allocation: { equity_world: 60, bonds: 30, crypto: 10 } }).score).toBeGreaterThan(s({}));
    expect(s({ leverage: 1 })).toBeGreaterThan(s({}));
    expect(s({ horizonYears: 1 })).toBeGreaterThan(s({ horizonYears: 15 }));
    expect(s({ assets: [{ name: 'LVMH', weight: 90 }, { name: 'TTE', weight: 10 }] })).toBeGreaterThan(s({ assets: [{ name: 'A', weight: 25 }, { name: 'B', weight: 25 }, { name: 'C', weight: 25 }, { name: 'D', weight: 25 }] }));
  });
  it('volatilité du portefeuille : diversification (corrélation < 1) la réduit ; validation', () => {
    const w = (o: any) => normalizeAllocation(o);
    expect(portfolioVolPct(w({ equity_world: 100 }))).toBeCloseTo(16, 5);
    expect(portfolioVolPct(w({ equity_world: 50, bonds: 50 }))).toBeLessThan(16 * 0.5 + 6 * 0.5);
    expect(() => riskScore({ allocation: { cash: 1 }, horizonYears: -1 })).toThrow(RiskInputError);
    expect(() => riskScore({ allocation: { cash: 1 }, leverage: -1 })).toThrow(RiskInputError);
  });
});

describe('corrélations', () => {
  it('Pearson : parfaite, inverse, nulle, données insuffisantes ou constantes', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });
  it('rendements annuels et matrice symétrique, diagonale = 1, années communes seulement', () => {
    expect(annualReturns({ 2010: 100, 2011: 110, 2012: 99 })).toEqual({ 2011: expect.closeTo(0.1, 10), 2012: expect.closeTo(-0.1, 10) });
    const a = { 2011: 0.1, 2012: -0.05, 2013: 0.2, 2014: 0.03 }, b = { 2012: -0.1, 2013: 0.3, 2014: 0.05, 2015: 0.4 }, c = { 2015: 0.1 };
    const m = correlationMatrix({ A: a, B: b, C: c });
    expect(m.matrix[0][0]).toBe(1);
    expect(m.matrix[0][1]).toBe(m.matrix[1][0]);
    expect(m.overlap[0][1]).toBe(3);
    expect(m.matrix[0][2]).toBeNull();
    expect(m.matrix[0][1]).toBeGreaterThan(0.9);
  });
});
