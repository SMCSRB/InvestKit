import { round2, assertNonNegative, assertFinite, safeDiv, EngineInputError } from './money';
import { computeMonthlyPayment } from './loan';

// ─────────────────────────────────────────────────────────────────────────
// CAPACITÉ D'EMPRUNT ET DÉCISION DE LA BANQUE (expliquée)
//
// Taux d'endettement = (mensualités de crédits existants + nouvelle mensualité
//                       assurance comprise) / revenus retenus
// (le simulateur bancaire de référence ne comptait QUE la nouvelle mensualité :
//  les crédits déjà en cours sont ici inclus, c'est le calcul réel d'une banque.)
//
// Reste à vivre = revenus retenus − crédits existants − charges courantes
//                 − nouvelle mensualité
//
// Décision (règles du simulateur de référence, paramétrables) :
//   - taux d'endettement > plafond (35 %)     → REFUSÉ
//   - reste à vivre < seuil (1 200 €)         → ACCORD SOUS RÉSERVE ('caution')
//   - sinon                                   → ACCORDÉ
// Chaque décision renvoie la liste des RAISONS chiffrées, pour l'expliquer.
// ─────────────────────────────────────────────────────────────────────────
export interface Household {
  salary: number;          // revenus d'activité nets mensuels
  otherIncome?: number;
  existingRentalIncome?: number; // loyers déjà perçus (mensuels)
  existingDebtPayments?: number; // mensualités de crédits en cours
  livingCharges?: number;        // charges courantes hors crédits (loyer, pensions...)
}

export interface BankRules {
  maxDebtRatioPct: number;         // 35 dans le simulateur de référence
  minLivingRemaining: number;      // 1 200 € dans le simulateur de référence
  rentalIncomeWeight: number;      // part des loyers existants retenue (1 = 100 %)
  projectRentWeight: number;       // part du loyer futur du bien retenue (0 = prudent)
}

export type Decision = 'approved' | 'caution' | 'refused';

export interface Reason {
  code: 'DEBT_RATIO_TOO_HIGH' | 'LIVING_REMAINING_LOW' | 'NO_INCOME' | 'OK';
  message: string;
  value?: number;
  limit?: number;
}

export interface Assessment {
  decision: Decision;
  countedIncome: number;
  debtRatioPct: number | null;
  livingRemaining: number;
  maxMonthlyPayment: number; // mensualité maximale (assurance incluse) au plafond d'endettement
  reasons: Reason[];
}

export const assessLoanApplication = (
  household: Household,
  newMonthlyPaymentWithInsurance: number,
  rules: BankRules,
  projectMonthlyRent = 0
): Assessment => {
  assertNonNegative(household.salary, 'salary');
  assertNonNegative(newMonthlyPaymentWithInsurance, 'newMonthlyPaymentWithInsurance');
  assertNonNegative(projectMonthlyRent, 'projectMonthlyRent');
  if (rules.maxDebtRatioPct <= 0 || rules.maxDebtRatioPct > 100) throw new EngineInputError('maxDebtRatioPct invalide');

  const existingDebt = household.existingDebtPayments ?? 0;
  const charges = household.livingCharges ?? 0;
  const countedIncome = round2(
    household.salary +
      (household.otherIncome ?? 0) +
      (household.existingRentalIncome ?? 0) * rules.rentalIncomeWeight +
      projectMonthlyRent * rules.projectRentWeight
  );
  assertFinite(countedIncome, 'revenus');

  const totalDebt = existingDebt + newMonthlyPaymentWithInsurance;
  const debtRatioPct = safeDiv(totalDebt * 100, countedIncome);
  const livingRemaining = round2(countedIncome - existingDebt - charges - newMonthlyPaymentWithInsurance);
  const maxMonthlyPayment = round2(Math.max(0, (countedIncome * rules.maxDebtRatioPct) / 100 - existingDebt));

  const reasons: Reason[] = [];
  let decision: Decision = 'approved';

  if (debtRatioPct === null) {
    decision = 'refused';
    reasons.push({ code: 'NO_INCOME', message: 'Aucun revenu retenu : la banque ne peut pas accorder de crédit.' });
  } else if (debtRatioPct > rules.maxDebtRatioPct) {
    decision = 'refused';
    reasons.push({
      code: 'DEBT_RATIO_TOO_HIGH',
      message: `Taux d'endettement de ${debtRatioPct.toFixed(1)} % au-dessus du plafond de ${rules.maxDebtRatioPct} %. ` +
        `Mensualité maximale acceptable : ${maxMonthlyPayment.toFixed(0)} € (assurance comprise).`,
      value: Math.round(debtRatioPct * 100) / 100,
      limit: rules.maxDebtRatioPct,
    });
  }

  if (livingRemaining < rules.minLivingRemaining) {
    if (decision === 'approved') decision = 'caution';
    reasons.push({
      code: 'LIVING_REMAINING_LOW',
      message: `Reste à vivre de ${livingRemaining.toFixed(0)} € sous le seuil de ${rules.minLivingRemaining} €.`,
      value: livingRemaining,
      limit: rules.minLivingRemaining,
    });
  }

  if (reasons.length === 0) {
    reasons.push({ code: 'OK', message: 'Endettement et reste à vivre dans les limites de la banque.' });
  }

  return { decision, countedIncome, debtRatioPct: debtRatioPct === null ? null : Math.round(debtRatioPct * 100) / 100, livingRemaining, maxMonthlyPayment, reasons };
};

// Capital maximal finançable (en euros ENTIERS) pour une mensualité totale
// donnée, assurance sur capital initial comprise. Point de départ analytique
// (inverse de la formule d'annuité), puis ajusté à l'euro près pour garantir
// que la mensualité réellement calculée par buildSchedule ne dépasse JAMAIS
// le plafond (les arrondis au centime pourraient sinon la dépasser).
//   M_total = P × (a + assurance/12)  avec  a = i / (1 − (1 + i)^−n)  (ou 1/n si i = 0)
export const maxPrincipalForPayment = (
  maxTotalPayment: number,
  annualRatePct: number,
  months: number,
  insuranceAnnualPct = 0
): number => {
  assertNonNegative(maxTotalPayment, 'maxTotalPayment');
  assertNonNegative(annualRatePct, 'annualRatePct');
  assertNonNegative(insuranceAnnualPct, 'insuranceAnnualPct');
  if (!Number.isInteger(months) || months < 1) throw new EngineInputError('months doit être un entier ≥ 1');
  const i = annualRatePct / 100 / 12;
  const annuity = i === 0 ? 1 / months : i / (1 - Math.pow(1 + i, -months));
  const factor = annuity + insuranceAnnualPct / 100 / 12;
  const totalPayment = (p: number): number =>
    round2(computeMonthlyPayment(p, annualRatePct, months) + round2((p * insuranceAnnualPct) / 100 / 12));
  let principal = Math.floor(maxTotalPayment / factor);
  while (principal > 0 && totalPayment(principal) > maxTotalPayment) principal -= 1;
  return principal;
};
