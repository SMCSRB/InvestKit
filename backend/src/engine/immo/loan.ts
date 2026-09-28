import { round2, assertNonNegative, assertPositiveInt, assertFinite, EngineInputError } from './money';

// ─────────────────────────────────────────────────────────────────────────
// PRÊT IMMOBILIER
//
// Mensualité (annuité constante), i = taux annuel / 12 :
//     M = P × i / (1 − (1 + i)^−n)          si i > 0
//     M = P / n                              si i = 0   (cas limite : pas de division par 0)
//
// Chaque échéance est arrondie au centime ; la DERNIÈRE échéance absorbe les
// écarts d'arrondi pour que le capital restant dû finisse exactement à 0.
//
// ASSURANCE : elle est comptée UNE SEULE FOIS, comme une ligne séparée de la
// mensualité (jamais ajoutée au taux du prêt en plus). Le simulateur bancaire
// de référence l'ajoutait au taux ET la recomptait à part : double comptage,
// corrigé ici.
//   - base 'initial'   : taux × capital emprunté / 12 (constante, cas courant)
//   - base 'remaining' : taux × capital restant dû / 12 (décroissante)
//
// DIFFÉRÉ PARTIEL : pendant `deferralMonths`, seuls les intérêts (et
// l'assurance) sont payés ; le capital est ensuite amorti sur `months`.
// ─────────────────────────────────────────────────────────────────────────

export interface LoanInput {
  principal: number;       // capital emprunté (€)
  annualRatePct: number;   // taux nominal annuel hors assurance (%)
  months: number;          // durée d'amortissement (mois, entier ≥ 1)
  deferralMonths?: number; // différé partiel (mois, défaut 0)
  insurance?: {
    annualRatePct: number; // % par an
    basis: 'initial' | 'remaining';
  };
}

export interface LoanRow {
  month: number;
  payment: number;        // échéance hors assurance
  interest: number;
  principal: number;      // capital remboursé ce mois-ci
  insurance: number;
  totalPayment: number;   // payment + insurance
  balanceAfter: number;
}

export interface LoanSchedule {
  rows: LoanRow[];
  monthlyPayment: number;          // mensualité hors assurance (régime normal)
  monthlyPaymentWithInsurance: number; // 1re mensualité d'amortissement, assurance incluse
  totalInterest: number;
  totalInsurance: number;
  totalPaid: number;               // somme des échéances, assurance incluse
}

const validate = (input: LoanInput): void => {
  assertNonNegative(input.principal, 'principal');
  assertNonNegative(input.annualRatePct, 'annualRatePct');
  assertPositiveInt(input.months, 'months');
  if (input.deferralMonths !== undefined) {
    assertNonNegative(input.deferralMonths, 'deferralMonths');
    if (!Number.isInteger(input.deferralMonths)) throw new EngineInputError('deferralMonths doit être un entier');
  }
  if (input.insurance) assertNonNegative(input.insurance.annualRatePct, 'insurance.annualRatePct');
  if (input.annualRatePct > 100) throw new EngineInputError('annualRatePct > 100 % : valeur irréaliste');
};

export const computeMonthlyPayment = (principal: number, annualRatePct: number, months: number): number => {
  assertNonNegative(principal, 'principal');
  assertNonNegative(annualRatePct, 'annualRatePct');
  assertPositiveInt(months, 'months');
  if (principal === 0) return 0;
  const i = annualRatePct / 100 / 12;
  if (i === 0) return round2(principal / months);
  return round2((principal * i) / (1 - Math.pow(1 + i, -months)));
};

