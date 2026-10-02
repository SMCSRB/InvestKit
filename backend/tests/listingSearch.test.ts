import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseSearch, searchListings, sortListings, toStoredFilters, SearchInputError, pricePerSqm, grossYieldPct, fold, matchesSearch } from '../src/engine/immo';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateWatchService as watch, WATCH_LIMITS } from '../src/services/realEstateWatchService';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { exportUserData } from '../src/services/accountService';

const YEAR = 2010;
let all: Awaited<ReturnType<typeof src.listListings>>;
const places = async () => Object.fromEntries((await src.listCities()).map((c) => [c.id, { cityName: c.name, region: c.region }]));

describe('recherche d\'annonces : validation, filtres, tri (moteur pur)', () => {
  beforeAll(async () => { all = await src.listListings(YEAR); });

  it('rejette les filtres invalides (types, bornes, valeurs hors liste, injections)', () => {
    for (const bad of [{ maxPrice: -1 }, { maxPrice: 'abc' }, { minSurface: 1e12 }, { type: 'castle' }, { types: 'house,x' }, { energy: 'Z' }, { conditions: 'ruined' },
      { sort: 'random' }, { cityId: '../etc' }, { cityId: { $ne: 1 } }, { q: 'x'.repeat(61) }, { q: { a: 1 } }, { urgentOnly: 'maybe' }, { minPrice: 10, maxPrice: 5 }, { minRooms: 99 }, { minYieldPct: 500 }]) {
      expect(() => parseSearch(bad as any), JSON.stringify(bad)).toThrow(SearchInputError);
    }
  });

  it('une liste vide (types, états, DPE) veut dire « pas de filtre »', () => {
    const p = parseSearch({ types: [], conditions: '', energy: [] } as any);
    expect(p.types).toBeUndefined(); expect(p.energy).toBeUndefined(); expect(p.conditions).toBeUndefined();
    const q = parseSearch({ types: [] } as any);
    expect(searchListings(all, q)).toHaveLength(all.length);
  });

  it('accepte l\'ancien format (type, maxPrice, cityId) et normalise', () => {
    const p = parseSearch({ cityId: 'marvelle', type: 'studio', maxPrice: '90000' });
    expect(p).toMatchObject({ cityId: 'marvelle', types: ['studio'], maxPrice: 90000, sort: 'relevance' });
    expect(parseSearch({ types: 'house,studio,house' }).types).toEqual(['house', 'studio']);
    expect(parseSearch({ q: '  Péri\u0007centre  ' }).q).toBe('Péri centre');
  });

  it('chaque filtre ne garde que des annonces qui le respectent', async () => {
    const pl = await places();
    const check = (raw: any, pred: (l: any) => boolean) => {
      const r = searchListings(all, parseSearch(raw), pl);
      expect(r.length, JSON.stringify(raw)).toBeLessThanOrEqual(all.length);
      for (const l of r) expect(pred(l), `${JSON.stringify(raw)} ${l.id}`).toBe(true);
      const excluded = all.filter((l) => !r.includes(l));
      for (const l of excluded) expect(pred(l), `exclue à tort ${l.id}`).toBe(false);
      return r;
    };
    check({ types: 'studio,house' }, (l) => ['studio', 'house'].includes(l.type));
    check({ maxPrice: 150000 }, (l) => l.price <= 150000);
    check({ minPrice: 100000, maxPrice: 200000 }, (l) => l.price >= 100000 && l.price <= 200000);
    check({ minSurface: 40, maxSurface: 80 }, (l) => l.surfaceSqm >= 40 && l.surfaceSqm <= 80);
    check({ minRooms: 3 }, (l) => l.rooms >= 3);
    check({ conditions: 'to_renovate' }, (l) => l.condition === 'to_renovate');
    check({ energy: 'A,B,C' }, (l) => ['A', 'B', 'C'].includes(l.energyClass));
    check({ minYieldPct: 6 }, (l) => grossYieldPct(l) >= 6);
    check({ urgentOnly: 'true' }, (l) => l.urgentSale === true);
    check({ worksOnly: 'true' }, (l) => l.advertisedWorks > 0 || l.condition !== 'good');
    check({ cityId: 'valcourt' }, (l) => l.cityId === 'valcourt');
  });

  it('la recherche libre trouve ville, quartier et région sans tenir compte des accents ni de la casse', async () => {
    const pl = await places();
    expect(searchListings(all, parseSearch({ q: 'MARVELLE' }), pl).every((l) => l.cityId === 'marvelle')).toBe(true);
    expect(searchListings(all, parseSearch({ q: 'pericentre' }), pl).every((l) => l.neighborhoodName === 'Péricentre')).toBe(true);
    expect(searchListings(all, parseSearch({ q: 'bassin minier' }), pl).every((l) => l.cityId === 'brumevalle')).toBe(true);
    expect(searchListings(all, parseSearch({ q: 'zzzzzz' }), pl)).toHaveLength(0);
    expect(fold('Péricentre')).toBe('pericentre');
  });

  it('la recherche ne fabrique rien : une annonce garde exactement ses champs', async () => {
    const r = searchListings(all, parseSearch({}), await places());
    expect(r).toHaveLength(all.length);
    for (const l of r) expect(all.find((a) => a.id === l.id)).toBe(l);
  });

  it('tri : ordre correct pour chaque critère, stable et indépendant de l\'ordre d\'entrée', () => {
    const asc = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
    expect(asc(sortListings(all, 'price_asc').map((l) => l.price))).toBe(true);
    expect(asc(sortListings(all, 'price_desc').map((l) => -l.price))).toBe(true);
    expect(asc(sortListings(all, 'ppsqm_asc').map(pricePerSqm))).toBe(true);
    expect(asc(sortListings(all, 'ppsqm_desc').map((l) => -pricePerSqm(l)))).toBe(true);
    expect(asc(sortListings(all, 'yield_desc').map((l) => -grossYieldPct(l)))).toBe(true);
    const shuffled = [...all].reverse();
    expect(sortListings(shuffled, 'price_asc').map((l) => l.id)).toEqual(sortListings(all, 'price_asc').map((l) => l.id));
    expect(all.length).toBeGreaterThan(20);
  });

  it('champs dérivés = divisions des champs de l\'annonce', () => {
    const l = all[0];
    expect(pricePerSqm(l)).toBeCloseTo(l.price / l.surfaceSqm, 1);
    expect(grossYieldPct(l)).toBeCloseTo(((l.marketRentMonthly * 12) / l.price) * 100, 1);
  });

  it('les filtres enregistrés sont normalisés (ordre stable, sans valeurs vides)', () => {
    const a = toStoredFilters(parseSearch({ maxPrice: '100000', cityId: 'valcourt', urgentOnly: 'false' }));
    expect(a).toEqual({ cityId: 'valcourt', maxPrice: 100000 });
    expect(matchesSearch(all[0], parseSearch({}))).toBe(true);
  });
});

