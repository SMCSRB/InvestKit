import { describe, it, expect } from 'vitest';
import {
  estimateMarketRent, rentLevelFactor, expectedVacancyMonths, averageVacancyPct, monthlyLetProbability, vacancyCapMonths, expectedCappedVacancyMonths, isTenantFound, simulateVacancyMonths,
  clampAskingRentRatio, reviseRent, capRentAtRelet, computeRentTax, toCents, convertEurosToCoins,
  buildMonthlyStatement, EngineInputError, MonthlyInput,
} from '../src/engine/immo';
import { RENT_MODEL, VACANCY_MODEL, RENT_TAX_RATE_BY_PROFILE, STARTING_PROFILES } from '../src/config/immoRules';
import { EUROS_PER_COIN } from '../src/config/economy';
import { createRng } from '../src/utils/seededRandom';

const NO_TAX = { ytdBefore: 0, ratePct: 0, settleThisMonth: false };
const base = { surfaceSqm: 60, cityRentPerSqm: 10, neighborhoodRentMultiplier: 1.1, condition: 'good' as const, energyClass: 'C' as const };

describe('loyer calculé (jamais figé)', () => {
  it('surface × loyer/m² de la ville × multiplicateur du quartier', () => {
    const r = estimateMarketRent(base, RENT_MODEL);
    expect(r.rentPerSqm).toBe(11);
    expect(r.monthlyRent).toBe(660);
  });
  it('le quartier fait varier le loyer', () => {
    const centre = estimateMarketRent({ ...base, neighborhoodRentMultiplier: 1.1 }, RENT_MODEL).monthlyRent;
    const peri = estimateMarketRent({ ...base, neighborhoodRentMultiplier: 0.9 }, RENT_MODEL).monthlyRent;
    expect(centre).toBeGreaterThan(peri);
  });
  it('l\'état et la classe énergie baissent le loyer', () => {
    expect(estimateMarketRent({ ...base, condition: 'to_refresh' }, RENT_MODEL).monthlyRent).toBe(613.8); // 660 × 0,93
    expect(estimateMarketRent({ ...base, condition: 'to_renovate' }, RENT_MODEL).monthlyRent).toBe(561);
    expect(estimateMarketRent({ ...base, energyClass: 'G' }, RENT_MODEL).monthlyRent).toBe(580.8);
    expect(estimateMarketRent({ ...base, energyClass: 'A' }, RENT_MODEL).monthlyRent).toBeGreaterThan(660);
  });
  it('petites surfaces : loyer au m² majoré', () => {
    const studio = estimateMarketRent({ ...base, surfaceSqm: 20 }, RENT_MODEL);
    expect(studio.rentPerSqm).toBeGreaterThan(11);
    expect(studio.rentPerSqm).toBeCloseTo(11 * (1 + (25 / 45) * 0.35), 1);
    expect(estimateMarketRent({ ...base, surfaceSqm: 45 }, RENT_MODEL).rentPerSqm).toBe(11);
  });
  it('entrées invalides', () => {
    expect(() => estimateMarketRent({ ...base, surfaceSqm: -1 }, RENT_MODEL)).toThrow(EngineInputError);
    expect(() => estimateMarketRent({ ...base, condition: 'ruine' as any }, RENT_MODEL)).toThrow(EngineInputError);
  });
});

