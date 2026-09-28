import { describe, it, expect } from 'vitest';
import {
  computeMonthlyPayment, buildSchedule, computeTaegPct, totalCreditCost,
  computeNotaryFees, computeAcquisition, loanNeeded,
  assessLoanApplication, maxPrincipalForPayment,
  livingRemainingFloor, computeIndicators, computeCapitalGain, computeSaleProceeds,
  EngineInputError, BankRules,
} from '../src/engine/immo';

// Règles FICTIVES de test (pas des règles légales) : le moteur n'a aucun chiffre fiscal.
const bank: BankRules = {
  maxDebtRatioPct: 35,
  livingRemainingByProfile: { student: 500, employee: 1200, executive: 1800 },
  livingRemainingPerExtraAdult: 0,
  livingRemainingPerChild: 0,
  rentalIncomeWeight: 1,
  projectRentWeight: 0,
};

describe('prêt : mensualité', () => {
  it('200 000 € à 3 % sur 20 ans = 1 109,20 €/mois (valeur de référence connue)', () => {
    expect(computeMonthlyPayment(200000, 3, 240)).toBe(1109.2);
  });
  it('taux 0 % : capital / durée, sans division par zéro', () => {
    expect(computeMonthlyPayment(120000, 0, 240)).toBe(500);
  });
  it('capital nul : 0', () => {
    expect(computeMonthlyPayment(0, 3, 240)).toBe(0);
  });
  it('durée d\'un mois : capital + intérêts du mois', () => {
    expect(computeMonthlyPayment(1200, 12, 1)).toBe(1212);
  });
});

describe('prêt : tableau d\'amortissement', () => {
  it('se termine exactement à 0 et rembourse exactement le capital', () => {
    const s = buildSchedule({ principal: 200000, annualRatePct: 3, months: 240 });
    expect(s.rows).toHaveLength(240);
    expect(s.rows[239].balanceAfter).toBe(0);
    const sum = s.rows.reduce((a, r) => a + r.principal, 0);
    expect(Math.round(sum * 100) / 100).toBe(200000);
    expect(s.totalInterest).toBeGreaterThan(66000);
    expect(s.totalInterest).toBeLessThan(66500);
  });
  it('propriétés sur des prêts variés : capital toujours soldé, jamais négatif', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (let k = 0; k < 200; k++) {
      const principal = Math.round(1000 + rnd() * 900000);
      const rate = Math.round(rnd() * 800) / 100; // 0–8 %
      const months = 1 + Math.floor(rnd() * 360);
      const defer = rnd() < 0.3 ? Math.floor(rnd() * 24) : 0;
      const s = buildSchedule({ principal, annualRatePct: rate, months, deferralMonths: defer });
      expect(s.rows).toHaveLength(months + defer);
      expect(s.rows[s.rows.length - 1].balanceAfter).toBe(0);
      expect(s.rows.every((r) => r.balanceAfter >= 0 && r.principal >= 0 && r.interest >= 0)).toBe(true);
      expect(Math.abs(s.rows.reduce((a, r) => a + r.principal, 0) - principal)).toBeLessThan(0.01);
    }
  });
  it('taux 0 % : aucun intérêt', () => {
    const s = buildSchedule({ principal: 12000, annualRatePct: 0, months: 12 });
    expect(s.totalInterest).toBe(0);
    expect(s.rows[11].balanceAfter).toBe(0);
  });
  it('différé partiel : intérêts seuls d\'abord, capital ensuite', () => {
    const s = buildSchedule({ principal: 100000, annualRatePct: 3, months: 120, deferralMonths: 12 });
    expect(s.rows[0].principal).toBe(0);
    expect(s.rows[0].payment).toBe(250);
    expect(s.rows[11].balanceAfter).toBe(100000);
    expect(s.rows[12].principal).toBeGreaterThan(0);
  });
});

