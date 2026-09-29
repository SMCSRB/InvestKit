import { BankInputError } from './schedule';

// Garantie d'un prêt sur portefeuille : chaque titre compte pour sa valeur × un pourcentage propre à sa classe.
export interface CollateralItem { value: number; ltv: { max: number; call: number; liquidation: number } }
export interface CollateralLimits { value: number; maxLimit: number; callLimit: number; liquidationLimit: number }

const r2 = (x: number): number => Math.round(x * 100) / 100;

export const collateralLimits = (items: CollateralItem[]): CollateralLimits => {
  let value = 0, maxLimit = 0, callLimit = 0, liquidationLimit = 0;
  for (const it of items) {
    if (!Number.isFinite(it.value) || it.value < 0) throw new BankInputError('Valeur de titre invalide');
    value += it.value; maxLimit += (it.value * it.ltv.max) / 100; callLimit += (it.value * it.ltv.call) / 100; liquidationLimit += (it.value * it.ltv.liquidation) / 100;
  }
  return { value: r2(value), maxLimit: r2(maxLimit), callLimit: r2(callLimit), liquidationLimit: r2(liquidationLimit) };
};

export type MarginState = 'ok' | 'call' | 'liquidation';
// État de la garantie : au-delà du seuil de liquidation → vente forcée ; au-delà du seuil d'appel → appel de marge.
export const marginState = (debt: number, l: CollateralLimits): MarginState =>
  debt <= 0 ? 'ok' : debt > l.liquidationLimit ? 'liquidation' : debt > l.callLimit ? 'call' : 'ok';

export const ltvPct = (debt: number, value: number): number => (value <= 0 ? (debt > 0 ? 999 : 0) : Math.round((debt / value) * 10000) / 100);

// Fraction du portefeuille à vendre (proportionnellement, décote comprise) pour ramener la dette sous le plafond à l'ouverture.
// Vendre f : produit P = f·V·(1−h) sert à rembourser ; il faut D − P ≤ M·(1−f), soit f = (D − M) / (V(1−h) − M).
// Si le dénominateur est ≤ 0 (la vente ne suffit jamais), on vend tout (1).
export const liquidationFraction = (debt: number, value: number, maxLimit: number, haircutPct: number): number => {
  if (debt <= maxLimit) return 0;
  const den = value * (1 - haircutPct / 100) - maxLimit;
  if (den <= 0) return 1;
  return Math.min(1, Math.max(0, (debt - maxLimit) / den));
};