describe('vacance entre deux locataires', () => {
  it('tension maximale = vacance courte ; tension nulle = vacance longue', () => {
    expect(expectedVacancyMonths(1, 1, VACANCY_MODEL)).toBe(0.5);
    expect(expectedVacancyMonths(0, 1, VACANCY_MODEL)).toBe(5);
  });
  it('plus la tension baisse, plus la vacance s\'allonge', () => {
    let previous = 0;
    for (const t of [1, 0.8, 0.6, 0.4, 0.2, 0]) {
      const e = expectedVacancyMonths(t, 1, VACANCY_MODEL);
      expect(e).toBeGreaterThan(previous);
      previous = e;
    }
  });
  it('loyer trop élevé = vacance plus longue ; loyer plus bas = plus courte', () => {
    expect(rentLevelFactor(1)).toBe(1);
    expect(rentLevelFactor(1.1)).toBeCloseTo(1.6, 5);
    expect(rentLevelFactor(1.5)).toBe(4);
    expect(rentLevelFactor(9)).toBe(4); // plafonné
    expect(rentLevelFactor(0.9)).toBeCloseTo(0.7, 5);
    expect(rentLevelFactor(0.5)).toBe(0.4); // plancher
    const e = (r: number) => expectedVacancyMonths(0.5, r, VACANCY_MODEL);
    expect(e(1.2)).toBeGreaterThan(e(1.1));
    expect(e(1.1)).toBeGreaterThan(e(1));
    expect(e(1)).toBeGreaterThan(e(0.9));
  });
  it('vacance moyenne en % : cohérente avec la tension et la durée du bail', () => {
    expect(averageVacancyPct(1, 36, VACANCY_MODEL)).toBeCloseTo(1.37, 1);
    expect(averageVacancyPct(0, 36, VACANCY_MODEL)).toBeCloseTo(12.2, 1);
    expect(averageVacancyPct(0.5, 12, VACANCY_MODEL)).toBeGreaterThan(averageVacancyPct(0.5, 48, VACANCY_MODEL));
  });
  it('le loyer demandé est borné', () => {
    expect(clampAskingRentRatio(2, VACANCY_MODEL)).toBe(1.3);
    expect(clampAskingRentRatio(0.2, VACANCY_MODEL)).toBe(0.7);
    expect(clampAskingRentRatio(1.05, VACANCY_MODEL)).toBe(1.05);
  });
  it('probabilité mensuelle de trouver un locataire : 1 / (1 + durée moyenne)', () => {
    const e = expectedVacancyMonths(0.5, 1, VACANCY_MODEL);
    expect(monthlyLetProbability(0.5, 1, VACANCY_MODEL)).toBeCloseTo(1 / (1 + e), 10);
    // marché tendu > détendu ; loyer bas > loyer haut
    expect(monthlyLetProbability(0.9, 1, VACANCY_MODEL)).toBeGreaterThan(monthlyLetProbability(0.2, 1, VACANCY_MODEL));
    expect(monthlyLetProbability(0.5, 0.9, VACANCY_MODEL)).toBeGreaterThan(monthlyLetProbability(0.5, 1.15, VACANCY_MODEL));
  });
  it('plafond = 1,5 × la durée moyenne, recalculé au loyer demandé courant', () => {
    expect(vacancyCapMonths(0.2, 1.15, VACANCY_MODEL)).toBe(Math.ceil(1.5 * expectedVacancyMonths(0.2, 1.15, VACANCY_MODEL)));
    expect(vacancyCapMonths(0.2, 1.15, VACANCY_MODEL)).toBeLessThan(12); // le cas de la démo (12 mois) est désormais impossible
    expect(vacancyCapMonths(0.2, 1.0, VACANCY_MODEL)).toBeLessThan(vacancyCapMonths(0.2, 1.15, VACANCY_MODEL)); // baisser le loyer resserre le plafond
    expect(vacancyCapMonths(1, 0.7, VACANCY_MODEL)).toBe(1); // jamais moins d'un mois
  });
  it('moyenne réelle plafond compris = formule exacte, confirmée par simulation', () => {
    for (const [t, r] of [[0.2, 1.15], [0.85, 1], [0.5, 0.9]] as const) {
      const rng = createRng(4242 + Math.round(t * 100));
      const xs = Array.from({ length: 100000 }, () => simulateVacancyMonths(rng, t, r, VACANCY_MODEL));
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      expect(Math.abs(mean - expectedCappedVacancyMonths(t, r, VACANCY_MODEL))).toBeLessThan(0.05);
      expect(expectedCappedVacancyMonths(t, r, VACANCY_MODEL)).toBeLessThan(expectedVacancyMonths(t, r, VACANCY_MODEL));
    }
  });
  it('décision mensuelle : tirage sous la probabilité = locataire ; au plafond = locataire à coup sûr', () => {
    const p = monthlyLetProbability(0.5, 1, VACANCY_MODEL);
    expect(isTenantFound(p - 1e-9, 0.5, 1, 0, VACANCY_MODEL)).toBe(true);
    expect(isTenantFound(p + 1e-9, 0.5, 1, 0, VACANCY_MODEL)).toBe(false);
    const cap = vacancyCapMonths(0.5, 1, VACANCY_MODEL);
    expect(isTenantFound(0.999999, 0.5, 1, cap, VACANCY_MODEL)).toBe(true);
    expect(isTenantFound(0.999999, 0.5, 1, cap - 1, VACANCY_MODEL)).toBe(false);
  });
  it('simulation : déterministe par graine, bornée par le plafond, plus courte quand le loyer baisse', () => {
    const run = (seed: number, tension: number, ratio: number, n: number) => {
      const rng = createRng(seed);
      return Array.from({ length: n }, () => simulateVacancyMonths(rng, tension, ratio, VACANCY_MODEL));
    };
    expect(run(7, 0.3, 1, 50)).toEqual(run(7, 0.3, 1, 50));
    expect(run(7, 0.3, 1, 50)).not.toEqual(run(8, 0.3, 1, 50));
    const samples = run(1, 0.2, 1.15, 20000);
    expect(Math.max(...samples)).toBeLessThanOrEqual(vacancyCapMonths(0.2, 1.15, VACANCY_MODEL));
    expect(Math.min(...samples)).toBe(0);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(run(2, 0.2, 0.9, 20000))).toBeLessThan(mean(run(2, 0.2, 1, 20000)));
    expect(mean(run(2, 0.2, 1, 20000))).toBeLessThan(mean(run(2, 0.2, 1.15, 20000)));
    expect(mean(run(3, 0.9, 1, 20000))).toBeLessThan(mean(run(3, 0.2, 1, 20000)));
  });
});

