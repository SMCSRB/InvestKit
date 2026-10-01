// Projection d'un plan d'investissement (PEA, compte-titres) : intérêts composés mensuels, frais, fiscalité à la sortie, inflation.
// Fonction pure : mêmes entrées = mêmes sorties. Les rendements sont des HYPOTHÈSES de l'utilisateur, jamais des promesses.
import { SIM_RULES } from './rules.js';
import { clamp, num, round2 } from './finance.js';

export const ENVELOPES = {
  pea: 'PEA',
  cto: 'Compte-titres (CTO)',
};

// Fiscalité sur les gains à la sortie. PEA : seulement les prélèvements sociaux après 5 ans ; avant : comme un CTO. CTO : prélèvement forfaitaire.
export const exitTax = (gain, envelope, years, rules = SIM_RULES) => {
  const g = Math.max(0, gain);
  const pea = envelope === 'pea' && years >= rules.peaYears;
  const pct = pea ? rules.socialLevyPct : rules.socialLevyPct + rules.flatIncomeTaxPct;
  return { pct, tax: round2((g * pct) / 100), peaAdvantage: pea };
};

export const projectInvestment = (raw, rules = SIM_RULES) => {
  const initial = clamp(raw.initial, 0, 1e9); const monthly = clamp(raw.monthly, 0, 1e7);
  const years = Math.round(clamp(raw.years, 1, 60));
  const returnPct = clamp(raw.annualReturnPct, -50, 50);
  const feesPct = clamp(raw.annualFeesPct, 0, 10); const entryPct = clamp(raw.entryFeePct, 0, 10);
  const growthPct = clamp(raw.contributionGrowthPct, 0, 20); const inflPct = clamp(raw.inflationPct, -5, 30);
  const envelope = raw.envelope === 'cto' ? 'cto' : 'pea';
  const g = (1 + returnPct / 100) ** (1 / 12) - 1;       // rendement mensuel équivalent au rendement annuel
  const f = feesPct / 100 / 12;                          // frais de gestion prélevés chaque mois sur l'encours
  let value = initial * (1 - entryPct / 100);
  let contributed = initial; let feesPaid = initial * (entryPct / 100);
  let contribution = monthly;
  const rows = [{ year: 0, contributed: round2(contributed), value: round2(value), gains: round2(value - contributed), feesPaid: round2(feesPaid), realValue: round2(value) }];
  for (let m = 1; m <= years * 12; m += 1) {
    value *= 1 + g;
    const fee = value * f; value -= fee; feesPaid += fee;
    const entry = contribution * (entryPct / 100);
    value += contribution - entry; contributed += contribution; feesPaid += entry;
    if (m % 12 === 0) {
      const y = m / 12;
      rows.push({ year: y, contributed: round2(contributed), value: round2(value), gains: round2(value - contributed), feesPaid: round2(feesPaid), realValue: round2(value / (1 + inflPct / 100) ** y) });
      contribution *= 1 + growthPct / 100;
    }
  }
  const last = rows[rows.length - 1];
  const tax = exitTax(last.value - last.contributed, envelope, years, rules);
  const net = round2(last.value - tax.tax);
  return {
    rows, years, envelope, contributed: last.contributed, finalValue: last.value, gains: last.gains, feesPaid: last.feesPaid,
    tax: tax.tax, taxPct: tax.pct, peaAdvantage: tax.peaAdvantage, netAfterTax: net,
    realFinal: last.realValue, realNet: round2(net / (1 + inflPct / 100) ** years),
    // Effet des frais : même plan sans frais d'aucune sorte
    ...(raw._noFees ? {} : { withoutFees: projectInvestment({ ...raw, annualFeesPct: 0, entryFeePct: 0, _noFees: true }, rules).finalValue }),
  };
};

// Trois scénarios de rendement autour de l'hypothèse centrale (±écart en points), pour montrer l'incertitude.
// Étiquette : valeur réellement simulée (bornée), formatée à la française.
const lab = (v) => String(Math.round(clamp(v, -50, 50) * 10) / 10).replace('.', ',');
export const scenarios = (raw, spread = 3, rules = SIM_RULES) => ([
  { id: 'low', label: `Prudent (${lab(num(raw.annualReturnPct) - spread)} %/an)`, plan: projectInvestment({ ...raw, annualReturnPct: num(raw.annualReturnPct) - spread }, rules) },
  { id: 'mid', label: `Central (${lab(num(raw.annualReturnPct))} %/an)`, plan: projectInvestment(raw, rules) },
  { id: 'high', label: `Optimiste (${lab(num(raw.annualReturnPct) + spread)} %/an)`, plan: projectInvestment({ ...raw, annualReturnPct: num(raw.annualReturnPct) + spread }, rules) },
]);
