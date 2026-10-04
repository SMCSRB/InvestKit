import { describe, it, expect } from 'vitest';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { getRealEstateDataSource } from '../src/data/realEstate';
import { computeAcquisition, evaluatePurchase, ProfileId } from '../src/engine/immo';
import { BANK_RULES, NOTARY_RULE, STARTING_PROFILES, LOAN_INSURANCE_RATE_PCT, loanApplicationFee, PARKING_RULES } from '../src/config/immoRules';
import { EUROS_PER_COIN } from '../src/config/economy';
import { legacyCoins } from './helpers';
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
        expect(l.price).toBeGreaterThan(l.type === 'parking' ? 1500 : 5000);   // un parking coûte quelques milliers de pièces
        expect(l.surfaceSqm).toBeGreaterThanOrEqual(10);
        expect(l.marketRentMonthly).toBeGreaterThan(l.type === 'parking' ? 15 : 50);   // un parking se loue quelques dizaines d'euros
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
// catalogue de départ, chaque année », AVEC les règles de la banque : apport
// minimum = frais de notaire, durée ≤ 25 ans, loyer prévisionnel retenu à 70 %.
// Apport de départ : 10 000 € (le capital de départ). Prêt sur 25 ans. Travaux annoncés financés.
describe('chaque profil peut acheter au moins un bien, chaque année (règles complètes)', () => {
  const DOWN_PAYMENT = legacyCoins(500) * EUROS_PER_COIN; // 10 000 € d'apport : le capital de départ
  const profiles = Object.keys(STARTING_PROFILES) as ProfileId[];

  const evaluate = async (profile: ProfileId, l: Awaited<ReturnType<typeof src.listListings>>[number], year: number) => {
    const p = STARTING_PROFILES[profile];
    return evaluatePurchase({
      household: { profile, salary: p.netMonthlyIncome, livingCharges: p.livingCharges },
      price: l.price, age: l.age, works: l.advertisedWorks, projectedMonthlyRent: l.marketRentMonthly,
      downPayment: Math.min(DOWN_PAYMENT, computeAcquisition({ price: l.price, age: l.age, works: l.advertisedWorks, notaryRule: NOTARY_RULE }).totalCost),
      loanMonths: 300, annualRatePct: await src.getLoanRatePct(year, 300),
      insuranceRatePct: LOAN_INSURANCE_RATE_PCT, notaryRule: NOTARY_RULE, bankRules: BANK_RULES, loanFees: loanApplicationFee,
    });
  };

  for (const profile of profiles) {
    it(`profil ${profile}`, async () => {
      for (const year of YEARS) {
        let buyable = 0;
        for (const l of await src.listListings(year)) {
          if ((await evaluate(profile, l, year)).approved) buyable++;
        }
        expect(buyable, `${profile} en ${year}`).toBeGreaterThan(0);
      }
    });
  }

  it('les profils ont un pouvoir d\'achat croissant (étudiant ≤ salarié ≤ cadre)', async () => {
    const counts: number[] = [];
    for (const profile of profiles) {
      let n = 0;
      for (const l of await src.listListings(2018)) if ((await evaluate(profile, l, 2018)).approved) n++;
      counts.push(n);
    }
    expect(counts[0]).toBeLessThanOrEqual(counts[1]);
    expect(counts[1]).toBeLessThanOrEqual(counts[2]);
  });

  it('la règle d\'apport minimum rejette bien des achats (ce n\'est pas un test vide)', async () => {
    let refusedForDownPayment = 0;
    for (const l of await src.listListings(2018)) {
      const e = await evaluate('executive', l, 2018);
      if (e.assessment.reasons.some((r) => r.code === 'DOWN_PAYMENT_TOO_LOW')) refusedForDownPayment++;
    }
    expect(refusedForDownPayment).toBeGreaterThan(5);
  });
});

// ── Modèle de loyers dans le catalogue (jamais figé annonce par annonce) ──
import { estimateMarketRent, averageVacancyPct } from '../src/engine/immo';
import { RENT_MODEL, VACANCY_MODEL } from '../src/config/immoRules';