describe('assurance comptée UNE seule fois', () => {
  const base = { principal: 200000, annualRatePct: 3, months: 240 };
  it('ligne séparée : mensualité hors assurance inchangée', () => {
    const s = buildSchedule({ ...base, insurance: { annualRatePct: 0.36, basis: 'initial' } });
    expect(s.monthlyPayment).toBe(1109.2);
    expect(s.rows[0].insurance).toBe(60); // 200 000 × 0,36 % / 12
    expect(s.monthlyPaymentWithInsurance).toBe(1169.2);
    expect(s.totalInsurance).toBe(14400); // 60 × 240, pas le double
  });
  it('base capital restant dû : décroissante, moins chère au total', () => {
    const a = buildSchedule({ ...base, insurance: { annualRatePct: 0.36, basis: 'initial' } });
    const b = buildSchedule({ ...base, insurance: { annualRatePct: 0.36, basis: 'remaining' } });
    expect(b.rows[239].insurance).toBeLessThan(b.rows[0].insurance);
    expect(b.totalInsurance).toBeLessThan(a.totalInsurance);
  });
});

describe('TAEG (frais compris)', () => {
  const loan = { principal: 200000, annualRatePct: 3, months: 240 };
  it('sans frais ni assurance : taux annuel équivalent du nominal', () => {
    const expected = (Math.pow(1 + 0.03 / 12, 12) - 1) * 100; // 3,0416 %
    expect(computeTaegPct(loan)).toBeCloseTo(expected, 2);
  });
  it('les frais et l\'assurance le font monter', () => {
    const plain = computeTaegPct(loan);
    const withFees = computeTaegPct(loan, { applicationFee: 1000, guaranteeFee: 2500 });
    const withIns = computeTaegPct({ ...loan, insurance: { annualRatePct: 0.36, basis: 'initial' } });
    expect(withFees).toBeGreaterThan(plain);
    expect(withIns).toBeGreaterThan(plain);
  });
  it('0 % sans frais = 0 ; 0 % avec frais > 0', () => {
    expect(computeTaegPct({ principal: 100000, annualRatePct: 0, months: 120 })).toBe(0);
    expect(computeTaegPct({ principal: 100000, annualRatePct: 0, months: 120 }, { applicationFee: 1000 })).toBeGreaterThan(0);
  });
  it('frais supérieurs au capital : erreur explicite', () => {
    expect(() => computeTaegPct({ principal: 1000, annualRatePct: 3, months: 12 }, { applicationFee: 1000 })).toThrow(EngineInputError);
  });
  it('coût total = intérêts + assurance + frais', () => {
    const s = buildSchedule({ ...loan, insurance: { annualRatePct: 0.36, basis: 'initial' } });
    expect(totalCreditCost(s, { applicationFee: 1000 })).toBeCloseTo(s.totalInterest + 14400 + 1000, 2);
  });
});

describe('acquisition et frais de notaire (taux fournis par l\'appelant)', () => {
  const rule = { oldRatePct: 8, newRatePct: 2.5 }; // fixture de test
  it('applique le taux ancien/neuf', () => {
    expect(computeNotaryFees(200000, 'old', rule)).toBe(16000);
    expect(computeNotaryFees(200000, 'new', rule)).toBe(5000);
  });
  it('budget total et montant à emprunter', () => {
    const b = computeAcquisition({ price: 200000, age: 'old', agencyFees: 8000, works: 10000, notaryRule: rule });
    expect(b.totalCost).toBe(234000);
    expect(loanNeeded(b.totalCost, 34000)).toBe(200000);
    expect(loanNeeded(b.totalCost, 999999)).toBe(0);
  });
  it('refuse les valeurs invalides', () => {
    expect(() => computeNotaryFees(-1, 'old', rule)).toThrow(EngineInputError);
    expect(() => computeNotaryFees(NaN, 'old', rule)).toThrow(EngineInputError);
  });
});

