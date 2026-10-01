import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildSchedule as serverSchedule, computeMonthlyPayment, computeTaegPct } from '../src/engine/immo/loan';
// @ts-expect-error modules JavaScript du frontend
import * as fin from '../../app/lib/sim/finance.js';
// @ts-expect-error modules JavaScript du frontend
import * as inv from '../../app/lib/sim/invest.js';
// @ts-expect-error modules JavaScript du frontend
import * as rent from '../../app/lib/sim/rental.js';
// @ts-expect-error modules JavaScript du frontend
import { SIM_RULES } from '../../app/lib/sim/rules.js';

const ROOT = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const LOANS = [
  { principal: 200000, annualRatePct: 3.5, months: 240, insuranceRatePct: 0.3 },
  { principal: 123456.78, annualRatePct: 4.1, months: 300, insuranceRatePct: 0.36 },
  { principal: 50000, annualRatePct: 0, months: 60, insuranceRatePct: 0 },
];

describe('simulateurs : crédit (cohérence avec le moteur du serveur)', () => {
  it.each(LOANS)('mensualité et tableau identiques au serveur %#', (l) => {
    expect(fin.monthlyPayment(l.principal, l.annualRatePct, l.months)).toBeCloseTo(computeMonthlyPayment(l.principal, l.annualRatePct, l.months), 2);
    const a = fin.buildSchedule(l);
    const b = serverSchedule({ principal: l.principal, annualRatePct: l.annualRatePct, months: l.months, insurance: { annualRatePct: l.insuranceRatePct, basis: 'initial' } });
    expect(a.rows).toHaveLength(l.months);
    expect(a.totalInterest).toBeCloseTo(b.totalInterest, 1);
    expect(a.totalInsurance).toBeCloseTo(b.totalInsurance, 1);
    expect(a.rows[a.rows.length - 1].balance).toBe(0);
  });
  it.each(LOANS)('capital remboursé = capital emprunté, intérêts = total payé − capital %#', (l) => {
    const s = fin.buildSchedule(l);
    const cap = s.rows.reduce((x: number, r: any) => x + r.principal, 0);
    expect(cap).toBeCloseTo(l.principal, 1);
    expect(s.totalPaid).toBeCloseTo(l.principal + s.totalInterest + s.totalInsurance, 1);
  });
  it('TAEG proche de celui du serveur, et supérieur au taux nominal avec assurance et frais', () => {
    const l = LOANS[0];
    const mine = fin.taegPct({ ...l, upfrontFees: 1500 });
    const theirs = computeTaegPct({ principal: l.principal, annualRatePct: l.annualRatePct, months: l.months, insurance: { annualRatePct: l.insuranceRatePct, basis: 'initial' } }, { applicationFee: 1500 });
    expect(mine).toBeCloseTo(theirs, 2);
    expect(mine).toBeGreaterThan(l.annualRatePct);
  });
  it('sans assurance ni frais, le TAEG est le taux équivalent annuel du taux nominal', () => {
    const t = fin.taegPct({ principal: 100000, annualRatePct: 3, months: 120 });
    expect(t).toBeCloseTo(((1 + 0.03 / 12) ** 12 - 1) * 100, 3);
  });
  it('capacité d’emprunt : la mensualité obtenue respecte le taux d’endettement', () => {
    const c = fin.borrowingCapacity({ monthlyIncome: 4000, otherPayments: 200, annualRatePct: 3.5, months: 240, insuranceRatePct: 0.3 });
    const s = fin.buildSchedule({ principal: c.principal, annualRatePct: 3.5, months: 240, insuranceRatePct: 0.3 });
    expect(s.monthlyPayment + s.rows[0].insurance + 200).toBeLessThanOrEqual(4000 * 0.35 + 1);
    expect(fin.borrowingCapacity({ monthlyIncome: 500, otherPayments: 400, annualRatePct: 3, months: 240 }).principal).toBe(0);
  });
  it('remboursement anticipé : économise des intérêts, durée plus courte ou mensualité plus basse', () => {
    const base = { ...LOANS[0], afterMonth: 36, amount: 30000 };
    const d = fin.earlyRepayment({ ...base, mode: 'duration' });
    const p = fin.earlyRepayment({ ...base, mode: 'payment' });
    expect(d.interestSaved).toBeGreaterThan(0);
    expect(d.monthsSaved).toBeGreaterThan(0);
    expect(p.newMonthlyPayment).toBeLessThan(fin.monthlyPayment(200000, 3.5, 240));
    expect(d.penalty).toBeLessThanOrEqual(6 * (0.035 / 12) * 30000 + 0.01);
    const zero = fin.earlyRepayment({ ...base, amount: 0 });
    expect(zero.interestSaved).toBe(0);
    expect(zero.insuranceSaved).toBe(0);
    expect(zero.netSaving).toBe(0);
  });
  it('indemnité : plus petit de 6 mois d’intérêts sur la somme remboursée et 3 % du capital restant', () => {
    const l = { principal: 200000, annualRatePct: 3.5, months: 240, insuranceRatePct: 0, afterMonth: 0, amount: 20000 };
    expect(fin.earlyRepayment(l).penalty).toBeCloseTo(Math.min(6 * (0.035 / 12) * 20000, 0.03 * 200000), 2);
    expect(fin.earlyRepayment({ ...l, amount: 150000 }).penalty).toBeCloseTo(Math.min(6 * (0.035 / 12) * 150000, 0.03 * 200000), 2);
  });
  it('IRR : retrouve un taux connu, NaN sans solution', () => {
    expect(fin.irr([-100, 110])).toBeCloseTo(0.1, 6);
    expect(fin.irr([100, 100])).toBeNaN();
  });
  it('frais de notaire : taux ancien > neuf', () => {
    expect(fin.notaryFees(200000, 'old')).toBeCloseTo(200000 * SIM_RULES.notaryOldPct / 100, 2);
    expect(fin.notaryFees(200000, 'new')).toBeLessThan(fin.notaryFees(200000, 'old'));
  });
});

