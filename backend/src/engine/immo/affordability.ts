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
//   - reste à vivre < seuil du profil          → REFUSÉ (plus de « caution » : un dossier fragile est refusé net)
//   - apport < frais de notaire + part du prix  → REFUSÉ (règle française : on n'emprunte pas les frais de notaire)
//   - réserve de sécurité insuffisante          → REFUSÉ (il faut garder de quoi payer quelques mensualités)
//   - sinon                                   → ACCORDÉ
// Chaque décision renvoie la liste des RAISONS chiffrées, pour l'expliquer.
// ─────────────────────────────────────────────────────────────────────────
// Profil du joueur : fixe son seuil de reste à vivre (voir config/immoRules.ts).
export type ProfileId = 'student' | 'employee' | 'executive';

export interface Household {
  profile: ProfileId;
  // Prévus pour plus tard (calcul par foyer) : pas encore utilisés tant que les
  // majorations par adulte/enfant valent 0 dans la configuration.
  adults?: number;   // nombre d'adultes du foyer (défaut 1)
  children?: number; // nombre d'enfants à charge (défaut 0)
  salary: number;          // revenus d'activité nets mensuels
  otherIncome?: number;
  existingRentalIncome?: number; // loyers déjà perçus (mensuels)
  existingDebtPayments?: number; // mensualités de crédits en cours
  livingCharges?: number;        // charges courantes hors crédits (loyer, pensions...)
}

export interface BankRules {
  maxDebtRatioPct: number;         // 35 dans le simulateur de référence
  // Seuil de reste à vivre par profil (€/mois).
  livingRemainingByProfile: Record<ProfileId, number>;
  // Majorations du seuil pour un foyer plus grand (0 = désactivé pour l'instant).
  livingRemainingPerExtraAdult: number;
  livingRemainingPerChild: number;
  rentalIncomeWeight: number;      // part des loyers existants retenue (0,7 = 70 %)
  // Apport minimum exigé, en % des frais de notaire (100 = l'apport doit couvrir au moins les frais de notaire).
  minDownPaymentPctOfNotaryFees: number;
  // … PLUS une part du prix du bien (10 = 10 % du prix, en plus des frais de notaire).
  minDownPaymentPctOfPrice: number;
  // Réserve de sécurité : nombre de mensualités (assurance comprise, tous prêts confondus) à garder en pièces libres APRÈS l'opération. 0 = désactivée.
  reserveMonthlyPayments: number;
  // Durée maximale d'un prêt, en mois (25 ans = 300). Exceptions éventuelles : voir maxLoanMonthsWithWorks.
  maxLoanMonths: number;
  // Durée maximale pour un achat avec travaux importants (0 = pas d'exception).
  maxLoanMonthsWithWorks: number;
  // Travaux "importants" : part minimale des travaux dans le montant emprunté (%).
  majorWorksMinPctOfLoan: number;
  projectRentWeight: number;       // part du loyer futur du bien retenue (0 = prudent)
}

export type Decision = 'approved' | 'refused';

