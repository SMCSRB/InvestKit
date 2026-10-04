// Branchement 5/6 : frais de notaire par département et par date dans le calcul d'achat, pour les annonces qui portent un département (annonces réelles). Le catalogue fictif et le neuf restent inchangés.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { notaryRuleFor, notaryFeesOld } from '../src/engine/immo/notaryDepartment';
import { computeNotaryFees, evaluatePurchase, standardScenario } from '../src/engine/immo';
import { notaryRuleOf, gameDay, listingEconomics, decorateListing, scenarioContext } from '../src/services/realEstateService';
import { NOTARY_RULE, BANK_RULES, STARTING_PROFILES, LOAN_INSURANCE_RATE_PCT, loanApplicationFee } from '../src/config/immoRules';
import { NOTARY_NEW_PCT } from '../src/config/notaryRules';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import type { Listing } from '../src/data/realEstate/types';

const base = async (): Promise<Listing> => (await src.listListings(2015)).find((x) => x.age === 'old' && x.type === 'apartment')!;
const real = async (department: string, price: number, year = 2026, age: 'old' | 'new' = 'old'): Promise<Listing> => ({ ...(await base()), department, price, year, age });

describe('règle exacte pour un prix, un département et une date', () => {
  it('prix × taux (arrondi au centime) = frais calculés par département, AU CENTIME près ; le neuf reste à 2,5 %', () => {
    for (const [price, dep, day] of [[80_000, '21', '2025-06-01'], [200_000, '33', '2025-04-15'], [200_000, '33', '2025-05-01'], [123_456, '06', '2026-01-01'], [450_000, '75', '2025-04-01'], [61_500, '59', '2025-04-30'], [1_000, '13', '2026-01-01']] as const) {
      const rule = notaryRuleFor(price, dep, day);
      expect(computeNotaryFees(price, 'old', rule)).toBe(notaryFeesOld(price, dep, day).total);
      expect(computeNotaryFees(price, 'new', rule)).toBe(Math.round(price * NOTARY_NEW_PCT) / 100);
    }
    expect(() => notaryRuleFor(0, '21', '2025-01-01')).toThrow();
  });
});

describe('règle d\'une annonce', () => {
  it('sans département (catalogue fictif) : taux forfaitaire inchangé ; avec département : calcul par département et par date', async () => {
    const l = await base();
    expect(notaryRuleOf(l)).toBe(NOTARY_RULE);
    const g = await real('33', 200_000, 2025);
    expect(computeNotaryFees(g.price, 'old', notaryRuleOf(g, '2025-04-30'))).toBe(notaryFeesOld(200_000, '33', '2025-04-30').total);     // Gironde : avant le 1er mai 2025
    expect(computeNotaryFees(g.price, 'old', notaryRuleOf(g, '2025-05-01'))).toBe(notaryFeesOld(200_000, '33', '2025-05-01').total);     // après la hausse
    expect(notaryFeesOld(200_000, '33', '2025-05-01').total).toBeGreaterThan(notaryFeesOld(200_000, '33', '2025-04-30').total);
    expect(gameDay(2025, 5)).toBe('2025-05-01'); expect(gameDay(2025, 12)).toBe('2025-12-01');
  });
  it('par défaut, la date est le 1er janvier de l\'année de l\'annonce', async () => {
    const n = await real('06', 150_000, 2026);                      // Alpes-Maritimes : resté à 4,5 %
    expect(computeNotaryFees(n.price, 'old', notaryRuleOf(n))).toBe(notaryFeesOld(150_000, '06', '2026-01-01').total);
  });
});

describe('affichage et achat', () => {
  it('rendement et frais d\'une annonce : le catalogue fictif est INCHANGÉ ; une annonce réelle porte les frais de son département', async () => {
    const cat = await base();
    expect(listingEconomics(cat).notaryFees).toBe(computeNotaryFees(cat.price, cat.age, NOTARY_RULE));
    const old = await real('06', 150_000, 2026); const nw = await real('06', 150_000, 2026, 'new');
    expect(listingEconomics(old).notaryFees).toBe(notaryFeesOld(150_000, '06', '2026-01-01').total);
    expect(listingEconomics(nw).notaryFees).toBe(3750);                                         // neuf : 2,5 % inchangé
  });
  it('scénario standard : frais du département à la date de jeu (ctx.day) ; sans département, le contexte du jeu', async () => {
    const ctx = await scenarioContext(2025);
    const g = await real('33', 200_000, 2025);
    const before = decorateListing(g, { ...ctx, day: '2025-04-30' }) as Record<string, any>;
    const after = decorateListing(g, { ...ctx, day: '2025-05-01' }) as Record<string, any>;
    expect(before.scenario.notaryFees).toBe(notaryFeesOld(200_000, '33', '2025-04-30').total);
    expect(after.scenario.notaryFees).toBe(notaryFeesOld(200_000, '33', '2025-05-01').total);
    const cat = await base();
    expect(standardScenario(cat, ctx).notaryFees).toBe((decorateListing(cat, ctx) as Record<string, any>).scenario.notaryFees);
  });
  it('achat : la banque exige les frais du département au mois de jeu (apport minimal = notaire en entier + part du prix)', async () => {
    const l = await real('21', 90_000, 2025); const p = STARTING_PROFILES.executive;
    const budget = (day: string) => evaluatePurchase({
      household: { profile: 'executive', salary: p.netMonthlyIncome, livingCharges: p.livingCharges, existingDebtPayments: 0, existingRentalIncome: 0 },
      price: l.price, age: 'old', works: 0, projectedMonthlyRent: 0, downPayment: 40_000, loanMonths: 240, annualRatePct: 3.5, insuranceRatePct: LOAN_INSURANCE_RATE_PCT,
      notaryRule: notaryRuleOf(l, day), bankRules: BANK_RULES, loanFees: loanApplicationFee,
    }).budget.notaryFees;
    expect(budget('2025-03-01')).toBe(notaryFeesOld(90_000, '21', '2025-03-01').total);       // Côte-d'Or avant la hausse du 1er avril 2025
    expect(budget('2025-04-01')).toBe(notaryFeesOld(90_000, '21', '2025-04-01').total);
    expect(budget('2025-04-01')).toBeGreaterThan(budget('2025-03-01'));
  });
  it('le plan d\'achat applique la règle de l\'annonce au mois de jeu', () => {
    const code = readFileSync(path.join(__dirname, '..', 'src', 'services', 'realEstateService.ts'), 'utf8');
    expect(code).toContain('notaryRule: notaryRuleOf(listing, gameDay(game.simulated_year, game.simulated_month))');
    expect(code).not.toMatch(/notaryRule: NOTARY_RULE, bankRules: BANK_RULES, loanFees: loanApplicationFee,\n  \};/);
  });
});
