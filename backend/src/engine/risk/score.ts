import { ASSET_CLASSES, AssetClass, CLASS_LABELS, RISK_RULES } from '../../config/riskRules';
import { normalizeAllocation } from './allocation';
import { stressTest } from './stress';
import { RiskInputError } from './monteCarlo';

// Score de risque (0 = très prudent, 100 = très risqué) DÉCOMPOSÉ en facteurs, chacun avec son explication en français simple.
export interface RiskFactor { key: string; label: string; score: number; weight: number; contribution: number; value: string; explanation: string; advice: string | null }
export interface RiskScore { score: number; label: string; factors: RiskFactor[]; portfolioVolPct: number; worstStress: { id: string; label: string; lossPct: number } }

export interface RiskScoreInput {
  allocation: unknown;
  assets?: { name: string; weight: number }[];   // positions individuelles (pour la concentration)
  horizonYears?: number;                          // durée avant d'avoir besoin de l'argent
  leverage?: number;                              // dette / capital propre (0 = pas de dette)
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
const round = (x: number) => Math.round(x);

export const portfolioVolPct = (w: Record<AssetClass, number>): number => {
  const vol = RISK_RULES.annualVolPct;
  const rho = (a: AssetClass, b: AssetClass): number => (a === b ? 1 : (RISK_RULES.correlation[a]?.[b] ?? RISK_RULES.correlation[b]?.[a] ?? 0));
  let variance = 0;
  for (const a of ASSET_CLASSES) for (const b of ASSET_CLASSES) variance += w[a] * w[b] * vol[a] * vol[b] * rho(a, b);
  return Math.sqrt(Math.max(0, variance));
};

export const riskScore = (input: RiskScoreInput): RiskScore => {
  const w = normalizeAllocation(input.allocation);
  const horizon = input.horizonYears === undefined ? 10 : input.horizonYears;
  if (typeof horizon !== 'number' || !Number.isFinite(horizon) || horizon < 0 || horizon > 80) throw new RiskInputError('Horizon : nombre d\'années entre 0 et 80');
  const leverage = input.leverage === undefined ? 0 : input.leverage;
  if (typeof leverage !== 'number' || !Number.isFinite(leverage) || leverage < 0 || leverage > 50) throw new RiskInputError('Levier : nombre entre 0 et 50');

  const vol = portfolioVolPct(w);
  const stress = stressTest(w);
  const worstLoss = -stress.worst.lossPct;

  // Concentration : poids de la plus grosse ligne (positions individuelles si fournies, sinon classe la plus lourde).
  let top = Math.max(...ASSET_CLASSES.map((c) => w[c]));
  let topName = CLASS_LABELS[ASSET_CLASSES.reduce((a, b) => (w[b] > w[a] ? b : a))];
  if (input.assets?.length) {
    const tot = input.assets.reduce((s, a) => s + (Number.isFinite(a.weight) && a.weight > 0 ? a.weight : 0), 0);
    if (tot > 0) { const best = input.assets.reduce((a, b) => (b.weight > a.weight ? b : a)); top = best.weight / tot; topName = best.name; }
  }
  const cashWeight = w.cash;
  const concentrationScore = clamp(((top - 0.25) / 0.75) * 100 * (1 - cashWeight));   // 25 % ou moins dans une ligne = 0 ; 100 % = 100
  const volScore = clamp((vol / 30) * 100);
  const ddScore = clamp((worstLoss / 50) * 100);
  const cryptoScore = clamp((w.crypto / 0.5) * 100);
  const levScore = clamp(((leverage - 0) / 2) * 100);                                   // levier ×3 (dette = 2 × capital) = 100
  const horizonScore = clamp(volScore * (1 - Math.min(horizon, 10) / 10));             // beaucoup de risque sur un horizon court

  const W = RISK_RULES.scoreWeights;
  const mk = (key: string, label: string, score: number, value: string, explanation: string, advice: string | null): RiskFactor =>
    ({ key, label, score: round(score), weight: W[key as keyof typeof W], contribution: Math.round(score * W[key as keyof typeof W] * 10) / 10, value, explanation, advice });

  const factors: RiskFactor[] = [
    mk('volatility', 'Volatilité', volScore, `${vol.toFixed(1)} % par an`,
      'À quel point la valeur du portefeuille monte et descend d\'une année sur l\'autre (estimée d\'après la répartition et la corrélation supposée entre classes).',
      volScore > 60 ? 'Ajouter des obligations ou des liquidités réduit les secousses.' : null),
    mk('drawdown', 'Pire crise historique', ddScore, `−${worstLoss.toFixed(0)} % (${stress.worst.label})`,
      'La plus forte baisse que ce portefeuille aurait subie parmi les crises passées (2000, 2008, 2020, 2022, hiver crypto 2018).',
      ddScore > 60 ? 'Demande-toi si tu supporterais de voir ta valeur fondre de cette proportion sans vendre.' : null),
    mk('concentration', 'Concentration', concentrationScore, `${Math.round(top * 100)} % dans « ${topName} »`,
      'Plus une seule ligne pèse lourd, plus un incident sur elle pèse sur tout.',
      concentrationScore > 50 ? 'Répartir sur plus de lignes ou de classes d\'actifs (diversification).' : null),
    mk('crypto', 'Exposition aux cryptomonnaies', cryptoScore, `${Math.round(w.crypto * 100)} %`,
      'Les cryptomonnaies sont l\'actif le plus volatil (−80 % est déjà arrivé plusieurs fois).',
      cryptoScore > 40 ? 'Garder la part de crypto à un niveau dont la perte totale serait supportable.' : null),
    mk('leverage', 'Endettement (levier)', levScore, leverage > 0 ? `×${(1 + leverage).toFixed(2)}` : 'aucun',
      'Emprunter pour investir amplifie les gains ET les pertes, et peut forcer à vendre au pire moment (appel de marge).',
      levScore > 30 ? 'Réduire la dette diminue fortement le risque de vente forcée.' : null),
    mk('horizon', 'Durée avant d\'avoir besoin de l\'argent', horizonScore, `${horizon} an(s)`,
      'Un portefeuille risqué est supportable sur le long terme (le temps laisse remonter) mais dangereux si l\'argent sera nécessaire bientôt.',
      horizonScore > 40 ? 'Sécuriser progressivement (obligations, liquidités) à l\'approche de l\'échéance.' : null),
  ];
  const score = round(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const label = RISK_RULES.scoreLabels.find((l) => score < l.max)!.label;
  return { score, label, factors, portfolioVolPct: Math.round(vol * 10) / 10, worstStress: { id: stress.worst.id, label: stress.worst.label, lossPct: stress.worst.lossPct } };
};
