// Rendement net et flux mensuel affichés sur la carte et la fiche d'une annonce. Calcul PUR, valable pour n'importe quelle source de catalogue :
// on le teste d'abord avec une annonce inventée (comme le ferait un futur catalogue de vraies villes), puis avec le catalogue actuel.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { standardScenario, computeNotaryFees, grossYieldPct, ScenarioContext } from '../src/engine/immo';
import { BANK_RULES, NOTARY_RULE, LOAN_INSURANCE_RATE_PCT, STANDARD_LOAN_MONTHS } from '../src/config/immoRules';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { realEstateService as svc } from '../src/services/realEstateService';
import { realEstateWatchService as watch } from '../src/services/realEstateWatchService';

const root = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const ctx = (annualRatePct = 3, standardMonths = 300): ScenarioContext => ({ annualRatePct, standardMonths, insuranceRatePct: LOAN_INSURANCE_RATE_PCT, notaryRule: NOTARY_RULE, bankRules: BANK_RULES });
// Une annonce « d'un autre catalogue » : aucun lien avec le catalogue fictif.
const inventee = { price: 240000, age: 'old' as const, advertisedWorks: 0, marketRentMonthly: 1100, vacancyPct: 5, annualCharges: { condoFees: 1200, propertyTax: 1500, insurance: 300, maintenance: 900 } };

describe('scénario standard : rendement net et flux mensuel (calcul pur)', () => {
  it('formules : flux = loyer encaissé − charges ÷ 12 − mensualité ; net = (loyers encaissés − charges) ÷ coût total', () => {
    const s = standardScenario(inventee, ctx());
    const notary = computeNotaryFees(inventee.price, inventee.age, NOTARY_RULE);
    expect(s.notaryFees).toBeCloseTo(notary, 1);
    expect(s.totalInvestment).toBeCloseTo(inventee.price + notary, 1);
    expect(s.downPayment).toBeCloseTo(notary * (BANK_RULES.minDownPaymentPctOfNotaryFees / 100) + inventee.price * (BANK_RULES.minDownPaymentPctOfPrice / 100), 1);
    expect(s.loanPrincipal).toBeCloseTo(s.totalInvestment - s.downPayment, 1);
    expect(s.loanMonths).toBe(STANDARD_LOAN_MONTHS);
    const collected = 1100 * 12 * 0.95;
    const charges = 1200 + 1500 + 300 + 900;
    expect(s.collectedMonthlyRent).toBeCloseTo(collected / 12, 1);
    expect(s.monthlyCharges).toBeCloseTo(charges / 12, 1);
    expect(s.monthlyCashFlow).toBeCloseTo(collected / 12 - charges / 12 - s.monthlyLoanPayment, 1);
    expect(s.netYieldPct).toBeCloseTo(((collected - charges) / s.totalInvestment) * 100, 1);
    expect(s.monthlyLoanPayment).toBeGreaterThan(0);
  });
  it('le net est plus bas que le brut dès qu\'il y a des charges, de la vacance ou des frais d\'achat', () => {
    const s = standardScenario(inventee, ctx());
    expect(s.grossYieldPct).not.toBeNull();
    expect(s.netYieldPct!).toBeLessThan(s.grossYieldPct!);
    expect(grossYieldPct(inventee as any)).toBeCloseTo((1100 * 12 / 240000) * 100, 1);
  });
  it('un taux plus haut baisse le flux mensuel ; un loyer plus haut le monte ; jamais NaN', () => {
    const bas = standardScenario(inventee, ctx(2)), haut = standardScenario(inventee, ctx(5));
    expect(haut.monthlyLoanPayment).toBeGreaterThan(bas.monthlyLoanPayment);
    expect(haut.monthlyCashFlow).toBeLessThan(bas.monthlyCashFlow);
    expect(standardScenario({ ...inventee, marketRentMonthly: 2000 }, ctx()).monthlyCashFlow).toBeGreaterThan(bas.monthlyCashFlow);
    for (const v of Object.values(haut)) expect(Number.isNaN(v as number)).toBe(false);
  });
  it('de gros travaux raccourcissent la durée du prêt (règle de la banque) ; loyer nul : flux négatif, pas d\'erreur', () => {
    const gros = standardScenario({ ...inventee, price: 60000, advertisedWorks: 40000 }, ctx(3, 300));
    expect(gros.loanMonths).toBeLessThanOrEqual(BANK_RULES.maxLoanMonthsWithWorks || 300);
    const vide = standardScenario({ ...inventee, marketRentMonthly: 0 }, ctx());
    expect(vide.monthlyCashFlow).toBeLessThan(0);
    expect(vide.netYieldPct).not.toBeNull();
  });
  it('ne dépend d\'aucun champ propre au catalogue fictif : seuls prix, âge, travaux, loyer, vacance et charges sont lus', () => {
    const code = read('backend/src/engine/immo/standardScenario.ts');
    for (const interdit of ['fictiveCatalog', 'cityId', 'neighborhoodId', 'CITIES', 'source()']) expect(code).not.toContain(interdit);
  });
  it('sur tout le catalogue actuel : valeurs finies, net ≤ brut', async () => {
    for (const year of [2010, 2018, 2026]) {
      const c = ctx(await src.getLoanRatePct(year, 300));
      for (const l of await src.listListings(year)) {
        const s = standardScenario(l, c);
        expect(Number.isFinite(s.monthlyCashFlow), l.id).toBe(true);
        if (s.netYieldPct != null && s.grossYieldPct != null) expect(s.netYieldPct, l.id).toBeLessThanOrEqual(s.grossYieldPct + 0.01);
      }
    }
  });
});