describe('catalogue : loyer calculé à partir du lieu, jamais figé', () => {
  it('chaque loyer = surface × loyer/m² du quartier × taille × état × énergie', async () => {
    for (const year of [2010, 2018, 2026]) {
      for (const l of await src.listListings(year)) {
        const market = (await src.getMarket(l.cityId, year))!;
        const nbh = (await src.listNeighborhoods(l.cityId)).find((n) => n.id === l.neighborhoodId)!;
        const expected = estimateMarketRent(
          { surfaceSqm: l.surfaceSqm, cityRentPerSqm: market.rentPerSqm, neighborhoodRentMultiplier: nbh.rentMultiplier, condition: l.condition, energyClass: l.energyClass, unitRentFactor: l.type === 'parking' ? PARKING_RULES.rentFactor : 1 },
          RENT_MODEL
        );
        expect(l.rentPerSqm).toBe(expected.rentPerSqm);
        expect(l.marketRentMonthly).toBe(Math.round(expected.monthlyRent));
      }
    }
  });

  it('le même bien voit son loyer évoluer avec le marché de sa ville', async () => {
    const a = (await src.getListing('marvelle-2', 2010))!;
    const b = (await src.getListing('marvelle-2', 2026))!;
    expect(a.surfaceSqm).toBe(b.surfaceSqm);
    expect(b.marketRentMonthly).not.toBe(a.marketRentMonthly);
    expect(b.rentPerSqm / a.rentPerSqm).toBeCloseTo(
      (await src.getMarket('marvelle', 2026))!.rentPerSqm / (await src.getMarket('marvelle', 2010))!.rentPerSqm, 2
    );
  });

  it('chaque ville a des quartiers ; les annonces pointent vers un quartier existant', async () => {
    for (const c of await src.listCities()) {
      const nbhs = await src.listNeighborhoods(c.id);
      expect(nbhs.length).toBeGreaterThanOrEqual(3);
    }
    expect(await src.listNeighborhoods('nope')).toEqual([]);
    for (const l of await src.listListings(2015)) {
      const ids = (await src.listNeighborhoods(l.cityId)).map((n) => n.id);
      expect(ids).toContain(l.neighborhoodId);
    }
  });

  it('le centre est plus cher, plus tendu et moins vacant que la périphérie', async () => {
    const nb = await src.listNeighborhoods('valcourt');
    const centre = nb.find((n) => n.id.endsWith('centre'))!;
    const peri = nb.find((n) => n.id.endsWith('peripherie'))!;
    expect(centre.rentMultiplier).toBeGreaterThan(peri.rentMultiplier);
    expect(centre.priceMultiplier).toBeGreaterThan(peri.priceMultiplier);
    expect(centre.tensionOffset).toBeGreaterThan(peri.tensionOffset);
    const ls = await src.listListings(2018);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const c = ls.filter((l) => l.neighborhoodId.endsWith('centre'));
    const p = ls.filter((l) => l.neighborhoodId.endsWith('peripherie'));
    expect(c.length).toBeGreaterThan(3);
    expect(p.length).toBeGreaterThan(3);
    expect(mean(c.map((l) => l.rentalTension))).toBeGreaterThan(mean(p.map((l) => l.rentalTension)));
    expect(mean(c.map((l) => l.vacancyPct))).toBeLessThan(mean(p.map((l) => l.vacancyPct)));
  });

  it('tension et vacance cohérentes : ville tendue = vacance faible', async () => {
    const tight = (await src.getMarket('marvelle', 2018))!;
    const loose = (await src.getMarket('brumevalle', 2018))!;
    expect(tight.rentalTension).toBeGreaterThan(loose.rentalTension);
    expect(tight.vacancyPct).toBeLessThan(loose.vacancyPct);
    for (const c of await src.listCities()) {
      for (const year of YEARS) {
        const m = (await src.getMarket(c.id, year))!;
        expect(m.rentalTension).toBeGreaterThanOrEqual(0);
        expect(m.rentalTension).toBeLessThanOrEqual(1);
        expect(m.vacancyPct).toBe(averageVacancyPct(m.rentalTension, 36, VACANCY_MODEL));
      }
    }
  });

  it('charges récupérables distinguées des charges non récupérables', async () => {
    for (const l of await src.listListings(2015)) {
      expect(l.recoverableChargesMonthly).toBeGreaterThan(0);
      expect(l.annualCharges).toHaveProperty('condoFees');
      expect(l.annualCharges).not.toHaveProperty('recoverable');
    }
  });

  it('IRL : une valeur plausible pour chaque année, hors plage refusée', async () => {
    for (const year of YEARS) {
      const v = await src.getIrlAnnualChangePct(year);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(3.5);
    }
    await expect(src.getIrlAnnualChangePct(2009)).rejects.toThrow(RangeError);
  });
});

