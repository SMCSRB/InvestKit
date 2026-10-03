import { round2, assertNonNegative, assertPositiveInt, EngineInputError } from './money';
import { computeAcquisition, AcquisitionBudget, NotaryFeeRule, PropertyAge } from './acquisition';
import { buildSchedule, computeTaegPct, LoanFees, LoanSchedule, totalUpfrontFees } from './loan';
import { assessLoanApplication, Assessment, BankRules, Household } from './affordability';

// ─────────────────────────────────────────────────────────────────────────
// ÉVALUATION D'UN ACHAT : budget, prêt, TAEG, décision de la banque.
// Fonction PURE, utilisée à l'identique par l'aperçu, par l'achat réel (côté
// serveur) et par les tests : une seule source de vérité.
// ─────────────────────────────────────────────────────────────────────────
export interface PurchaseInput {
  household: Household;
  price: number;
  age: PropertyAge;
  works: number;                 // travaux financés
  projectedMonthlyRent: number;  // loyer prévisionnel du bien (retenu selon BankRules.projectRentWeight)
  downPayment: number;           // apport (€)
  loanMonths: number;
  annualRatePct: number;
  insuranceRatePct: number;
  notaryRule: NotaryFeeRule;
  bankRules: BankRules;
  loanFees: (principal: number) => number; // frais de dossier
  freeCoinsAfter?: number;       // pièces libres (non empruntées) après l'achat, pour la règle de réserve
}

export interface PurchaseEvaluation {
  budget: AcquisitionBudget;
  downPayment: number;
  principal: number;
  schedule: LoanSchedule | null; // null si achat comptant
  monthlyPaymentWithInsurance: number;
  upfrontFees: number;
  taegPct: number | null;
  assessment: Assessment;
  approved: boolean;
}

export const evaluatePurchase = (input: PurchaseInput): PurchaseEvaluation => {
  assertNonNegative(input.price, 'price');
  assertNonNegative(input.works, 'works');
  assertNonNegative(input.downPayment, 'downPayment');
  assertPositiveInt(input.loanMonths, 'loanMonths');

  const budget = computeAcquisition({ price: input.price, age: input.age, works: input.works, notaryRule: input.notaryRule });
  if (input.downPayment > budget.totalCost) {
    throw new EngineInputError(`L'apport (${input.downPayment} €) dépasse le coût total de l'achat (${budget.totalCost} €)`);
  }
  const principal = round2(budget.totalCost - input.downPayment);

  let schedule: LoanSchedule | null = null;
  let taegPct: number | null = null;
  let upfront = 0;
  if (principal > 0) {
    const fees: LoanFees = { applicationFee: input.loanFees(principal) };
    upfront = totalUpfrontFees(fees);
    const loan = {
      principal,
      annualRatePct: input.annualRatePct,
      months: input.loanMonths,
      insurance: { annualRatePct: input.insuranceRatePct, basis: 'initial' as const },
    };
    schedule = buildSchedule(loan);
    taegPct = computeTaegPct(loan, fees);
  }
  const payment = schedule ? schedule.monthlyPaymentWithInsurance : 0;

  const assessment = assessLoanApplication(input.household, payment, input.bankRules, input.projectedMonthlyRent, {
    price: input.price,
    freeCoinsAfter: input.freeCoinsAfter,
    downPayment: input.downPayment,
    notaryFees: budget.notaryFees,
    loanMonths: input.loanMonths,
    loanPrincipal: principal,
    works: input.works,
  });

  return {
    budget,
    downPayment: round2(input.downPayment),
    principal,
    schedule,
    monthlyPaymentWithInsurance: payment,
    upfrontFees: upfront,
    taegPct,
    assessment,
    approved: assessment.decision === 'approved',
  };
};