describe('simulateurs : investissement PEA / CTO', () => {
  const base = { initial: 5000, monthly: 300, years: 20, annualReturnPct: 5, annualFeesPct: 0, entryFeePct: 0, contributionGrowthPct: 0, inflationPct: 0, envelope: 'pea' };
  it('sans frais ni rendement : valeur = somme versée', () => {
    const r = inv.projectInvestment({ ...base, annualReturnPct: 0 });
    expect(r.finalValue).toBeCloseTo(5000 + 300 * 240, 1);
    expect(r.gains).toBeCloseTo(0, 1);
    expect(r.tax).toBe(0);
  });
  it('formule fermée sans frais (versement en fin de mois)', () => {
    const r = inv.projectInvestment(base);
    const g = 1.05 ** (1 / 12) - 1;
    const closed = 5000 * (1 + g) ** 240 + 300 * (((1 + g) ** 240 - 1) / g);
    expect(r.finalValue).toBeCloseTo(closed, 0);
  });
  it('les frais réduisent le résultat et withoutFees les chiffre', () => {
    const r = inv.projectInvestment({ ...base, annualFeesPct: 1.5, entryFeePct: 2 });
    const clean = inv.projectInvestment(base);
    expect(r.finalValue).toBeLessThan(clean.finalValue);
    expect(r.withoutFees).toBeCloseTo(clean.finalValue, 1);
    expect(r.feesPaid).toBeGreaterThan(0);
  });
  it('fiscalité : PEA après 5 ans = prélèvements sociaux seuls ; avant 5 ans et CTO = flat tax', () => {
    expect(inv.exitTax(1000, 'pea', 6).pct).toBe(SIM_RULES.socialLevyPct);
    expect(inv.exitTax(1000, 'pea', 3).pct).toBe(SIM_RULES.socialLevyPct + SIM_RULES.flatIncomeTaxPct);
    expect(inv.exitTax(1000, 'cto', 20).pct).toBe(SIM_RULES.socialLevyPct + SIM_RULES.flatIncomeTaxPct);
    expect(inv.exitTax(-500, 'cto', 20).tax).toBe(0);
  });
  it('étiquettes de scénarios formatées à la française', () => {
    expect(inv.scenarios({ ...base, annualReturnPct: 5.1 })[0].label).toContain('2,1');
  });
  it('trois scénarios ordonnés ; entrées aberrantes bornées', () => {
    const [lo, mid, hi] = inv.scenarios(base);
    expect(lo.plan.finalValue).toBeLessThan(mid.plan.finalValue);
    expect(mid.plan.finalValue).toBeLessThan(hi.plan.finalValue);
    const r = inv.projectInvestment({ ...base, years: 9999, initial: 'abc', annualReturnPct: 1e9 });
    expect(Number.isFinite(r.finalValue)).toBe(true);
  });
  it('inflation : la valeur réelle est inférieure à la valeur nominale', () => {
    const r = inv.projectInvestment({ ...base, inflationPct: 2 });
    expect(r.realFinal).toBeLessThan(r.finalValue);
  });
});

