// Taxe foncière RÉELLE d'une annonce : taux communal (Terralyse) × base cadastrale ESTIMÉE (valeur de jeu, identique partout, signalée). Fonctions pures. Aucun taux = aucune estimation : la taxe reste une valeur de jeu marquée.
// PRÉPARATION (PR 4 sur 6 du branchement) : appelée seulement par le service des annonces réelles (désactivé) et la décoration d'annonce quand un taux est fourni.
import { propertyTaxEstimate, TaxRatePoint } from './propertyTax';
import { PROPERTY_TAX_ATTRIBUTION, CADASTRAL_BASE_NET_EUR_PER_SQM } from '../../config/propertyTaxRules';
import type { TaxSource } from './dataSources';

export interface ListingTax { annualEur: number; source: Extract<TaxSource, { kind: 'terralyse' }> }

export const listingTaxFrom = (surfaceSqm: number, rate: TaxRatePoint, communeLabel: string): ListingTax => {
  if (!(surfaceSqm > 0) || !Number.isFinite(surfaceSqm)) throw new Error('Surface invalide.');
  const e = propertyTaxEstimate(surfaceSqm, rate);
  return { annualEur: e.annualEur, source: { kind: 'terralyse', communeLabel, ratePct: rate.ratePct, rateYear: rate.year, baseEstimated: true, baseNetEurPerSqm: CADASTRAL_BASE_NET_EUR_PER_SQM, attribution: PROPERTY_TAX_ATTRIBUTION } };
};

// Applique la taxe réelle à une annonce (seule la taxe foncière change ; les autres charges restent des valeurs de jeu).
export const withRealTax = <L extends { annualCharges: { propertyTax: number } }>(l: L, tax: ListingTax | null): L =>
  (tax ? { ...l, annualCharges: { ...l.annualCharges, propertyTax: tax.annualEur } } : l);