describe('révision annuelle (IRL) : le joueur ne fixe pas la hausse', () => {
  it('applique la variation de l\'indice', () => {
    const r = reviseRent(600, 2, 'D');
    expect(r).toMatchObject({ applied: true, newRent: 612, appliedPct: 2, reason: 'APPLIED' });
  });
  it('gel des loyers pour les classes F et G', () => {
    for (const c of ['F', 'G'] as const) {
      const r = reviseRent(600, 3, c);
      expect(r).toMatchObject({ applied: false, newRent: 600, reason: 'FROZEN_ENERGY_F_G' });
    }
    expect(reviseRent(600, 3, 'E').applied).toBe(true);
  });
  it('variation nulle ou négative : aucune révision', () => {
    expect(reviseRent(600, 0, 'C').reason).toBe('NO_INCREASE');
    expect(reviseRent(600, -0.5, 'C')).toMatchObject({ applied: false, newRent: 600 });
  });
  it('à la relocation, un logement F/G ne peut pas dépasser le dernier loyer', () => {
    expect(capRentAtRelet(700, 600, 'F')).toBe(600);
    expect(capRentAtRelet(550, 600, 'G')).toBe(550);
    expect(capRentAtRelet(700, 600, 'C')).toBe(700);
  });
  it('plusieurs années de suite : la hausse cumulée suit exactement l\'indice', () => {
    let rent = 500;
    for (const irl of [1.2, 0.8, 2.5]) rent = reviseRent(rent, irl, 'C').newRent;
    expect(rent).toBeCloseTo(500 * 1.012 * 1.008 * 1.025, 1);
  });
});

describe('fiscalité des loyers (base réelle simplifiée)', () => {
  it('taux sur les loyers encaissés', () => {
    expect(computeRentTax(1000, 30)).toBe(300);
    expect(computeRentTax(0, 30)).toBe(0);
    expect(computeRentTax(-500, 30)).toBe(0); // jamais négatif
    expect(computeRentTax(1000, 0)).toBe(0);
    expect(() => computeRentTax(1000, 120)).toThrow(EngineInputError);
  });
  it('chaque profil a un taux configuré', () => {
    for (const p of Object.keys(STARTING_PROFILES)) expect(RENT_TAX_RATE_BY_PROFILE[p as keyof typeof RENT_TAX_RATE_BY_PROFILE]).toBeGreaterThanOrEqual(0);
  });
});