describe('décision de la banque (expliquée)', () => {
  it('accordé', () => {
    const a = assessLoanApplication({ profile: 'employee', salary: 5000, livingCharges: 800 }, 1200, bank);
    expect(a.decision).toBe('approved');
    expect(a.debtRatioPct).toBe(24);
    expect(a.livingRemaining).toBe(3000);
  });
  it('refusé : endettement trop élevé, avec la mensualité maximale', () => {
    const a = assessLoanApplication({ profile: 'employee', salary: 4000, existingDebtPayments: 500 }, 1000, bank);
    expect(a.decision).toBe('refused');
    expect(a.debtRatioPct).toBe(37.5);
    expect(a.maxMonthlyPayment).toBe(900);
    expect(a.reasons[0].code).toBe('DEBT_RATIO_TOO_HIGH');
    expect(a.reasons[0].message).toContain('900');
  });
  it('les crédits existants comptent dans l\'endettement', () => {
    const a = assessLoanApplication({ profile: 'employee', salary: 4000, existingDebtPayments: 1000 }, 500, bank);
    expect(a.debtRatioPct).toBe(37.5);
    expect(a.decision).toBe('refused');
  });
  it('accord sous réserve : reste à vivre faible', () => {
    const a = assessLoanApplication({ profile: 'employee', salary: 3000, livingCharges: 1200 }, 900, bank); // ratio 30 %, reste 900
    expect(a.decision).toBe('caution');
    expect(a.reasons.some((r) => r.code === 'LIVING_REMAINING_LOW')).toBe(true);
  });
  it('sans revenu : refusé, sans division par zéro', () => {
    const a = assessLoanApplication({ profile: 'employee', salary: 0 }, 500, bank);
    expect(a.decision).toBe('refused');
    expect(a.debtRatioPct).toBeNull();
  });
  it('pondération des loyers existants et du loyer futur', () => {
    const rules = { ...bank, rentalIncomeWeight: 0.7, projectRentWeight: 0.7 };
    const a = assessLoanApplication({ profile: 'employee', salary: 3000, existingRentalIncome: 1000 }, 500, rules, 1000);
    expect(a.countedIncome).toBe(4400);
  });
  it('capacité maximale : inverse de la mensualité', () => {
    const p = maxPrincipalForPayment(1109.2, 3, 240);
    expect(p).toBe(200000);
    // Jamais au-dessus du plafond, quelle que soit la combinaison
    for (const [pay, rate, months, ins] of [[900, 3.5, 300, 0.3], [1234.56, 4.1, 180, 0], [777, 0, 120, 0.4]]) {
      const cap = maxPrincipalForPayment(pay, rate, months, ins);
      const s = buildSchedule({ principal: cap, annualRatePct: rate, months, insurance: { annualRatePct: ins, basis: 'initial' } });
      expect(s.monthlyPaymentWithInsurance).toBeLessThanOrEqual(pay);
      const s2 = buildSchedule({ principal: cap + 100, annualRatePct: rate, months, insurance: { annualRatePct: ins, basis: 'initial' } });
      expect(s2.monthlyPaymentWithInsurance).toBeGreaterThan(pay);
    }
    expect(maxPrincipalForPayment(500, 0, 100)).toBe(50000);
  });
});

describe('reste à vivre par profil', () => {
  const h = { profile: 'employee' as const, salary: 3000, livingCharges: 1200 };
  it('le seuil dépend du profil', () => {
    expect(livingRemainingFloor({ ...h, profile: 'student' }, bank)).toBe(500);
    expect(livingRemainingFloor({ ...h, profile: 'executive' }, bank)).toBe(1800);
  });
  it('même dossier, décision différente selon le profil', () => {
    // ratio 30 %, reste à vivre 900 : ok pour un étudiant (500), sous réserve pour un salarié (1 200)
    expect(assessLoanApplication({ ...h, profile: 'student' }, 900, bank).decision).toBe('approved');
    expect(assessLoanApplication(h, 900, bank).decision).toBe('caution');
  });
  it('majorations par foyer désactivées à 0, activables par la configuration', () => {
    const family = { ...h, adults: 2, children: 2 };
    expect(livingRemainingFloor(family, bank)).toBe(1200);
    expect(livingRemainingFloor(family, { ...bank, livingRemainingPerExtraAdult: 300, livingRemainingPerChild: 200 })).toBe(1900);
  });
  it('profil inconnu : erreur explicite', () => {
    expect(() => livingRemainingFloor({ ...h, profile: 'retraite' as any }, bank)).toThrow(EngineInputError);
  });
});