export const buildSchedule = (input: LoanInput): LoanSchedule => {
  validate(input);
  const { principal, annualRatePct, months } = input;
  const deferral = input.deferralMonths ?? 0;
  const i = annualRatePct / 100 / 12;
  const insRate = (input.insurance?.annualRatePct ?? 0) / 100 / 12;
  const insBasis = input.insurance?.basis ?? 'initial';
  const level = computeMonthlyPayment(principal, annualRatePct, months);

  const rows: LoanRow[] = [];
  let balance = round2(principal);
  let totalInterest = 0;
  let totalInsurance = 0;
  let totalPaid = 0;

  for (let m = 1; m <= deferral + months; m++) {
    const interest = round2(balance * i);
    const insurance = round2((insBasis === 'initial' ? principal : balance) * insRate);
    let principalPart: number;
    let payment: number;

    if (m <= deferral) {
      principalPart = 0;
      payment = interest;
    } else if (m === deferral + months) {
      // Dernière échéance : solde exactement le capital restant.
      principalPart = balance;
      payment = round2(balance + interest);
    } else {
      payment = level;
      principalPart = round2(Math.min(balance, level - interest));
      // Garde-fou : un taux 0 avec arrondis ne doit jamais rendre un capital négatif.
      if (principalPart < 0) principalPart = 0;
    }

    balance = round2(balance - principalPart);
    const totalPayment = round2(payment + insurance);
    rows.push({ month: m, payment, interest, principal: principalPart, insurance, totalPayment, balanceAfter: balance });
    totalInterest += interest;
    totalInsurance += insurance;
    totalPaid += totalPayment;
  }

  const firstAmort = rows[deferral];
  return {
    rows,
    monthlyPayment: level,
    monthlyPaymentWithInsurance: round2(firstAmort.payment + firstAmort.insurance),
    totalInterest: round2(totalInterest),
    totalInsurance: round2(totalInsurance),
    totalPaid: round2(totalPaid),
  };
};

// ─────────────────────────────────────────────────────────────────────────
// TAEG (taux annuel effectif global)
//
// Le TAEG est le taux qui égalise, actualisé, ce que l'emprunteur REÇOIT
// réellement et ce qu'il PAIE :
//     (capital − frais payés au départ) = Σ  échéance_k / (1 + r)^k
// où échéance_k inclut l'assurance et r est le taux MENSUEL cherché.
// TAEG = (1 + r)^12 − 1.
//
// Conséquences vérifiables : sans frais ni assurance, le TAEG est le taux
// annuel équivalent au taux nominal ((1 + nominal/12)^12 − 1, un peu plus haut
// que le nominal) ; chaque frais ou assurance le fait monter ; à 0 % sans
// frais il vaut 0. Résolution par bissection (robuste, sans dérivée).
// ─────────────────────────────────────────────────────────────────────────
export interface LoanFees {
  applicationFee?: number; // frais de dossier
  guaranteeFee?: number;   // garantie (caution / hypothèque)
  otherUpfront?: number;
}

export const totalUpfrontFees = (fees?: LoanFees): number =>
  round2((fees?.applicationFee ?? 0) + (fees?.guaranteeFee ?? 0) + (fees?.otherUpfront ?? 0));

export const computeTaegPct = (input: LoanInput, fees?: LoanFees): number => {
  const schedule = buildSchedule(input);
  const upfront = totalUpfrontFees(fees);
  assertFinite(upfront, 'frais');
  if (input.principal <= 0) return 0;
  const received = input.principal - upfront;
  if (received <= 0) throw new EngineInputError('Les frais dépassent le capital emprunté');

  const npv = (r: number): number => {
    let pv = 0;
    let factor = 1;
    for (const row of schedule.rows) {
      factor *= 1 + r;
      pv += row.totalPayment / factor;
    }
    return pv - received;
  };

  // npv est décroissante en r. Bornes : de −50 %/mois à +100 %/mois.
  let lo = -0.5;
  let hi = 1;
  if (npv(lo) < 0) return 0; // cas dégénéré : on ne rembourse pas plus que reçu
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  const monthly = (lo + hi) / 2;
  const taeg = (Math.pow(1 + monthly, 12) - 1) * 100;
  return Math.round(taeg * 1e4) / 1e4;
};

// Coût total du crédit = intérêts + assurance + frais de départ.
export const totalCreditCost = (schedule: LoanSchedule, fees?: LoanFees): number =>
  round2(schedule.totalInterest + schedule.totalInsurance + totalUpfrontFees(fees));