describe('impôt annuel sur les loyers : base réelle simplifiée, réglé en décembre', () => {
  const inp: MonthlyInput = {
    year: 2015, month: 12, status: 'paying', rent: 600, recoverableCharges: 40,
    nonRecoverableAnnual: { condoFees: 300, propertyTax: 500, insurance: 120, maintenance: 280 }, // 100 €/mois
    loanPayment: 400, loanBreakdown: { interest: 150, principal: 230, insurance: 20 }, tax: NO_TAX,
  };
  it('base = loyers − charges non récupérables − intérêts − assurance emprunteur (taxe foncière comprise dans les charges)', () => {
    const s = buildMonthlyStatement(inp);
    expect(s.lines.taxableIncome).toBe(330); // 600 − 100 − 150 − 20 ; le capital remboursé n'est PAS déductible
  });
  it('pas d\'impôt les mois ordinaires ; règlement en décembre sur le cumul de l\'année', () => {
    const ordinary = buildMonthlyStatement({ ...inp, month: 5, tax: { ytdBefore: 2000, ratePct: 30, settleThisMonth: false } });
    expect(ordinary.lines.rentTax).toBe(0);
    expect(ordinary.lines.taxableIncomeYtd).toBe(2330);
    expect(ordinary.taxableIncomeYtdCarry).toBe(2330);
    const dec = buildMonthlyStatement({ ...inp, tax: { ytdBefore: 2000, ratePct: 30, settleThisMonth: true } });
    expect(dec.lines.rentTax).toBe(699); // 30 % × 2 330
    expect(dec.taxableIncomeYtdCarry).toBe(0); // remise à zéro pour l'année suivante
    const e = dec.explanations.find((x) => x.code === 'TAX_SETTLED')!;
    expect(e.cashFlowImpact).toBe(-699);
    expect(e.message).toContain('2330,00 €');
    expect(e.message).toContain('30,0 %');
  });
  it('JAMAIS NÉGATIF : une année déficitaire ne donne aucun impôt (et pas de remboursement)', () => {
    const dec = buildMonthlyStatement({ ...inp, tax: { ytdBefore: -3000, ratePct: 47.2, settleThisMonth: true } });
    expect(dec.lines.rentTax).toBe(0);
    expect(dec.explanations.find((x) => x.code === 'TAX_SETTLED')!.message).toContain('Aucun impôt');
    expect(dec.lines.netCashFlow).toBe(dec.normalMonthCashFlow + 0);
  });
  it('un mois déficitaire compense un mois excédentaire dans la même année', () => {
    const bad = buildMonthlyStatement({ ...inp, month: 3, status: 'vacant', tax: NO_TAX });
    expect(bad.lines.taxableIncome).toBe(-270); // pas de loyer, mais charges, intérêts et assurance restent déductibles
    // un seul mois vide : 330 − 270 = 60 € imposables
    expect(buildMonthlyStatement({ ...inp, tax: { ytdBefore: -270, ratePct: 30, settleThisMonth: true } }).lines.rentTax).toBe(18);
    // trois mois vides : −810 + 330 < 0 → aucun impôt
    expect(buildMonthlyStatement({ ...inp, tax: { ytdBefore: -810, ratePct: 30, settleThisMonth: true } }).lines.rentTax).toBe(0);
  });
  it('l\'impôt réduit le cash-flow du mois de règlement, et la somme des impacts reste exacte', () => {
    const s = buildMonthlyStatement({ ...inp, tax: { ytdBefore: 1000, ratePct: 47.2, settleThisMonth: true } });
    expect(s.lines.netCashFlow).toBeCloseTo(s.normalMonthCashFlow - s.lines.rentTax, 2);
    expect(s.explanations.reduce((a, e) => a + e.cashFlowImpact, 0)).toBeCloseTo(s.lines.netCashFlow - s.normalMonthCashFlow, 1);
  });
});

