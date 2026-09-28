import { describe, it, expect } from 'vitest';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { getRealEstateDataSource } from '../src/data/realEstate';
import {
  computeAcquisition, loanNeeded, buildSchedule, assessLoanApplication, ProfileId,
} from '../src/engine/immo';
import { BANK_RULES, NOTARY_RULE, STARTING_PROFILES, EUROS_PER_COIN } from '../src/config/immoRules';
import { hashString, createRng } from '../src/utils/seededRandom';

const YEARS = Array.from({ length: src.maxYear - src.minYear + 1 }, (_, i) => src.minYear + i);

describe('catalogue fictif : intégrité', () => {
  it('villes : identifiants uniques, toutes marquées fictives', async () => {
    const cities = await src.listCities();
    expect(cities.length).toBeGreaterThanOrEqual(6);
    expect(new Set(cities.map((c) => c.id)).size).toBe(cities.length);
    expect(cities.every((c) => c.fictive)).toBe(true);
  });

  it('annonces : identifiants uniques, valeurs saines pour toutes les années', async () => {
    for (const year of YEARS) {
      const listings = await src.listListings(year);
      expect(listings.length).toBeGreaterThanOrEqual(40);
      expect(new Set(listings.map((l) => l.id)).size).toBe(listings.length);
      for (const l of listings) {
        expect(l.price).toBeGreaterThan(5000);
        expect(l.surfaceSqm).toBeGreaterThan(10);
        expect(l.marketRentMonthly).toBeGreaterThan(50);
        expect(l.advertisedWorks).toBeGreaterThanOrEqual(0);
        expect(Object.values(l.annualCharges).every((v) => v >= 0)).toBe(true);
        expect(await src.getCity(l.cityId)).not.toBeNull();
      }
    }
  });

  it('marché : prix et loyers positifs, vacance plausible, évolution année par année', async () => {
    for (const c of await src.listCities()) {
      let previous: number | null = null;
      for (const year of YEARS) {
        const m = (await src.getMarket(c.id, year))!;
        expect(m.pricePerSqm).toBeGreaterThan(300);
        expect(m.rentPerSqm).toBeGreaterThan(2);
        expect(m.vacancyPct).toBeGreaterThanOrEqual(1);
        expect(m.vacancyPct).toBeLessThanOrEqual(20);
        if (previous !== null) expect(Math.abs(m.pricePerSqm / previous - 1)).toBeLessThan(0.2);
        previous = m.pricePerSqm;
      }
    }
  });

  it('DÉTERMINISME : mêmes appels, mêmes résultats, quel que soit l\'ordre', async () => {
    const a = await src.getMarket('marvelle', 2020);
    await src.getMarket('marvelle', 2026);
    await src.getMarket('valcourt', 2015);
    const b = await src.getMarket('marvelle', 2020);
    expect(b).toEqual(a);
    expect(await src.listListings(2018)).toEqual(await src.listListings(2018));
  });

  it('loyer cohérent avec le prix : rendement brut entre 2 % et 14 %', async () => {
    for (const l of await src.listListings(2018)) {
      const gross = ((l.marketRentMonthly * 12) / l.price) * 100;
      expect(gross).toBeGreaterThan(2);
      expect(gross).toBeLessThan(14);
    }
  });

  it('filtres et tri par prix', async () => {
    const all = await src.listListings(2015);
    expect(all.every((l, i) => i === 0 || all[i - 1].price <= l.price)).toBe(true);
    const city = await src.listListings(2015, { cityId: 'ternelle' });
    expect(city.every((l) => l.cityId === 'ternelle')).toBe(true);
    const cheap = await src.listListings(2015, { maxPrice: 40000 });
    expect(cheap.every((l) => l.price <= 40000)).toBe(true);
    const houses = await src.listListings(2015, { type: 'house' });
    expect(houses.length).toBeGreaterThan(0);
    expect(houses.every((l) => l.type === 'house')).toBe(true);
  });

  it('expertise : ne fuit pas dans l\'annonce, révèle la vérité', async () => {
    const listings = await src.listListings(2015);
    for (const l of listings) expect(l).not.toHaveProperty('hiddenDefects');
    let withDefect = 0;
    for (const l of listings) {
      const e = (await src.getExpertise(l.id, 2015))!;
      expect(e.realWorks).toBeGreaterThanOrEqual(l.advertisedWorks);
      if (e.hiddenDefects.length > 0) {
        withDefect++;
        expect(e.realWorks).toBeGreaterThan(0);
      }
    }
    expect(withDefect).toBeGreaterThan(3);
    expect(withDefect).toBeLessThan(listings.length * 0.6);
  });

  it('entrées invalides : année hors plage, bien ou ville inconnus', async () => {
    await expect(src.listListings(2009)).rejects.toThrow(RangeError);
    await expect(src.getMarket('marvelle', 2027)).rejects.toThrow(RangeError);
    expect(await src.getListing('nope', 2015)).toBeNull();
    expect(await src.getMarket('nope', 2015)).toBeNull();
    expect(await src.getExpertise('nope', 2015)).toBeNull();
    await expect(src.getLoanRatePct(2015, 5)).rejects.toThrow();
  });

  it('taux de crédit : croît avec la durée, jamais négatif', async () => {
    for (const year of YEARS) {
      const r15 = await src.getLoanRatePct(year, 180);
      const r25 = await src.getLoanRatePct(year, 300);
      expect(r25).toBeGreaterThan(r15);
      expect(r15).toBeGreaterThan(0);
    }
    expect(await src.getLoanRatePct(2015, 240)).toBe(2);
  });

  it('point d\'entrée : la source configurée est le catalogue fictif', () => {
    expect(getRealEstateDataSource().id).toBe('fictive');
  });
});

