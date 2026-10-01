// Investissement locatif : rendements, cash-flow, impôt selon le régime, projection sur N années et rendement interne (TRI).
// Pur et déterministe. La plus-value à la revente n'est PAS modélisée (fiscalité spécifique : voir le simulateur de revente du jeu) : elle est signalée.
import { SIM_RULES } from './rules.js';
import { buildSchedule, clamp, irr, notaryFees, num, round2 } from './finance.js';

export const REGIMES = {
  micro_foncier: 'Location nue · micro-foncier',
  reel: 'Location nue · régime réel',
  lmnp_micro: 'Meublé (LMNP) · micro-BIC',
};

export const normalizeRental = (raw) => ({
  price: clamp(raw.price, 0, 1e8), works: clamp(raw.works, 0, 1e7), age: raw.age === 'new' ? 'new' : 'old',
  notaryFees: raw.notaryFees === undefined || raw.notaryFees === null || raw.notaryFees === '' ? null : clamp(raw.notaryFees, 0, 1e7),
  downPayment: clamp(raw.downPayment, 0, 1e8), upfrontFees: clamp(raw.upfrontFees, 0, 1e6),
  ratePct: clamp(raw.ratePct, 0, 25), years: Math.round(clamp(raw.years, 1, 40)), insuranceRatePct: clamp(raw.insuranceRatePct, 0, 5),
  monthlyRent: clamp(raw.monthlyRent, 0, 1e6), vacancyPct: clamp(raw.vacancyPct, 0, 100),
  coproMonthly: clamp(raw.coproMonthly, 0, 1e5), propertyTaxYear: clamp(raw.propertyTaxYear, 0, 1e6), pnoYear: clamp(raw.pnoYear, 0, 1e5),
  maintenanceYear: clamp(raw.maintenanceYear, 0, 1e6), managementPct: clamp(raw.managementPct, 0, 30), worksDeductiblePct: clamp(raw.worksDeductiblePct, 0, 100),
  regime: REGIMES[raw.regime] ? raw.regime : 'micro_foncier', tmiPct: clamp(raw.tmiPct, 0, 60),
  valueGrowthPct: clamp(raw.valueGrowthPct, -10, 15), rentGrowthPct: clamp(raw.rentGrowthPct, -5, 15), chargesGrowthPct: clamp(raw.chargesGrowthPct, -5, 15),
  horizon: Math.round(clamp(raw.horizon, 1, 40)), saleFeesPct: clamp(raw.saleFeesPct, 0, 15),
});

// Base imposable d'une année selon le régime (le micro-foncier / micro-BIC retombe sur le réel au-dessus du plafond de loyers : signalé).
const taxableIncome = (regime, ctx, rules) => {
  if (regime === 'lmnp_micro') {
    if (ctx.rent > rules.microBicCeiling) return { base: Math.max(0, ctx.rent - ctx.charges - ctx.interest - ctx.borrowerInsurance), fallback: true };
    return { base: ctx.rent * (1 - rules.microBicAllowancePct / 100), fallback: false };
  }
  if (regime === 'micro_foncier') {
    if (ctx.rent > rules.microFoncierCeiling) return { base: Math.max(0, ctx.rent - ctx.charges - ctx.interest - ctx.borrowerInsurance - ctx.deductibleWorks), fallback: true };
    return { base: ctx.rent * (1 - rules.microFoncierAllowancePct / 100), fallback: false };
  }
  return { base: Math.max(0, ctx.rent - ctx.charges - ctx.interest - ctx.borrowerInsurance - ctx.deductibleWorks), fallback: false }; // déficit foncier non modélisé
};