describe('conversion euros → InvestCoins : ni perte ni création', () => {
  const C = EUROS_PER_COIN; // 1 € : règle actuelle du jeu
  it('règle actuelle (1 InvestCoin = 1 €) : exemples chiffrés', () => {
    expect(C).toBe(1);
    expect(convertEurosToCoins(0, toCents(25.4), C)).toEqual({ coins: 25, remainderCents: 40 });  // 25,40 € = 25 InvestCoins + 0,40 € en attente
    expect(convertEurosToCoins(60, toCents(0.5), C)).toEqual({ coins: 1, remainderCents: 10 });   // 0,60 + 0,50 = 1,10 €
    expect(convertEurosToCoins(0, toCents(0.99), C)).toEqual({ coins: 0, remainderCents: 99 });
    expect(convertEurosToCoins(99, 1, C)).toEqual({ coins: 1, remainderCents: 0 });               // pile 1 €
  });
  it('règle actuelle : déficit arrondi contre le joueur (jamais de débit « offert »)', () => {
    expect(convertEurosToCoins(0, toCents(-5.5), C)).toEqual({ coins: -6, remainderCents: 50 });  // −5,50 € débite 6 InvestCoins, 0,50 € de crédit en attente
    expect(convertEurosToCoins(50, toCents(-5), C)).toEqual({ coins: -5, remainderCents: 50 });
    expect(convertEurosToCoins(0, toCents(-0.01), C)).toEqual({ coins: -1, remainderCents: 99 });
  });
  it('le moteur reste correct pour un autre taux (ancien taux de 20 € par pièce, exemples inchangés)', () => {
    expect(convertEurosToCoins(0, toCents(25), 20)).toEqual({ coins: 1, remainderCents: 500 });
    expect(convertEurosToCoins(1500, toCents(6), 20)).toEqual({ coins: 1, remainderCents: 100 });
    expect(convertEurosToCoins(1999, 1, 20)).toEqual({ coins: 1, remainderCents: 0 });
    expect(convertEurosToCoins(0, toCents(-5), 20)).toEqual({ coins: -1, remainderCents: 1500 });
    expect(convertEurosToCoins(500, toCents(-25), 20)).toEqual({ coins: -1, remainderCents: 0 });
  });
  it('les centimes flottants ne dérivent pas', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1234.565)).toBe(123457);
  });
  it('INVARIANT sur 20 000 opérations aléatoires : pièces × (€ par pièce) + reliquat = somme exacte des euros', () => {
    const rng = createRng(2026);
    let remainder = 0, coinsTotal = 0, centsTotal = 0;
    for (let i = 0; i < 20000; i++) {
      const amount = Math.round((rng() - 0.35) * 200000); // −700 € … +1300 €, en centimes
      const r = convertEurosToCoins(remainder, amount, C);
      coinsTotal += r.coins; centsTotal += amount; remainder = r.remainderCents;
      expect(remainder).toBeGreaterThanOrEqual(0);
      expect(remainder).toBeLessThan(C * 100);
    }
    expect(coinsTotal * C * 100 + remainder).toBe(centsTotal);
  });
  it('loyers seuls (positifs) : jamais plus de pièces que d\'euros / EUROS_PER_COIN', () => {
    const rng = createRng(99);
    let remainder = 0, coins = 0, cents = 0;
    for (let i = 0; i < 5000; i++) {
      const amount = Math.round(rng() * 90000);
      const r = convertEurosToCoins(remainder, amount, C);
      coins += r.coins; cents += amount; remainder = r.remainderCents;
    }
    expect(coins).toBeLessThanOrEqual(Math.floor(cents / (C * 100)));
    expect(coins).toBe(Math.floor(cents / (C * 100))); // et aucune pièce n'est perdue non plus
  });
  it('entrées invalides', () => {
    expect(() => convertEurosToCoins(0.5 as any, 100, C)).toThrow(EngineInputError);
    expect(() => convertEurosToCoins(2000, 0, C)).toThrow(EngineInputError);
    expect(() => convertEurosToCoins(0, 100, 0)).toThrow(EngineInputError);
  });
});

describe('ventilation de la mensualité : capital, intérêts, assurance', () => {
  const inp: MonthlyInput = {
    year: 2015, month: 3, status: 'paying', rent: 600, recoverableCharges: 40,
    nonRecoverableAnnual: { condoFees: 300, propertyTax: 500, insurance: 120, maintenance: 280 },
    loanPayment: 554.6 + 12.5, tax: NO_TAX,
    loanBreakdown: { interest: 250, principal: 304.6, insurance: 12.5 },
  };
  it('les trois parts sont dans le récapitulatif et leur somme est la mensualité', () => {
    const s = buildMonthlyStatement(inp);
    expect(s.lines.loanInterest).toBe(250);
    expect(s.lines.loanPrincipal).toBe(304.6);
    expect(s.lines.loanInsurance).toBe(12.5);
    expect(s.lines.loanInterest + s.lines.loanPrincipal + s.lines.loanInsurance).toBeCloseTo(s.lines.loanPayment, 2);
  });
  it('le cash-flow ne change pas : seule la mensualité totale compte', () => {
    expect(buildMonthlyStatement(inp).lines.netCashFlow).toBe(buildMonthlyStatement({ ...inp, loanBreakdown: undefined }).lines.netCashFlow);
  });
  it('ventilation incohérente : erreur', () => {
    expect(() => buildMonthlyStatement({ ...inp, loanBreakdown: { interest: 1, principal: 1, insurance: 1 } })).toThrow(EngineInputError);
  });
});