describe('indicateurs d\'un bien locatif', () => {
  const input = { totalInvestment: 230000, loanPrincipal: 184000, monthlyRent: 1000, occupancyPct: 90, annualCharges: 2400, monthlyLoanPayment: 900 };
  it('valeurs calculées à la main', () => {
    const r = computeIndicators(input);
    expect(r.potentialAnnualRent).toBe(12000);
    expect(r.collectedAnnualRent).toBe(10800);
    expect(r.grossYieldPct).toBe(5.22);
    expect(r.netYieldPct).toBe(3.65);
    expect(r.monthlyCashFlow).toBe(-200);
    expect(r.annualCashFlow).toBe(-2400);
    expect(r.downPayment).toBe(46000);
    expect(r.ltvPct).toBe(80);
    expect(r.breakevenOccupancyPct).toBe(110);
    expect(r.paybackYears).toBeNull();
  });
  it('cash-flow positif : délai de récupération de l\'apport', () => {
    const r = computeIndicators({ ...input, monthlyLoanPayment: 500 });
    expect(r.monthlyCashFlow).toBe(200); // 900 − 200 − 500
    expect(r.paybackYears).toBe(19.2); // 46 000 / 2 400
    expect(r.cashOnCashPct).toBe(5.22);
  });
  it('cas limites : jamais de NaN ni Infinity', () => {
    const r = computeIndicators({ totalInvestment: 0, loanPrincipal: 0, monthlyRent: 0, occupancyPct: 0, annualCharges: 0, monthlyLoanPayment: 0 });
    expect(r.grossYieldPct).toBeNull();
    expect(r.cashOnCashPct).toBeNull();
    expect(r.breakevenOccupancyPct).toBeNull();
    expect(Object.values(r).every((v) => v === null || Number.isFinite(v))).toBe(true);
  });
  it('100 % financé : pas d\'apport, rentabilité sur apport non calculable', () => {
    const r = computeIndicators({ ...input, loanPrincipal: 230000 });
    expect(r.downPayment).toBe(0);
    expect(r.cashOnCashPct).toBeNull();
  });
  it('occupation hors bornes : erreur', () => {
    expect(() => computeIndicators({ ...input, occupancyPct: 120 })).toThrow(EngineInputError);
  });
});

describe('plus-value (règles FICTIVES de test : le moteur ne contient aucun chiffre fiscal)', () => {
  const rules = {
    incomeTaxRatePct: 20, socialChargesRatePct: 10,
    incomeTaxAllowancePct: (y: number) => Math.min(100, y * 5),
    socialChargesAllowancePct: (y: number) => Math.min(100, y * 5),
  };
  const sale = { purchasePrice: 200000, acquisitionFees: 15000, works: 0, salePrice: 300000, saleFees: 5000, yearsHeld: 10 };
  it('calcul complet avec abattements', () => {
    const r = computeCapitalGain(sale, rules);
    expect(r.costBasis).toBe(215000);
    expect(r.grossGain).toBe(80000);
    expect(r.incomeTaxBase).toBe(40000);
    expect(r.incomeTax).toBe(8000);
    expect(r.socialCharges).toBe(4000);
    expect(r.totalTax).toBe(12000);
    expect(r.netGain).toBe(68000);
  });
  it('moins-value : aucun impôt', () => {
    const r = computeCapitalGain({ ...sale, salePrice: 190000 }, rules);
    expect(r.totalTax).toBe(0);
    expect(r.grossGain).toBeLessThan(0);
  });
  it('détention longue : exonération totale possible via les abattements', () => {
    const r = computeCapitalGain({ ...sale, yearsHeld: 25 }, rules);
    expect(r.totalTax).toBe(0);
  });
  it('forfaits retenus s\'ils sont plus avantageux, forfait travaux après une durée minimale', () => {
    const f = { ...rules, acquisitionFeesForfaitPct: 7.5, worksForfaitPct: 15, worksForfaitMinYears: 5 };
    const r = computeCapitalGain({ ...sale, acquisitionFees: 5000 }, f);
    expect(r.costBasis).toBe(200000 + 15000 + 30000);
    const short = computeCapitalGain({ ...sale, acquisitionFees: 5000, yearsHeld: 3 }, f);
    expect(short.costBasis).toBe(200000 + 15000);
  });
  it('surtaxe marginale par tranche', () => {
    const r = computeCapitalGain({ ...sale, yearsHeld: 0, salePrice: 400000 }, { ...rules, surtax: [{ fromTaxableGain: 50000, ratePct: 2 }, { fromTaxableGain: 100000, ratePct: 3 }] });
    // gain 180 000, aucun abattement : (100 000−50 000)×2 % + (180 000−100 000)×3 %
    expect(r.surtax).toBe(1000 + 2400);
  });
  it('abattement hors bornes : erreur explicite', () => {
    expect(() => computeCapitalGain(sale, { ...rules, incomeTaxAllowancePct: () => 150 })).toThrow(EngineInputError);
  });
  it('produit net de la vente', () => {
    expect(computeSaleProceeds({ salePrice: 300000, saleFees: 5000, remainingLoanBalance: 120000, earlyRepaymentPenalty: 2000, totalTax: 12000 })).toBe(161000);
  });
});