describe.skipIf(!hasDb)('API Immobilier : filtres via le service, favoris et recherches enregistrées (anti-IDOR)', () => {
  let a: string; let b: string;
  beforeAll(async () => {
    await setupDb();
    a = await createUser({ balance: 1000, freeDomain: 'real_estate' }); b = await createUser({ balance: 1000, freeDomain: 'real_estate' });
    await svc.startGame(a, 'employee'); await svc.startGame(b, 'employee');
  });
  afterAll(teardownDb);
  const rejects = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); };

  it('listListings : filtres validés, tri, champs dérivés, prix en pièces', async () => {
    const r = await svc.listListings(a, { maxPrice: '120000', sort: 'price_asc', types: 'studio,apartment' });
    expect(r.count).toBe(r.listings.length);
    expect(r.total).toBeGreaterThanOrEqual(r.count);
    expect(r.listings.every((l: any) => l.price <= 120000)).toBe(true);
    expect(r.listings.map((l: any) => l.price)).toEqual([...r.listings.map((l: any) => l.price)].sort((x: number, y: number) => x - y));
    const l: any = r.listings[0];
    expect(l.pricePerSqm).toBeCloseTo(l.price / l.surfaceSqm, 1);
    expect(l.priceCoins).toBeCloseTo(l.price / r.eurosPerCoin, 1);
    expect((await rejects(svc.listListings(a, { maxPrice: '-3' }))).code).toBe('INVALID_INPUT');
    expect((await rejects(svc.listListings(a, { sort: 'x' }))).code).toBe('INVALID_INPUT');
  });

  it('fiche : les rendements estimés viennent du moteur (computeIndicators), frais de notaire inclus', async () => {
    const id = (await svc.listListings(a, {})).listings[0].id;
    const d: any = await svc.getListingDetail(a, id);
    const l = d.listing;
    const charges = l.annualCharges.condoFees + l.annualCharges.propertyTax + l.annualCharges.insurance + l.annualCharges.maintenance;
    expect(d.economics.annualCharges).toBeCloseTo(charges, 2);
    expect(d.economics.totalInvestment).toBeCloseTo(l.price + d.economics.notaryFees + l.advertisedWorks, 2);
    expect(d.economics.netYieldPct).toBeCloseTo(((l.marketRentMonthly * 12 * (1 - l.vacancyPct / 100) - charges) / d.economics.totalInvestment) * 100, 1);
    expect(d.suggestedDownPaymentCoins).toBeGreaterThan(0);
    expect(d.economics.grossYieldPct).toBeLessThan(l.grossYieldPct);   // sur le coût total (notaire compris) : plus bas que sur le seul prix
  });

  it('favoris : ajout idempotent, lecture, retrait ; annonce inconnue ou identifiant piégé refusés', async () => {
    const r = await svc.listListings(a, {}); const id = r.listings[0].id;
    expect(await watch.addFavorite(a, id)).toMatchObject({ favorite: true, already: false });
    expect(await watch.addFavorite(a, id)).toMatchObject({ already: true });
    expect((await watch.listFavorites(a)).ids).toEqual([id]);
    expect((await rejects(watch.addFavorite(a, 'inconnue-999'))).code).toBe('UNKNOWN_LISTING');
    expect((await rejects(watch.addFavorite(a, "x'; DROP TABLE users;--"))).code).toBe('INVALID_INPUT');
    expect((await watch.listFavorites(b)).ids).toEqual([]);              // les favoris de A ne sont pas ceux de B
    await watch.removeFavorite(b, id);                                   // B ne peut pas retirer le favori de A
    expect((await watch.listFavorites(a)).ids).toEqual([id]);
    expect((await watch.listFavorites(a)).listings[0].priceCoins).toBeGreaterThan(0);
    await watch.removeFavorite(a, id);
    expect((await watch.listFavorites(a)).ids).toEqual([]);
  });

  it('recherches enregistrées : validation, nom nettoyé, limite, IDOR sur lecture/suppression/vu', async () => {
    const saved = await watch.saveSearch(a, { name: '  Mes <b>studios</b>  ', filters: { types: 'studio', maxPrice: '90000' } });
    expect(saved.name).toBe('Mes b studios /b');
    expect(saved.filters).toEqual({ maxPrice: 90000, types: ['studio'] });
    expect((await rejects(watch.saveSearch(a, { name: '', filters: {} }))).code).toBe('INVALID_INPUT');
    expect((await rejects(watch.saveSearch(a, { name: 'x', filters: { maxPrice: -1 } }))).code).toBe('INVALID_INPUT');
    expect((await rejects(watch.saveSearch(a, { name: 'x', filters: 'oops' }))).code).toBe('INVALID_INPUT');
    expect((await watch.listSavedSearches(b)).searches).toEqual([]);
    expect((await rejects(watch.deleteSearch(b, saved.id))).code).toBe('NOT_FOUND');
    expect((await rejects(watch.markSeen(b, saved.id))).code).toBe('NOT_FOUND');
    expect((await rejects(watch.deleteSearch(a, '../../x'))).code).toBe('INVALID_INPUT');
    expect((await watch.listSavedSearches(a)).searches).toHaveLength(1);
    await watch.deleteSearch(a, saved.id);
    expect((await watch.listSavedSearches(a)).searches).toHaveLength(0);
    for (let i = 0; i < WATCH_LIMITS.savedSearches; i++) await watch.saveSearch(b, { name: `r${i}`, filters: {} });
    expect((await rejects(watch.saveSearch(b, { name: 'de trop', filters: {} }))).code).toBe('INVALID_INPUT');
  });

  it('alerte « nouvelles annonces » : 0 à l\'enregistrement, puis nouvelles annonces à l\'année suivante, 0 après « vu »', async () => {
    const u = await createUser({ balance: 1000, freeDomain: 'real_estate' }); await svc.startGame(u, 'employee');
    const s = await watch.saveSearch(u, { name: 'Tout Valcourt', filters: { cityId: 'valcourt' } });
    let list = (await watch.listSavedSearches(u)).searches[0];
    expect(list.newCount).toBe(0);
    expect(list.count).toBeGreaterThan(0);
    await query('UPDATE re_games SET simulated_year = simulated_year + 1 WHERE user_id = $1', [u]);   // le temps avance : nouveau lot d'annonces
    list = (await watch.listSavedSearches(u)).searches[0];
    expect(list.newCount).toBe(list.count);
    await watch.markSeen(u, s.id);
    expect((await watch.listSavedSearches(u)).searches[0].newCount).toBe(0);
  });

  it('RGPD : l\'export contient mes favoris et mes recherches enregistrées, et seulement les miens', async () => {
    const u = await createUser({ balance: 1000, freeDomain: 'real_estate' }); const other = await createUser({ balance: 1000, freeDomain: 'real_estate' });
    await svc.startGame(u, 'employee'); await svc.startGame(other, 'employee');
    const id = (await svc.listListings(u, {})).listings[0].id;
    await watch.addFavorite(u, id); await watch.addFavorite(other, id);
    await watch.saveSearch(u, { name: 'Ma recherche', filters: { maxPrice: 100000 } });
    const data: any = await exportUserData(u);
    expect(data.realEstate.favorites.map((f: any) => f.listing_id)).toEqual([id]);
    expect(data.realEstate.savedSearches).toHaveLength(1);
    expect(JSON.stringify(data.realEstate.savedSearches)).not.toContain(other);
  });

  it('favoris : seuls ceux de l\'année en cours comptent pour la limite ; un bien déjà possédé n\'est plus listé', async () => {
    const u = await createUser({ balance: 200000, freeDomain: 'real_estate' }); await svc.startGame(u, 'executive');
    const ls = (await svc.listListings(u, { sort: 'price_asc' })).listings;
    await watch.addFavorite(u, ls[0].id); await watch.addFavorite(u, ls[1].id);
    for (let i = 0; i < 3; i++) await query('INSERT INTO re_favorites (user_id, listing_id, year) VALUES ($1, $2, 2009)', [u, `ancien-${i}`]);   // années passées
    expect((await watch.listFavorites(u)).pastCount).toBe(3);
    expect((await watch.addFavorite(u, ls[2].id)).favorite).toBe(true);                                         // pas bloqué par les anciens
    const game = (await query('SELECT id FROM re_games WHERE user_id = $1', [u])).rows[0];
    await query(`INSERT INTO re_properties (game_id, listing_id, city_id, neighborhood_id, title, property_type, surface_sqm, age, energy_class, condition, purchase_year, purchase_month, purchase_price, notary_fees, down_payment, status)
                 VALUES ($1, $2, $3, $4, 't', $5, 20, 'old', 'C', 'good', 2010, 1, 1000, 10, 100, 'vacant')`, [game.id, ls[0].id, ls[0].cityId, ls[0].neighborhoodId, ls[0].type]);
    expect((await watch.listFavorites(u)).ids).not.toContain(ls[0].id);
  });

  it('une recherche enregistrée devenue invalide ne casse pas la liste', async () => {
    const u = await createUser({ balance: 1000, freeDomain: 'real_estate' }); await svc.startGame(u, 'employee');
    await watch.saveSearch(u, { name: 'ok', filters: { maxPrice: 100000 } });
    await query(`INSERT INTO re_saved_searches (user_id, name, filters) VALUES ($1, 'vieille', '{"energy":["Z"]}'::jsonb)`, [u]);
    const r = (await watch.listSavedSearches(u)).searches;
    expect(r).toHaveLength(2);
    expect(r.find((x: any) => x.name === 'vieille')).toMatchObject({ invalid: true, count: 0, newCount: 0 });
  });

  it('les favoris d\'une année passée ne sont pas présentés comme disponibles', async () => {
    const u = await createUser({ balance: 1000, freeDomain: 'real_estate' }); await svc.startGame(u, 'employee');
    const id = (await svc.listListings(u, {})).listings[0].id;
    await watch.addFavorite(u, id);
    await query('UPDATE re_games SET simulated_year = simulated_year + 1 WHERE user_id = $1', [u]);
    const f = await watch.listFavorites(u);
    expect(f.ids).toEqual([]); expect(f.pastCount).toBe(1);
  });
});
