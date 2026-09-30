import { ASSET_CLASSES, AssetClass, CLASS_LABELS, STRESS_SCENARIOS } from '../../config/riskRules';
import { normalizeAllocation } from './allocation';

// Test de résistance : que serait devenu ce portefeuille pendant chacune des crises historiques ? (chute pic → creux)
export interface StressResult {
  id: string; label: string; period: string; description: string;
  lossPct: number;            // chute du portefeuille (négative), en %
  lossAmount: number | null;  // en valeur si un capital est fourni
  estimated: boolean;         // une partie du résultat repose sur une valeur estimée ou déduite
  recoveryMonths: number | null;  // durée indicative pour retrouver le sommet (moyenne pondérée), si connue
  contributions: { cls: AssetClass; label: string; weightPct: number; shockPct: number; contributionPct: number; estimated: boolean }[];
}

export const stressTest = (allocationRaw: unknown, capital?: number): { capital: number | null; results: StressResult[]; worst: StressResult } => {
  const w = normalizeAllocation(allocationRaw);
  const results: StressResult[] = STRESS_SCENARIOS.map((s) => {
    let loss = 0, est = false, recNum = 0, recDen = 0, recKnown = true;
    const contributions = ASSET_CLASSES.filter((c) => w[c] > 0).map((c) => {
      const shock = s.shocks[c];
      const contribution = w[c] * shock.pct;
      loss += contribution;
      if (shock.estimated) est = true;
      if (shock.pct < 0) { if (shock.recoveryMonths === undefined) recKnown = false; else { recNum += w[c] * -shock.pct * shock.recoveryMonths; recDen += w[c] * -shock.pct; } }
      return { cls: c, label: CLASS_LABELS[c], weightPct: round1(w[c] * 100), shockPct: shock.pct, contributionPct: round1(contribution), estimated: !!shock.estimated };
    });
    return {
      id: s.id, label: s.label, period: s.period, description: s.description,
      lossPct: round1(loss), lossAmount: capital === undefined ? null : Math.round((capital * loss) / 100),
      estimated: est, recoveryMonths: loss < 0 && recKnown && recDen > 0 ? Math.round(recNum / recDen) : null, contributions,
    };
  });
  const worst = results.reduce((a, b) => (b.lossPct < a.lossPct ? b : a));
  return { capital: capital ?? null, results, worst };
};

const round1 = (x: number) => Math.round(x * 10) / 10;