export interface Reason {
  code: 'DEBT_RATIO_TOO_HIGH' | 'LIVING_REMAINING_LOW' | 'NO_INCOME' | 'DOWN_PAYMENT_TOO_LOW' | 'LOAN_TERM_TOO_LONG' | 'RESERVE_TOO_LOW' | 'OK';
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

// Seuil de reste à vivre applicable à ce foyer. Aujourd'hui : seul le profil
// compte. Pour activer le calcul par foyer, il suffit de donner une valeur
// non nulle aux deux majorations dans la configuration.
export const livingRemainingFloor = (household: Household, rules: BankRules): number => {
  const base = rules.livingRemainingByProfile[household.profile];
  if (base === undefined) throw new EngineInputError(`Profil inconnu : ${household.profile}`);
  const extraAdults = Math.max(0, (household.adults ?? 1) - 1);
  const children = Math.max(0, household.children ?? 0);
  return round2(base + extraAdults * rules.livingRemainingPerExtraAdult + children * rules.livingRemainingPerChild);
};

// Éléments propres à l'achat : apport, frais de notaire, durée, travaux, prêt.
export interface PurchaseContext {
  price: number;          // prix du bien (hors frais)
  downPayment: number;    // apport (en pièces)
  notaryFees: number;     // frais de notaire
  // Pièces libres (non empruntées) qu'il restera après l'opération. Absent = règle de réserve non évaluée.
  freeCoinsAfter?: number;
  unpaidPersonalLoan?: number;   // capital restant dû d'un prêt personnel (ne compte pas dans la réserve) : sert à expliquer le refus
  loanMonths: number;     // durée demandée
  loanPrincipal: number;  // montant emprunté (€)
  works: number;          // travaux financés (€)
}

export const assessLoanApplication = (
  household: Household,
  newMonthlyPaymentWithInsurance: number,
  rules: BankRules,
  projectMonthlyRent = 0,
  purchase?: PurchaseContext
): Assessment => {
  assertNonNegative(household.salary, 'salary');
  assertNonNegative(newMonthlyPaymentWithInsurance, 'newMonthlyPaymentWithInsurance');
  assertNonNegative(projectMonthlyRent, 'projectMonthlyRent');
  if (rules.maxDebtRatioPct <= 0 || rules.maxDebtRatioPct > 100) throw new EngineInputError('maxDebtRatioPct invalide');

  const minLivingRemaining = livingRemainingFloor(household, rules);
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
        `Mensualité maximale acceptable : ${maxMonthlyPayment.toFixed(0)} InvestCoins (assurance comprise).`,
      value: Math.round(debtRatioPct * 100) / 100,
      limit: rules.maxDebtRatioPct,
    });
  }

  if (livingRemaining < minLivingRemaining) {
    decision = 'refused';
    // Mensualité la plus haute qui laisserait le reste à vivre exigé.
    const maxForLiving = round2(Math.max(0, countedIncome - existingDebt - charges - minLivingRemaining));
    reasons.push({
      code: 'LIVING_REMAINING_LOW',
      message: `Reste à vivre insuffisant : il te resterait ${livingRemaining.toFixed(0)} InvestCoins par mois, la banque exige au moins ${minLivingRemaining} (profil ${household.profile}). ` +
        `Mensualité maximale compatible : ${maxForLiving.toFixed(0)} InvestCoins (assurance comprise).`,
      value: livingRemaining,
      limit: minLivingRemaining,
    });
  }

  if (purchase) {
    const requiredNotary = round2((purchase.notaryFees * rules.minDownPaymentPctOfNotaryFees) / 100);
    const requiredShare = round2((purchase.price * rules.minDownPaymentPctOfPrice) / 100);
    const requiredDownPayment = round2(requiredNotary + requiredShare);
    if (purchase.downPayment < requiredDownPayment) {
      decision = 'refused';
      reasons.push({
        code: 'DOWN_PAYMENT_TOO_LOW',
        message: `Apport insuffisant : ${purchase.downPayment.toFixed(0)} InvestCoins proposés, la banque exige au moins ${requiredDownPayment.toFixed(0)} ` +
          `(${requiredNotary.toFixed(0)} de frais de notaire + ${requiredShare.toFixed(0)}, soit ${rules.minDownPaymentPctOfPrice} % du prix). ` +
          `Il te manque ${(requiredDownPayment - purchase.downPayment).toFixed(0)} InvestCoins.`,
        value: purchase.downPayment,
        limit: requiredDownPayment,
      });
    }
    if (rules.reserveMonthlyPayments > 0 && purchase.freeCoinsAfter !== undefined) {
      const requiredReserve = round2((existingDebt + newMonthlyPaymentWithInsurance) * rules.reserveMonthlyPayments);
      if (purchase.freeCoinsAfter < requiredReserve) {
        decision = 'refused';
        reasons.push({
          code: 'RESERVE_TOO_LOW',
          message: `Réserve de sécurité insuffisante : après cet achat il te resterait ${Math.max(0, purchase.freeCoinsAfter).toFixed(0)} InvestCoins à toi, ` +
            `la banque veut que tu gardes ${rules.reserveMonthlyPayments} mensualités (${requiredReserve.toFixed(0)} InvestCoins). ` +
            `Il te manque ${(requiredReserve - Math.max(0, purchase.freeCoinsAfter)).toFixed(0)} InvestCoins.` +
            ((purchase.unpaidPersonalLoan ?? 0) > 0 ? ` Les pièces d'un prêt personnel non remboursé (${purchase.unpaidPersonalLoan!.toFixed(0)} InvestCoins restant dus) ne comptent pas dans la réserve : une banque ne prend pas un prêt récent pour de l'épargne.` : ''),
          value: purchase.freeCoinsAfter,
          limit: requiredReserve,
        });
      }
    }
    const majorWorks = rules.maxLoanMonthsWithWorks > 0 && purchase.loanPrincipal > 0 &&
      (purchase.works / purchase.loanPrincipal) * 100 >= rules.majorWorksMinPctOfLoan;
    const maxMonths = majorWorks ? rules.maxLoanMonthsWithWorks : rules.maxLoanMonths;
    if (purchase.loanMonths > maxMonths) {
      decision = 'refused';
      reasons.push({
        code: 'LOAN_TERM_TOO_LONG',
        message: `Durée de ${purchase.loanMonths / 12} ans trop longue : la banque plafonne à ${maxMonths / 12} ans` +
          (majorWorks ? ' (exception travaux importants).' : '.'),
        value: purchase.loanMonths,
        limit: maxMonths,
      });
    }
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
