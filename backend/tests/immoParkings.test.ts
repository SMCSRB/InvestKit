// Immobilier : parkings (garage fermé, box, place). Toutes les valeurs de jeu sont NON SOURCÉES, À RECONFIRMER (PARKING_RULES).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, minDownCoins } from './helpers';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { realEstateSaleService as sales } from '../src/services/realEstateSaleService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { PARKING_RULES, TENANCY_MONTHS, greenValueFactor } from '../src/config/immoRules';
import { matchesSearch, grossYieldPct, SEARCH_TYPES } from '../src/engine/immo/listingSearch';
import { describeListing } from '../../app/components/immo/describe.js';

const YEARS = [2010, 2015, 2020, 2026];

describe('parkings : catalogue', () => {
  it('trois formes par ville, déterminisme, sans pièce, sans DPE réel, sans travaux', async () => {
    const a = (await src.listListings(2018)).filter((l) => l.type === 'parking');
    const b = (await src.listListings(2018)).filter((l) => l.type === 'parking');
    expect(a).toEqual(b);
    const cities = await src.listCities();
    expect(a.length).toBe(cities.length * 3);
    for (const l of a) {
      expect(l.rooms).toBe(0);
      expect(l.surfaceSqm).toBeGreaterThanOrEqual(10);
      expect(l.surfaceSqm).toBeLessThanOrEqual(15);
      expect(l.energyClass).toBe(PARKING_RULES.neutralEnergyClass);
      expect(l.condition).toBe('good');
      expect(l.advertisedWorks).toBe(0);
      expect(l.tenancyMonths).toBe(TENANCY_MONTHS.parking);
      expect(['Garage fermé', 'Box', 'Place de parking'].some((f) => l.title.startsWith(f))).toBe(true);
    }
    expect((await src.getExpertise(a[0].id, 2018))!.hiddenDefects).toEqual([]);
  });

  it('ticket d\'entrée faible, rendement brut raisonnable, charges et vacance plus faibles que les logements', async () => {
    for (const year of YEARS) {
      const all = await src.listListings(year);
      const parkings = all.filter((l) => l.type === 'parking');
      const flats = all.filter((l) => l.type === 'apartment' || l.type === 'studio');
      for (const p of parkings) {
        const cheapestFlatHere = Math.min(...flats.filter((f) => f.cityId === p.cityId).map((f) => f.price));
        expect(p.price).toBeLessThan(cheapestFlatHere);   // dans la même ville, un parking coûte moins que le logement le moins cher
        const y = grossYieldPct(p);
        expect(y).toBeGreaterThan(3);
        expect(y).toBeLessThan(13);
      }
      const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const chargesPerSqm = (l: any) => Object.values(l.annualCharges as Record<string, number>).reduce((s, v) => s + v, 0);   // charges annuelles totales (un parking en paie nettement moins)
      expect(avg(parkings.map(chargesPerSqm))).toBeLessThan(avg(flats.map(chargesPerSqm)));
      expect(avg(parkings.map((l) => l.vacancyPct))).toBeLessThan(avg(flats.map((l) => l.vacancyPct)));
    }
  });

  it('pas de DPE : aucune valeur verte, un parking n\'apparaît pas dans un filtre de classe énergie', async () => {
    for (const c of ['A', 'D', 'G'] as const) expect(greenValueFactor('parking', c)).toBe(1);
    const p = (await src.listListings(2018)).find((l) => l.type === 'parking')!;
    const base: any = { sort: 'relevance' };
    expect(matchesSearch(p, { ...base, types: ['parking'] })).toBe(true);
    expect(matchesSearch(p, { ...base, types: ['house'] })).toBe(false);
    expect(matchesSearch(p, { ...base, energy: ['D'] })).toBe(false);
    expect(SEARCH_TYPES).toContain('parking');
  });

  it('la description d\'un parking ne parle ni de pièces ni de DPE, et ne contient jamais « undefined »', async () => {
    const cities = await src.listCities();
    for (const year of [2010, 2026]) {
      for (const l of (await src.listListings(year)).filter((x) => x.type === 'parking')) {
        const text = describeListing(l, cities.find((c) => c.id === l.cityId), { name: l.neighborhoodName });
        expect(text).not.toMatch(/undefined|NaN|null|\[object/);
        expect(text).not.toMatch(/pièce|DPE/);
      }
    }
  });
});

describe.skipIf(!hasDb)('parkings : achat, location, rénovation refusée (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const rejects = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); };

  it('achat d\'un parking : accepté, bien « parking », loyer et mise en location', async () => {
    const uid = await createUser({ balance: 100000, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    const l = (await src.listListings(2010)).find((x) => x.type === 'parking')!;
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
    const prop = (await svc.listProperties(uid)).properties.find((p: any) => p.listing_id === l.id);
    expect(prop.property_type).toBe('parking');
    const r = await life.listForRent(uid, prop.id, 1);
    expect(r.marketRent).toBeCloseTo(l.marketRentMonthly, -1);
    expect(r.expectedVacancyMonths).toBeGreaterThan(0);
  });

  it('la rénovation énergétique est refusée pour un parking (aperçu et action)', async () => {
    const uid = await createUser({ balance: 100000, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    const l = (await src.listListings(2010)).find((x) => x.type === 'parking')!;
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
    const prop = (await svc.listProperties(uid)).properties.find((p: any) => p.listing_id === l.id);
    const prev: any = await sales.renovationPreview(uid, prop.id);
    expect(JSON.stringify(prev)).toMatch(/pas de diagnostic énergétique/);
    const err = await rejects(sales.renovate(uid, prop.id));
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.message).toMatch(/diagnostic énergétique/);
  });
});

describe('parkings : interface', () => {
  it('filtre de type, pas de DPE ni de pièces affichés pour un parking, pas de rénovation énergétique', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const read = (p: string) => readFileSync(join(__dirname, '../../app/components/immo', p), 'utf8');
    expect(read('api.js')).toContain("parking: 'Parking'");
    expect(read('Search.jsx')).toContain("l.type !== 'parking' && <li>");
    expect(read('Detail.jsx')).toContain('const isParking');
    expect(read('Detail.jsx')).toContain('{!isParking && <li><Dpe');
    expect(read('Owned.jsx')).toContain("p.property_type !== 'parking' && { id: 'reno'");
    expect(read('art.jsx')).toContain('viewsFor');
    expect(read('art.jsx')).toContain('ParkingFacade');
  });
});
