// Calculs financiers PURS (aucun accès réseau, aucune horloge) : mensualité, tableau d'amortissement, TAEG, remboursement anticipé, capacité d'emprunt.
// Vérifiés contre le moteur du serveur (backend/src/engine/immo/loan.ts) par backend/tests/simulators.test.ts.
import { SIM_RULES } from './rules.js';

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, num(v, lo)));

// Mensualité d'un prêt à annuités constantes, hors assurance. i = taux annuel / 12.
export const monthlyPayment = (principal, annualRatePct, months) => {
  if (principal <= 0 || months <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  return i === 0 ? principal / months : (principal * i) / (1 - (1 + i) ** -months);
};

// Tableau d'amortissement. Assurance emprunteur comptée UNE fois (ligne séparée) : sur le capital initial ('initial') ou restant dû ('remaining').
// Chaque échéance est arrondie au centime ; la dernière absorbe l'écart pour finir exactement à 0.
export const buildSchedule = ({ principal, annualRatePct, months, insuranceRatePct = 0, insuranceBasis = 'initial' }) => {
  const P = Math.max(0, num(principal)); const n = Math.max(1, Math.round(num(months, 1)));
  const i = num(annualRatePct) / 100 / 12;
  const base = round2(monthlyPayment(P, annualRatePct, n));
  let balance = round2(P);
  const rows = [];
  let totalInterest = 0; let totalInsurance = 0;
  for (let m = 1; m <= n; m += 1) {
    const interest = round2(balance * i);
    let payment = base;
    let principalPart = round2(payment - interest);
    if (m === n || principalPart > balance) { principalPart = balance; payment = round2(principalPart + interest); }
    const insurance = round2(((insuranceBasis === 'remaining' ? balance : P) * num(insuranceRatePct)) / 100 / 12);
    balance = round2(balance - principalPart);
    totalInterest += interest; totalInsurance += insurance;
    rows.push({ month: m, payment, interest, principal: principalPart, insurance, balance });
  }
  return { rows, monthlyPayment: base, totalInterest: round2(totalInterest), totalInsurance: round2(totalInsurance), totalPaid: round2(rows.reduce((a, r) => a + r.payment + r.insurance, 0)) };
};

// Taux de rendement interne (par période) de flux de trésorerie : bissection, robuste.
export const irr = (flows, lo = -0.5, hi = 1) => {
  const npv = (r) => flows.reduce((a, c, t) => a + c / (1 + r) ** t, 0);
  let a = lo; let b = hi; let fa = npv(a); const fb = npv(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return NaN;
  for (let k = 0; k < 200; k += 1) {
    const mid = (a + b) / 2; const fm = npv(mid);
    if (Math.abs(fm) < 1e-9) return mid;
    if (fa * fm < 0) b = mid; else { a = mid; fa = fm; }
  }
  return (a + b) / 2;
};

// TAEG (%) : taux annuel équivalent de l'ensemble des coûts (intérêts + assurance + frais de dossier et de garantie) sur la somme réellement reçue.
export const taegPct = ({ principal, annualRatePct, months, insuranceRatePct = 0, insuranceBasis = 'initial', upfrontFees = 0 }) => {
  const s = buildSchedule({ principal, annualRatePct, months, insuranceRatePct, insuranceBasis });
  const flows = [principal - upfrontFees, ...s.rows.map((r) => -(r.payment + r.insurance))];
  const monthly = irr(flows);
  return Number.isFinite(monthly) ? ((1 + monthly) ** 12 - 1) * 100 : NaN;
};

// Coût total du crédit = intérêts + assurance + frais initiaux.
export const totalCreditCost = (schedule, upfrontFees = 0) => round2(schedule.totalInterest + schedule.totalInsurance + upfrontFees);

// Remboursement anticipé partiel après `afterMonth` mensualités. mode 'duration' : on garde la mensualité (le prêt est plus court) ;
// mode 'payment' : on garde la durée (la mensualité baisse). Indemnité : plafonnée légalement à 6 mois d'intérêts ET 3 % du capital restant dû
// (pour un prêt immobilier ; à vérifier dans ton contrat).
export const earlyRepayment = ({ principal, annualRatePct, months, insuranceRatePct = 0, insuranceBasis = 'initial', afterMonth, amount, mode = 'duration', penaltyPct = 3 }) => {
  const before = buildSchedule({ principal, annualRatePct, months, insuranceRatePct, insuranceBasis });
  const k = Math.min(Math.max(0, Math.round(num(afterMonth))), months - 1);
  const remaining = k === 0 ? principal : before.rows[k - 1].balance;
  const paid = Math.min(Math.max(0, num(amount)), remaining);
  const i = num(annualRatePct) / 100 / 12;
  // Plafond légal (immobilier) : le plus petit de 6 mois d'intérêts sur la somme remboursée et 3 % du capital restant dû.
  const penalty = paid <= 0 ? 0 : round2(Math.min(6 * i * paid, (penaltyPct / 100) * remaining));
  const newPrincipal = round2(remaining - paid);
  const head = before.rows.slice(0, k);
  let tail;
  let newMonths = months - k;
  if (newPrincipal <= 0) { tail = { rows: [], totalInterest: 0, totalInsurance: 0 }; newMonths = 0; }
  else if (mode === 'payment') {
    tail = buildSchedule({ principal: newPrincipal, annualRatePct, months: newMonths, insuranceRatePct, insuranceBasis });
  } else {
    // même mensualité : on cherche la nouvelle durée (en mois) qui amortit le capital restant
    const pay = before.monthlyPayment;
    newMonths = i === 0 ? Math.ceil(newPrincipal / pay) : Math.ceil(-Math.log(1 - (newPrincipal * i) / pay) / Math.log(1 + i));
    tail = buildSchedule({ principal: newPrincipal, annualRatePct, months: Math.max(1, newMonths), insuranceRatePct, insuranceBasis });
  }
  const interestAfter = round2(head.reduce((a, r) => a + r.interest, 0) + tail.totalInterest);
  // Assurance sur le capital initial : la prime mensuelle ne change pas (hypothèse : le contrat n'est pas renégocié) ; sinon elle suit le capital restant dû.
  const tailInsurance = insuranceBasis === 'initial' ? round2(((principal * num(insuranceRatePct)) / 100 / 12) * (tail.rows ? tail.rows.length : 0)) : tail.totalInsurance;
  const insuranceAfter = round2(head.reduce((a, r) => a + r.insurance, 0) + tailInsurance);
  return {
    remainingBefore: remaining, repaid: paid, penalty, newPrincipal, newMonths, newTotalMonths: k + newMonths,
    newMonthlyPayment: tail.monthlyPayment ?? 0,
    interestSaved: round2(before.totalInterest - interestAfter), insuranceSaved: round2(before.totalInsurance - insuranceAfter),
    netSaving: round2(before.totalInterest - interestAfter + (before.totalInsurance - insuranceAfter) - penalty),
    monthsSaved: months - (k + newMonths),
  };
};

// Capacité d'emprunt : capital maximal pour que (mensualité + assurance + crédits en cours) ≤ part des revenus (35 % par défaut).
export const borrowingCapacity = ({ monthlyIncome, otherPayments = 0, annualRatePct, months, insuranceRatePct = 0, maxDebtRatioPct = SIM_RULES.maxDebtRatioPct }) => {
  const budget = (num(monthlyIncome) * maxDebtRatioPct) / 100 - num(otherPayments);
  if (budget <= 0) return { budget: Math.max(0, budget), principal: 0 };
  const perEuro = monthlyPayment(1, annualRatePct, months) + num(insuranceRatePct) / 100 / 12;
  return { budget: round2(budget), principal: Math.floor(budget / perEuro) };
};

export const notaryFees = (price, age, rules = SIM_RULES) => round2((price * (age === 'new' ? rules.notaryNewPct : rules.notaryOldPct)) / 100);