describe('graine déterministe', () => {
  it('même graine = même suite ; graines différentes = suites différentes', () => {
    const a = createRng(hashString('x')); const b = createRng(hashString('x')); const c = createRng(hashString('y'));
    const sa = [a(), a(), a()]; const sb = [b(), b(), b()]; const sc = [c(), c(), c()];
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    expect(sa.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

// Exigence produit : « chaque profil doit pouvoir acheter au moins un bien du
// catalogue de départ ». Achat avec l'apport de départ (500 🪙 × 20 €), prêt
// sur 25 ans, assurance 0,36 %, frais de notaire, travaux annoncés financés.
describe('chaque profil peut acheter au moins un bien, chaque année', () => {
  const DOWN_PAYMENT = 500 * EUROS_PER_COIN;
  const profiles = Object.keys(STARTING_PROFILES) as ProfileId[];

  for (const profile of profiles) {
    it(`profil ${profile}`, async () => {
      const p = STARTING_PROFILES[profile];
      for (const year of YEARS) {
        const rate = await src.getLoanRatePct(year, 300);
        const buyable = [];
        for (const l of await src.listListings(year)) {
          const budget = computeAcquisition({ price: l.price, age: l.age, works: l.advertisedWorks, notaryRule: NOTARY_RULE });
          const principal = loanNeeded(budget.totalCost, DOWN_PAYMENT);
          const s = buildSchedule({ principal, annualRatePct: rate, months: 300, insurance: { annualRatePct: 0.36, basis: 'initial' } });
          const a = assessLoanApplication(
            { profile, salary: p.netMonthlyIncome, livingCharges: p.livingCharges },
            s.monthlyPaymentWithInsurance, BANK_RULES
          );
          if (a.decision !== 'refused') buyable.push({ id: l.id, decision: a.decision });
        }
        expect(buyable.length, `${profile} en ${year}`).toBeGreaterThan(0);
      }
    });
  }

  it('les profils ont un pouvoir d\'achat croissant (étudiant ≤ salarié ≤ cadre)', async () => {
    const counts: number[] = [];
    for (const profile of profiles) {
      const p = STARTING_PROFILES[profile];
      let n = 0;
      for (const l of await src.listListings(2018)) {
        const budget = computeAcquisition({ price: l.price, age: l.age, works: l.advertisedWorks, notaryRule: NOTARY_RULE });
        const s = buildSchedule({ principal: loanNeeded(budget.totalCost, DOWN_PAYMENT), annualRatePct: await src.getLoanRatePct(2018, 300), months: 300, insurance: { annualRatePct: 0.36, basis: 'initial' } });
        if (assessLoanApplication({ profile, salary: p.netMonthlyIncome, livingCharges: p.livingCharges }, s.monthlyPaymentWithInsurance, BANK_RULES).decision !== 'refused') n++;
      }
      counts.push(n);
    }
    expect(counts[0]).toBeLessThanOrEqual(counts[1]);
    expect(counts[1]).toBeLessThanOrEqual(counts[2]);
  });
});