describe('catalogue fictif : annonces proches de l\'équilibre', () => {
  // Cash-flow mensuel attendu après impôt (sans aléas), prêt 25 ans, 30 % d'apport, impôt 28,2 %.
  it('chaque ville propose au moins 2 annonces à ≥ −30 €/mois (année 2010, 30 % d\'apport) ; les loyers ne sont pas modifiés', async () => {
    const { computeMonthlyPayment } = await import('../src/engine/immo');
    const year = 2010;
    const rate = await src.getLoanRatePct(year, 300);
    const listings = await src.listListings(year);
    const good: Record<string, number> = {};
    for (const l of listings) {
      const b = computeAcquisition({ price: l.price, age: l.age, works: l.advertisedWorks, notaryRule: NOTARY_RULE });
      const loan = b.totalCost - (b.notaryFees + 0.3 * l.price);
      const pay = computeMonthlyPayment(loan, rate, 300) + (loan * LOAN_INSURANCE_RATE_PCT) / 100 / 12;
      const rent = l.marketRentMonthly * (1 - l.vacancyPct / 100);
      const nonrec = Object.values(l.annualCharges).reduce((a, x) => a + x, 0) / 12;
      const tax = 0.282 * Math.max(0, rent - nonrec - ((loan * rate) / 100 / 12) * 0.95);
      if (rent - nonrec - pay - tax >= -30) good[l.cityId] = (good[l.cityId] ?? 0) + 1;
    }
    for (const c of await src.listCities()) expect(good[c.id] ?? 0).toBeGreaterThanOrEqual(2);
  });
  it('les ventes pressées sont signalées dans le titre', async () => {
    const l = (await src.listListings(2010)).find((x) => x.id === 'marvelle-6')!;
    expect(l.title).toContain('vente pressée');
  });
});

describe('valeur verte : la classe énergétique (DPE) influence le prix et la valeur', () => {
  it('facteurs : classe D = référence, points d\'ancrage des sources (appartement G −12 %, maison G −25 %, maison A +17 %), décroissants de A à G', async () => {
    const { GREEN_VALUE_FACTORS, greenValueFactor } = await import('../src/config/immoRules');
    for (const t of ['apartment', 'house'] as const) {
      expect(GREEN_VALUE_FACTORS[t].D).toBe(1);
      const order = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
      for (let i = 1; i < order.length; i++) expect(GREEN_VALUE_FACTORS[t][order[i]]).toBeLessThan(GREEN_VALUE_FACTORS[t][order[i - 1]]);
    }
    expect(GREEN_VALUE_FACTORS.apartment.G).toBe(0.88);
    expect(GREEN_VALUE_FACTORS.house.G).toBe(0.75);
    expect(GREEN_VALUE_FACTORS.house.A).toBe(1.17);
    expect(greenValueFactor('studio', 'G')).toBe(0.88);    // les studios suivent les appartements
    expect(greenValueFactor('house', 'E')).toBe(0.92);
    expect(() => greenValueFactor('house', 'Z' as any)).toThrow(RangeError);
  });
  it('la valeur estimée dépend de la classe ; sans classe fournie, comme avant', async () => {
    const base = { cityId: 'marvelle', neighborhoodId: 'marvelle:centre', type: 'apartment' as const, surfaceSqm: 40, condition: 'good' as const };
    const d = await src.estimateValue({ ...base, energyClass: 'D' }, 2020);
    expect(await src.estimateValue(base, 2020)).toBe(d);
    expect(await src.estimateValue({ ...base, energyClass: 'G' }, 2020)).toBe(Math.round(d * 0.88));
    expect(await src.estimateValue({ ...base, energyClass: 'A' }, 2020)).toBe(Math.round(d * 1.12));
  });
  it('le prix des annonces en tient compte : il reste cohérent avec la valeur estimée (classe comprise)', async () => {
    const ls = await src.listListings(2020);
    const same = ls.filter((l) => l.condition === 'good' && l.type !== 'parking' && !l.title.includes('vente pressée'));
    expect(same.length).toBeGreaterThan(5);
    for (const l of same) {
      const perSqm = l.price / l.surfaceSqm;
      const est = await src.estimateValue({ cityId: l.cityId, neighborhoodId: l.neighborhoodId, type: l.type, surfaceSqm: l.surfaceSqm, condition: l.condition, energyClass: l.energyClass }, 2020);
      expect(Math.abs(l.price - est) / est).toBeLessThan(0.15);   // le prix reste autour de la valeur estimée (bruit propre à chaque annonce, hors ventes pressées)
      expect(perSqm).toBeGreaterThan(0);
    }
    // Parking : la forme (garage, box, place) ajoute ±20 % autour de la valeur de base du type.
    for (const l of ls.filter((x) => x.type === 'parking' && !x.title.includes('vente pressée'))) {
      const est = await src.estimateValue({ cityId: l.cityId, neighborhoodId: l.neighborhoodId, type: 'parking', surfaceSqm: l.surfaceSqm, condition: 'good', energyClass: l.energyClass }, 2020);
      expect(Math.abs(l.price - est) / est).toBeLessThan(0.3);
    }
  });
});
