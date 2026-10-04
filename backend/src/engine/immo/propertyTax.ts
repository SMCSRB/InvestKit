// Fonctions pures de la taxe foncière : taux en vigueur à une date (aucun futur, constant entre deux années) et estimation de la taxe d'un bien. Aucune base, aucun réseau.
import { CADASTRAL_BASE_NET_EUR_PER_SQM, TAX_RATE_USABLE_FROM } from '../../config/propertyTaxRules';

export interface TaxRatePoint { year: number; ratePct: number }

export const rateUsableOn = (year: number): string => `${year}-${TAX_RATE_USABLE_FROM}`;

// Taux de la dernière année dont la date d'usage est atteinte ; null avant la première année importée (on n'invente rien).
export const taxRateAt = (series: readonly TaxRatePoint[], day: string): TaxRatePoint | null => {
  let best: TaxRatePoint | null = null;
  for (const p of series) if (rateUsableOn(p.year) <= day && (!best || p.year > best.year)) best = p;
  return best;
};

export interface PropertyTaxEstimate { annualEur: number; ratePct: number; rateYear: number; baseNetEur: number; baseEstimated: true }

// Taxe annuelle estimée = base nette ESTIMÉE × taux. `baseEstimated` vaut toujours true : l'écran doit le dire.
export const propertyTaxEstimate = (surfaceSqm: number, rate: TaxRatePoint, baseNetPerSqm: number = CADASTRAL_BASE_NET_EUR_PER_SQM): PropertyTaxEstimate => {
  const baseNetEur = Math.round(surfaceSqm * baseNetPerSqm);
  return { annualEur: Math.round(baseNetEur * rate.ratePct / 100), ratePct: rate.ratePct, rateYear: rate.year, baseNetEur, baseEstimated: true };
};