export const simulateRental = (input, rules = SIM_RULES, regimeOverride) => {
  const p = normalizeRental(input);
  const regime = regimeOverride ?? p.regime;
  const notary = p.notaryFees ?? notaryFees(p.price, p.age, rules);
  const totalCost = round2(p.price + p.works + notary);
  const financed = Math.max(0, round2(totalCost - p.downPayment));
  const months = p.years * 12;
  const sched = buildSchedule({ principal: financed, annualRatePct: p.ratePct, months, insuranceRatePct: p.insuranceRatePct, insuranceBasis: 'initial' });
  const byYear = (key) => (y) => sched.rows.filter((r) => Math.ceil(r.month / 12) === y).reduce((a, r) => a + r[key], 0);
  const interestY = byYear('interest'); const insY = byYear('insurance'); const payY = byYear('payment');
  const balanceEnd = (y) => (y <= 0 ? financed : y * 12 >= months ? 0 : sched.rows[y * 12 - 1].balance);
  const levy = rules.socialLevyPct;
  const rows = []; let cumulative = 0; let fallbackUsed = false; let totalTax = 0;
  const N = p.horizon;
  const flows = [-(p.downPayment + p.upfrontFees)];
  for (let y = 1; y <= N; y += 1) {
    const rent = p.monthlyRent * 12 * (1 + p.rentGrowthPct / 100) ** (y - 1) * (1 - p.vacancyPct / 100);
    const fixed = (p.coproMonthly * 12 + p.propertyTaxYear + p.pnoYear + p.maintenanceYear) * (1 + p.chargesGrowthPct / 100) ** (y - 1);
    const charges = fixed + (rent * p.managementPct) / 100;
    const interest = interestY(y); const ins = insY(y); const pay = payY(y);
    const deductibleWorks = y === 1 ? (p.works * p.worksDeductiblePct) / 100 : 0;
    const t = taxableIncome(regime, { rent, charges, interest, borrowerInsurance: ins, deductibleWorks }, rules);
    if (t.fallback) fallbackUsed = true;
    const tax = round2((t.base * (p.tmiPct + levy)) / 100);
    const cfBefore = rent - charges - pay - ins;
    const cfAfter = cfBefore - tax;
    cumulative += cfAfter; totalTax += tax;
    const value = p.price * (1 + p.valueGrowthPct / 100) ** y;
    rows.push({ year: y, rent: round2(rent), charges: round2(charges), loanPayment: round2(pay + ins), tax, cashFlowBefore: round2(cfBefore), cashFlowAfter: round2(cfAfter),
      value: round2(value), balance: round2(balanceEnd(y)), equity: round2(value - balanceEnd(y)), cumulativeCashFlow: round2(cumulative), netWorth: round2(value - balanceEnd(y) + cumulative - p.downPayment - p.upfrontFees) });
    flows.push(cfAfter);
  }
  const lastValue = p.price * (1 + p.valueGrowthPct / 100) ** N;
  const saleProceeds = lastValue * (1 - p.saleFeesPct / 100) - balanceEnd(N);
  flows[flows.length - 1] += saleProceeds;
  const tri = irr(flows);
  const y1 = rows[0];
  const yearlyRentFull = p.monthlyRent * 12;
  return {
    params: p, regime, notaryFees: notary, totalCost, financed, upfront: p.upfrontFees, ownCash: round2(p.downPayment + p.upfrontFees),
    monthlyPayment: sched.monthlyPayment, monthlyInsurance: round2(insY(1) / Math.min(12, months)), loanTotalInterest: sched.totalInterest,
    grossYieldPct: totalCost > 0 ? (yearlyRentFull / totalCost) * 100 : 0,
    netYieldPct: totalCost > 0 ? ((y1.rent - y1.charges) / totalCost) * 100 : 0,
    netNetYieldPct: totalCost > 0 ? ((y1.rent - y1.charges - y1.tax) / totalCost) * 100 : 0,
    cashFlowMonthlyBefore: round2(y1.cashFlowBefore / 12), cashFlowMonthlyAfter: round2(y1.cashFlowAfter / 12),
    rows, totalTax: round2(totalTax), saleProceeds: round2(saleProceeds), netWorthEnd: rows[rows.length - 1].netWorth,
    triPct: Number.isFinite(tri) ? tri * 100 : NaN, fallbackUsed,
    // Seuil de rentabilité : loyer mensuel encaissé qui annule le cash-flow avant impôt (année 1), vacance et gestion comprises
    breakEvenRent: (() => { const k = (1 - p.vacancyPct / 100) * (1 - p.managementPct / 100) * 12; const fixed = p.coproMonthly * 12 + p.propertyTaxYear + p.pnoYear + p.maintenanceYear; return k > 0 ? round2((fixed + y1.loanPayment) / k) : NaN; })(),
  };
};

export const compareRegimes = (input, rules = SIM_RULES) =>
  Object.keys(REGIMES).map((id) => { const r = simulateRental(input, rules, id); return { id, label: REGIMES[id], year1Tax: r.rows[0].tax, totalTax: r.totalTax, cashFlowMonthlyAfter: r.cashFlowMonthlyAfter, triPct: r.triPct, fallbackUsed: r.fallbackUsed }; });

// Points d'attention : règles de bon sens chiffrées (pas un conseil personnalisé).
export const attentionPoints = (r) => {
  const out = [];
  if (r.cashFlowMonthlyAfter < 0) out.push({ level: 'warn', text: `Le bien te coûte ${Math.abs(Math.round(r.cashFlowMonthlyAfter))} € par mois après impôt : c'est un effort d'épargne à pouvoir tenir, vacance locative comprise.` });
  if (r.params.vacancyPct < 4) out.push({ level: 'info', text: 'Une vacance de moins de 4 % (environ 2 semaines par an) est optimiste : un logement reste rarement loué sans interruption.' });
  if (r.params.maintenanceYear < r.params.price * 0.003) out.push({ level: 'info', text: 'Prévois un budget d\'entretien et de travaux : on compte souvent de l\'ordre de 0,5 à 1 % du prix du bien par an.' });
  if (r.netYieldPct < r.params.ratePct) out.push({ level: 'warn', text: 'Le rendement net est inférieur au taux du crédit : l\'effet de levier joue contre toi tant que le bien ne prend pas de valeur.' });
  if (r.fallbackUsed) out.push({ level: 'info', text: 'Tes loyers dépassent le plafond du régime forfaitaire : le calcul a utilisé le régime réel pour l\'impôt.' });
  if (r.params.horizon <= 5) out.push({ level: 'info', text: 'Sur un horizon court, les frais de notaire et de revente pèsent lourd : un achat immobilier se juge sur 10 ans et plus.' });
  if (r.financed > 0 && (r.monthlyPayment + r.monthlyInsurance) > r.params.monthlyRent * (1 - r.params.vacancyPct / 100) * 1.3) out.push({ level: 'info', text: 'La mensualité dépasse largement le loyer encaissé : vérifie ta capacité à absorber l\'écart chaque mois.' });
  out.push({ level: 'note', text: 'La plus-value à la revente n\'est pas incluse dans le TRI ni dans le patrimoine net : elle est imposable, avec des abattements selon la durée de détention.' });
  return out;
};