describe.skipIf(!hasDb)('annonces servies par le serveur : carte, fiche et favoris portent le net et le flux mensuel', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('recherche, fiche et favoris donnent les mêmes chiffres pour un même bien', async () => {
    const uid = await createUser({ balance: 100000, tier: 'pro', freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    const { listings } = await svc.listListings(uid, {});
    expect(listings.length).toBeGreaterThan(40);
    for (const l of listings as any[]) {
      expect(typeof l.netYieldPct, l.id).toBe('number');
      expect(Number.isFinite(l.monthlyCashFlow), l.id).toBe(true);
      expect(l.scenario.loanMonths).toBe(STANDARD_LOAN_MONTHS);
      expect(l.netYieldPct).toBeLessThanOrEqual(l.grossYieldPct + 0.5);
    }
    const first = (listings as any[])[0];
    const detail: any = await svc.getListingDetail(uid, first.id);
    expect(detail.listing.monthlyCashFlow).toBe(first.monthlyCashFlow);
    expect(detail.listing.netYieldPct).toBe(first.netYieldPct);
    expect(detail.listing.scenario.monthlyLoanPayment).toBe(first.scenario.monthlyLoanPayment);
    await watch.addFavorite(uid, first.id);
    const fav: any = await watch.listFavorites(uid);
    expect(fav.listings[0].monthlyCashFlow).toBe(first.monthlyCashFlow);
  });
});

describe('interface : carte et fiche', () => {
  it('la carte montre le net et le flux avec l\'infobulle ; la fiche montre aussi la mensualité et l\'hypothèse', () => {
    const s = read('app/components/immo/Search.jsx');
    expect(s).toContain('data-testid="card-net-yield"');
    expect(s).toContain('data-testid="card-monthly-flow"');
    expect(s).toContain('<HelpTip term="rendement-net"');
    const d = read('app/components/immo/Detail.jsx');
    for (const id of ['sheet-net-yield', 'sheet-monthly-flow', 'sheet-scenario-note']) expect(d).toContain(`data-testid="${id}"`);
    expect(d).toContain('<HelpTip term="rendement-net"');
    expect(read('app/lib/glossaire.js')).toContain("term: 'Pourquoi le net est plus bas que le brut'");
  });
});