describe('récapitulatif mensuel', () => {
  const input: MonthlyInput = {
    year: 2015, month: 3, status: 'paying', rent: 600, recoverableCharges: 40,
    nonRecoverableAnnual: { condoFees: 300, propertyTax: 500, insurance: 120, maintenance: 280 }, // 1 200 €/an = 100 €/mois
    loanPayment: 400, tax: { ytdBefore: 0, ratePct: 30, settleThisMonth: false },
  };
  it('mois normal : chaque ligne et le cash-flow net', () => {
    const s = buildMonthlyStatement(input);
    expect(s.lines).toEqual({
      rentDue: 600, rentCollected: 600, recoverableChargesPaid: 40, recoverableChargesCollected: 40,
      nonRecoverableCharges: 100, loanPayment: 400, loanInterest: 0, loanPrincipal: 0, loanInsurance: 0,
      depositReceived: 0, depositRefunded: 0, repairCosts: 0, reletFees: 0, unexpectedWorks: 0, gliPremium: 0, gliReimbursed: 0,
      taxableIncome: 500, taxableIncomeYtd: 500, rentTax: 0, // 600 − 100 de charges non récupérables ; l'impôt est réglé en décembre
      netCashFlow: 100, // 600 + 40 − 40 − 100 − 400
    });
    expect(s.explanations.map((e) => e.code)).toEqual(['NORMAL']);
    expect(s.normalMonthCashFlow).toBe(100);
  });
  it('assurance loyers impayés : la prime réduit le cash-flow ET la base imposable (déductible) ; rien à payer sur un logement vide', () => {
    const paying = buildMonthlyStatement({ ...input, gliPremium: 19.2 }); // 3 % de (600 + 40)
    expect(paying.lines.gliPremium).toBe(19.2);
    expect(paying.lines.netCashFlow).toBeCloseTo(100 - 19.2, 2);
    expect(paying.lines.taxableIncome).toBeCloseTo(500 - 19.2, 2);
    expect(paying.normalMonthCashFlow).toBeCloseTo(100 - 19.2, 2); // la prime fait partie du « mois normal »
    const vacant = buildMonthlyStatement({ ...input, status: 'vacant', gliPremium: 19.2 });
    expect(vacant.lines.gliPremium).toBe(0);
  });
  it('assurance loyers impayés : remboursement expliqué, imposable, et somme des impacts = écart au mois normal', () => {
    const s = buildMonthlyStatement({ ...input, status: 'defaulting', gliPremium: 19.2, gliReimbursed: { rent: 1200, charges: 80 } });
    expect(s.lines.gliReimbursed).toBe(1280);
    expect(s.lines.taxableIncome).toBeCloseTo(0 + 1280 - 19.2 - 100, 2); // rien encaissé du locataire ; assurance imposable, prime et charges déduites
    const codes = s.explanations.map((e) => e.code);
    expect(codes).toContain('ARREARS');
    expect(codes).toContain('GLI_REIMBURSED');
    const sum = s.explanations.reduce((a, e) => a + e.cashFlowImpact, 0);
    expect(sum).toBeCloseTo(s.lines.netCashFlow - s.normalMonthCashFlow, 2);
    expect(() => buildMonthlyStatement({ ...input, gliPremium: -1 })).toThrow(EngineInputError);
  });
  it('charges récupérables et non récupérables distinguées', () => {
    const s = buildMonthlyStatement({ ...input, status: 'vacant', vacancyMonthsSoFar: 2 });
    expect(s.lines.recoverableChargesPaid).toBe(40);     // avancées par le propriétaire
    expect(s.lines.recoverableChargesCollected).toBe(0); // rien à refacturer
    expect(s.lines.nonRecoverableCharges).toBe(100);
  });
  it('vacance : loyer non perçu, charges à ta charge, impôt nul, explication chiffrée', () => {
    const s = buildMonthlyStatement({ ...input, status: 'vacant', vacancyMonthsSoFar: 2 });
    expect(s.lines.rentCollected).toBe(0);
    expect(s.lines.rentTax).toBe(0);
    expect(s.lines.netCashFlow).toBe(-540); // −40 − 100 − 400
    const e = s.explanations.find((x) => x.code === 'VACANCY')!;
    expect(e.cashFlowImpact).toBe(-640); // −600 de loyer − 40 de charges avancées
    expect(e.message).toContain('mois n°2');
  });
  it('retard : simple décalage de trésorerie, rattrapé le mois suivant', () => {
    const late = buildMonthlyStatement({ ...input, status: 'late' });
    expect(late.carryOverToNextMonth).toEqual({ rent: 600, charges: 40 });
    expect(late.lines.rentCollected).toBe(0);
    const next = buildMonthlyStatement({ ...input, month: 4, carryOverIn: late.carryOverToNextMonth });
    expect(next.lines.rentCollected).toBe(1200);
    expect(next.lines.recoverableChargesCollected).toBe(80);
    expect(next.explanations.map((e) => e.code)).toContain('CATCH_UP');
    // Sur les deux mois, le total encaissé est celui de deux mois normaux
    expect(late.lines.netCashFlow + next.lines.netCashFlow).toBe(100 * 2);
  });
  it('impayé : dette enregistrée, rien encaissé', () => {
    const s = buildMonthlyStatement({ ...input, status: 'defaulting' });
    expect(s.unpaidAdded).toEqual({ rent: 600, charges: 40 });
    expect(s.lines.rentCollected).toBe(0);
    expect(s.explanations[0].code).toBe('ARREARS');
    const rec = buildMonthlyStatement({ ...input, month: 8, arrearsRecovered: { rent: 600, charges: 40 } });
    expect(rec.explanations.map((e) => e.code)).toContain('ARREARS_RECOVERED');
  });
  it('indexation : montant exact de la hausse, nette d\'impôt', () => {
    const revision = reviseRent(600, 2, 'C');
    const s = buildMonthlyStatement({ ...input, rent: revision.newRent, revision });
    const e = s.explanations.find((x) => x.code === 'INDEXATION')!;
    expect(e.cashFlowImpact).toBe(12); // l'impôt est réglé séparément, en décembre
    expect(e.message).toContain('IRL');
    expect(e.message).toContain('tu ne la fixes pas');
    expect(s.lines.netCashFlow).toBeCloseTo(100 + 12, 2);
  });
  it('gel F/G : expliqué', () => {
    const revision = reviseRent(600, 2, 'F');
    const s = buildMonthlyStatement({ ...input, revision });
    expect(s.explanations[0].code).toBe('INDEXATION_FROZEN');
    expect(s.explanations[0].message).toContain('gelé');
  });
  it('pas de révision sur un logement vide', () => {
    expect(() => buildMonthlyStatement({ ...input, status: 'vacant', revision: reviseRent(600, 2, 'C') })).toThrow(EngineInputError);
  });
  it('PROPRIÉTÉ : la somme des impacts expliqués = écart exact avec un mois normal', () => {
    const rng = createRng(31);
    const statuses = ['paying', 'late', 'defaulting', 'vacant'] as const;
    for (let i = 0; i < 500; i++) {
      const status = statuses[Math.floor(rng() * 4)];
      const rent = Math.round(300 + rng() * 1500);
      const revision = status !== 'vacant' && rng() < 0.4 ? reviseRent(rent, rng() * 3, rng() < 0.2 ? 'F' : 'C') : undefined;
      const inp: MonthlyInput = {
        ...input, status, rent: revision ? revision.newRent : rent, revision,
        recoverableCharges: Math.round(rng() * 80), loanPayment: Math.round(rng() * 900),
        tax: { ytdBefore: Math.round((rng() - 0.3) * 4000), ratePct: Math.round(rng() * 47), settleThisMonth: rng() < 0.3 },
        carryOverIn: rng() < 0.3 ? { rent: Math.round(rng() * 900), charges: 30 } : undefined,
        arrearsRecovered: rng() < 0.2 ? { rent: Math.round(rng() * 900), charges: 10 } : undefined,
      };
      const s = buildMonthlyStatement(inp);
      const sum = s.explanations.reduce((a, e) => a + e.cashFlowImpact, 0);
      expect(Math.abs(sum - (s.lines.netCashFlow - s.normalMonthCashFlow))).toBeLessThan(0.011);
    }
  });
});