describe('simulateurs : investissement locatif', () => {
  const input = {
    price: 200000, works: 0, age: 'old', downPayment: 30000, upfrontFees: 1500, ratePct: 3.5, years: 20, insuranceRatePct: 0.3,
    monthlyRent: 1000, vacancyPct: 5, coproMonthly: 60, propertyTaxYear: 900, pnoYear: 150, maintenanceYear: 400, managementPct: 0, worksDeductiblePct: 0,
    regime: 'micro_foncier', tmiPct: 30, valueGrowthPct: 1, rentGrowthPct: 1, chargesGrowthPct: 1, horizon: 10, saleFeesPct: 5,
  };
  it('les régimes sont comparables et donnent des résultats finis', () => {
    const all = rent.compareRegimes(input);
    expect(all.length).toBe(Object.keys(rent.REGIMES).length);
    for (const x of all) expect(JSON.stringify(x)).not.toMatch(/NaN|Infinity/);
  });
  it('le financement est cohérent : coût total − apport = emprunt', () => {
    const r = rent.simulateRental(input);
    const fees = fin.notaryFees(200000, 'old');
    expect(JSON.stringify(r)).toContain(String(Math.round(200000 + fees - 30000)));
  });
  it('un loyer nul ne produit ni NaN ni impôt', () => {
    const r = rent.simulateRental({ ...input, monthlyRent: 0 });
    expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity/);
  });
  it('règles fiscales marquées à reconfirmer', () => {
    expect(read('app/lib/sim/rules.js')).toMatch(/RECONFIRMER/i);
  });
});

describe('simulateurs : pages natives, sans données inventées', () => {
  const pages = ['app/simulateurs/pea/page.jsx', 'app/simulateurs/loan1/page.jsx', 'app/simulateurs/loan2/page.jsx', 'app/demo/page.jsx'];
  it.each(pages)('%s : pas d’iframe, pas de faux « temps réel »', (p) => {
    const s = read(p);
    expect(s).not.toMatch(/<iframe/i);
    expect(s).not.toMatch(/temps r[ée]el|Expert IA|dangerouslySetInnerHTML/i);
  });
  it('anciens HTML et bibliothèques embarquées supprimés', () => {
    for (const f of ['simulateur-pea.html', 'simulateur-loan1.html', 'simulateur-loan2.html', 'vendor']) expect(existsSync(join(ROOT, 'public', f))).toBe(false);
  });
  it('tous les termes d’aide existent dans le glossaire', () => {
    const gl = read('app/lib/glossaire.js');
    const src = ['app/simulateurs/pea/page.jsx', 'app/simulateurs/loan1/page.jsx', 'app/simulateurs/loan2/page.jsx', 'app/components/sim/SimFrame.jsx'].map(read).join('\n');
    const ids = [...src.matchAll(/term="([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    for (const id of new Set(ids)) expect(gl, id).toMatch(new RegExp(`id:\\s*['"]${id}['"]`));
  });
});
