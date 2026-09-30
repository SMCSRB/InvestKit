import { round2, assertNonNegative, EngineInputError } from './money';

// ─────────────────────────────────────────────────────────────────────────
// COÛT D'ACQUISITION
//
// Les taux de frais de notaire dépendent de la loi et changent : ils ne sont
// PAS écrits dans le moteur. L'appelant fournit une `NotaryFeeRule` (voir
// config/immoRules.ts, dont les valeurs doivent être vérifiées à la source
// officielle avant mise en production).
// ─────────────────────────────────────────────────────────────────────────
export type PropertyAge = 'old' | 'new'; // ancien / neuf (VEFA ou < 5 ans)

export interface NotaryFeeRule {
  oldRatePct: number; // % du prix, bien ancien
  newRatePct: number; // % du prix, bien neuf
}

export const computeNotaryFees = (price: number, age: PropertyAge, rule: NotaryFeeRule): number => {
  assertNonNegative(price, 'price');
  assertNonNegative(rule.oldRatePct, 'rule.oldRatePct');
  assertNonNegative(rule.newRatePct, 'rule.newRatePct');
  if (age !== 'old' && age !== 'new') throw new EngineInputError(`age invalide : ${age}`);
  return round2((price * (age === 'old' ? rule.oldRatePct : rule.newRatePct)) / 100);
};

export interface AcquisitionInput {
  price: number;          // prix net vendeur
  age: PropertyAge;
  agencyFees?: number;    // honoraires d'agence à la charge de l'acquéreur
  works?: number;         // travaux à financer
  notaryRule: NotaryFeeRule;
}

export interface AcquisitionBudget {
  price: number;
  notaryFees: number;
  agencyFees: number;
  works: number;
  totalCost: number;      // ce qu'il faut réunir au total (hors coût du crédit)
}

export const computeAcquisition = (input: AcquisitionInput): AcquisitionBudget => {
  const notaryFees = computeNotaryFees(input.price, input.age, input.notaryRule);
  const agencyFees = input.agencyFees ?? 0;
  const works = input.works ?? 0;
  assertNonNegative(agencyFees, 'agencyFees');
  assertNonNegative(works, 'works');
  return {
    price: round2(input.price),
    notaryFees,
    agencyFees: round2(agencyFees),
    works: round2(works),
    totalCost: round2(input.price + notaryFees + agencyFees + works),
  };
};

// Montant à emprunter = coût total − apport (jamais négatif).
export const loanNeeded = (totalCost: number, downPayment: number): number => {
  assertNonNegative(totalCost, 'totalCost');
  assertNonNegative(downPayment, 'downPayment');
  return round2(Math.max(0, totalCost - downPayment));
};
