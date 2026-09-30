import { round2, assertNonNegative, safeDiv, EngineInputError } from './money';

// ─────────────────────────────────────────────────────────────────────────
// INDICATEURS D'UN BIEN LOCATIF
//
// Divergence assumée avec le simulateur d'investissement de référence : ce
// dernier appelait « rendement brut » un loyer DÉJÀ diminué de la vacance. Ici :
//   rendement brut = loyer potentiel annuel (12 × loyer)   / coût total
//   rendement net  = (loyers encaissés − charges)          / coût total
// avec  loyers encaissés = 12 × loyer × taux d'occupation.
// Un indicateur non calculable (division par 0) vaut null, jamais Infinity/NaN
// ni un code magique comme « 999 ans ».
// ─────────────────────────────────────────────────────────────────────────
export interface PropertyEconomicsInput {
  totalInvestment: number;       // prix + frais + travaux
  loanPrincipal: number;         // capital emprunté
  monthlyRent: number;           // loyer mensuel charges non comprises, bien loué
  occupancyPct: number;          // 0–100
  annualCharges: number;         // copro non récupérable, taxe foncière, assurance PNO, entretien, gestion
  monthlyLoanPayment: number;    // mensualité assurance comprise
}

export interface PropertyIndicators {
  potentialAnnualRent: number;
  collectedAnnualRent: number;
  grossYieldPct: number | null;
  netYieldPct: number | null;
  monthlyCashFlow: number;
  annualCashFlow: number;
  downPayment: number;
  cashOnCashPct: number | null;   // cash-flow annuel / apport
  paybackYears: number | null;    // apport / cash-flow annuel (null si cash-flow ≤ 0)
  ltvPct: number | null;          // capital emprunté / coût total
  chargesRatioPct: number | null; // charges / loyers encaissés
  breakevenOccupancyPct: number | null; // occupation minimale pour cash-flow ≥ 0 (peut dépasser 100)
}

const pct = (v: number | null): number | null => (v === null ? null : Math.round(v * 100 * 100) / 100);

export const computeIndicators = (input: PropertyEconomicsInput): PropertyIndicators => {
  assertNonNegative(input.totalInvestment, 'totalInvestment');
  assertNonNegative(input.loanPrincipal, 'loanPrincipal');
  assertNonNegative(input.monthlyRent, 'monthlyRent');
  assertNonNegative(input.annualCharges, 'annualCharges');
  assertNonNegative(input.monthlyLoanPayment, 'monthlyLoanPayment');
  if (input.occupancyPct < 0 || input.occupancyPct > 100 || !Number.isFinite(input.occupancyPct)) {
    throw new EngineInputError('occupancyPct doit être entre 0 et 100');
  }

  const potential = input.monthlyRent * 12;
  const collected = potential * (input.occupancyPct / 100);
  const monthlyCashFlow = collected / 12 - input.annualCharges / 12 - input.monthlyLoanPayment;
  const annualCashFlow = monthlyCashFlow * 12;
  const downPayment = Math.max(0, input.totalInvestment - input.loanPrincipal);

  return {
    potentialAnnualRent: round2(potential),
    collectedAnnualRent: round2(collected),
    grossYieldPct: pct(safeDiv(potential, input.totalInvestment)),
    netYieldPct: pct(safeDiv(collected - input.annualCharges, input.totalInvestment)),
    monthlyCashFlow: round2(monthlyCashFlow),
    annualCashFlow: round2(annualCashFlow),
    downPayment: round2(downPayment),
    cashOnCashPct: pct(safeDiv(annualCashFlow, downPayment)),
    paybackYears: annualCashFlow > 0 && downPayment > 0
      ? Math.round((downPayment / annualCashFlow) * 10) / 10
      : null,
    ltvPct: pct(safeDiv(input.loanPrincipal, input.totalInvestment)),
    chargesRatioPct: pct(safeDiv(input.annualCharges, collected)),
    breakevenOccupancyPct: pct(safeDiv(input.annualCharges / 12 + input.monthlyLoanPayment, input.monthlyRent)),
  };
};
