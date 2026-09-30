import { RISK_RULES } from '../../config/riskRules';

// Simulation Monte Carlo d'un plan d'épargne / d'investissement : des milliers de trajectoires aléatoires, puis les percentiles
// (P10 = scénario défavorable, P50 = médian, P90 = scénario favorable).
// Modèle : rendements MENSUELS log-normaux (mouvement brownien géométrique) calibrés pour que le rendement annuel MOYEN soit celui demandé,
// frais de gestion prélevés chaque mois, versements mensuels (éventuellement revalorisés chaque année).
// Déterministe : même entrées + même graine = même résultat (pas de scintillement d'une fois sur l'autre).

export class RiskInputError extends Error { constructor(message: string) { super(message); this.name = 'RiskInputError'; } }

export interface MonteCarloInput {
  initial: number;            // capital de départ
  monthly: number;            // versement mensuel
  years: number;              // durée (1 à 60)
  annualReturnPct: number;    // rendement annuel moyen attendu (%)
  annualVolPct: number;       // volatilité annuelle (%)
  feesPct?: number;           // frais annuels (%)
  contributionGrowthPct?: number; // revalorisation annuelle des versements (%)
  inflationPct?: number;      // inflation annuelle (%) pour la valeur réelle
  paths?: number;             // nombre de trajectoires
  seed?: number;
}

export interface MonteCarloResult {
  years: number[];
  p10: number[]; p50: number[]; p90: number[];
  contributions: number[];
  final: { p5: number; p10: number; p50: number; p90: number; p95: number; mean: number; contributions: number };
  probLoss: number;           // probabilité que la valeur finale soit inférieure à ce qui a été versé
  probBeatInflation: number;  // probabilité que la valeur finale réelle (pouvoir d'achat) dépasse ce qui a été versé
  paths: number; seed: number;
}

// Générateur pseudo-aléatoire déterministe (mulberry32) + loi normale (Box-Muller).
export const makeRng = (seed: number) => {
  let a = seed >>> 0;
  const uniform = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const normal = (): number => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = uniform();
    const v = uniform();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  return { uniform, normal };
};

export const percentile = (sortedAsc: number[], p: number): number => {
  if (sortedAsc.length === 0) return NaN;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
};

const num = (v: unknown, name: string, min: number, max: number, def?: number): number => {
  const x = v === undefined || v === null ? def : v;
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new RiskInputError(`${name} : nombre requis`);
  if (x < min || x > max) throw new RiskInputError(`${name} : doit être entre ${min} et ${max}`);
  return x;
};

export const validateMonteCarlo = (raw: any): Required<MonteCarloInput> => {
  const i = raw ?? {};
  const years = num(i.years, 'Durée (années)', 1, RISK_RULES.monteCarlo.maxYears);
  if (!Number.isInteger(years)) throw new RiskInputError('Durée (années) : entier requis');
  const paths = num(i.paths, 'Nombre de trajectoires', 100, RISK_RULES.monteCarlo.maxPaths, RISK_RULES.monteCarlo.defaultPaths);
  if (!Number.isInteger(paths)) throw new RiskInputError('Nombre de trajectoires : entier requis');
  const seedRaw = i.seed === undefined || i.seed === null ? undefined : num(i.seed, 'Graine', 0, 4294967295);
  const out = {
    initial: num(i.initial, 'Capital de départ', 0, 1e8, 0),
    monthly: num(i.monthly, 'Versement mensuel', 0, 1e6, 0),
    years, paths,
    annualReturnPct: num(i.annualReturnPct, 'Rendement annuel (%)', -20, 40),
    annualVolPct: num(i.annualVolPct, 'Volatilité annuelle (%)', 0, 150),
    feesPct: num(i.feesPct, 'Frais annuels (%)', 0, 5, 0),
    contributionGrowthPct: num(i.contributionGrowthPct, 'Revalorisation des versements (%)', 0, 20, 0),
    inflationPct: num(i.inflationPct, 'Inflation (%)', -5, 20, 2),
    seed: 0,
  };
  if (out.initial === 0 && out.monthly === 0) throw new RiskInputError('Il faut un capital de départ ou un versement mensuel');
  // Graine par défaut : empreinte des paramètres (mêmes entrées = même résultat).
  const key = JSON.stringify([out.initial, out.monthly, out.years, out.annualReturnPct, out.annualVolPct, out.feesPct, out.contributionGrowthPct, out.inflationPct, out.paths]);
  let h = 2166136261; for (let k = 0; k < key.length; k++) { h ^= key.charCodeAt(k); h = Math.imul(h, 16777619); }
  out.seed = seedRaw ?? (h >>> 0);
  return out;
};

export const simulateMonteCarlo = (raw: MonteCarloInput): MonteCarloResult => {
  const inp = validateMonteCarlo(raw);
  const months = inp.years * 12;
  const sigmaM = inp.annualVolPct / 100 / Math.sqrt(12);
  // Dérive logarithmique : E[exp(rendement mensuel)] = (1 + r)^(1/12) − frais → rendement arithmétique moyen conforme à la demande.
  const meanM = Math.pow(1 + inp.annualReturnPct / 100, 1 / 12);
  const muLog = Math.log(meanM) - (sigmaM * sigmaM) / 2;
  const feeM = inp.feesPct / 100 / 12;
  const growthM = Math.pow(1 + inp.contributionGrowthPct / 100, 1 / 12);
  const rng = makeRng(inp.seed);

  const atYear: number[][] = Array.from({ length: inp.years + 1 }, () => new Array(inp.paths));
  const contributions: number[] = new Array(inp.years + 1).fill(0);
  {
    let c = inp.initial, m = inp.monthly; contributions[0] = c;
    for (let t = 1; t <= months; t++) { c += m; m *= growthM; if (t % 12 === 0) contributions[t / 12] = c; }
  }

  for (let p = 0; p < inp.paths; p++) {
    let v = inp.initial, m = inp.monthly;
    atYear[0][p] = v;
    for (let t = 1; t <= months; t++) {
      const ret = Math.exp(muLog + sigmaM * rng.normal());
      v = v * ret * (1 - feeM) + m;
      m *= growthM;
      if (t % 12 === 0) atYear[t / 12][p] = v;
    }
  }

  const p10: number[] = [], p50: number[] = [], p90: number[] = [];
  for (let y = 0; y <= inp.years; y++) {
    const s = atYear[y].slice().sort((a, b) => a - b);
    p10.push(percentile(s, 0.1)); p50.push(percentile(s, 0.5)); p90.push(percentile(s, 0.9));
  }
  const last = atYear[inp.years].slice().sort((a, b) => a - b);
  const totalIn = contributions[inp.years];
  const deflator = Math.pow(1 + inp.inflationPct / 100, inp.years);
  let loss = 0, beat = 0, sum = 0;
  for (const v of last) { sum += v; if (v < totalIn) loss++; if (v / deflator >= totalIn) beat++; }
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    years: Array.from({ length: inp.years + 1 }, (_, i) => i),
    p10: p10.map(r2), p50: p50.map(r2), p90: p90.map(r2),
    contributions: contributions.map(r2),
    final: { p5: r2(percentile(last, 0.05)), p10: r2(percentile(last, 0.1)), p50: r2(percentile(last, 0.5)), p90: r2(percentile(last, 0.9)), p95: r2(percentile(last, 0.95)), mean: r2(sum / last.length), contributions: r2(totalIn) },
    probLoss: Math.round((loss / last.length) * 1000) / 1000,
    probBeatInflation: Math.round((beat / last.length) * 1000) / 1000,
    paths: inp.paths, seed: inp.seed,
  };
};
