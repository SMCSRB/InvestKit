// Source « dvf » : l'Immobilier RÉEL (prix DVF, loyers ANIL, taxe foncière Terralyse) derrière le contrat RealEstateDataSource.
// BRANCHEMENT 6/6 : n'est servie que si realDataEnabled() (IMMO_REAL_DATA=true ET base « _test »). Sur le vrai site, getRealEstateDataSource() la refuse.
// Ce qui n'a pas de source reste une VALEUR DE JEU signalée : taux de crédit, tension locative (0,5), charges de copropriété, assurance, entretien.
// Aucune expertise « défaut caché » inventée : pour une annonce réelle, les travaux réels = les travaux annoncés, sans défaut caché.
// Les modules de services sont chargés à la demande (import dynamique) : ils importent eux-mêmes ce dossier (cycle d'import sinon).
import { fictiveDataSource } from './fictiveCatalog';
import { DVF_CITIES, DvfCity } from './dvf/cities';
import { realDataState } from '../../config/realSourceRules';
import { REAL_CONDITION_MIX } from '../../config/realListingRules';
import { greenValueFactor } from '../../config/immoRules';
import { withRealRent } from '../../engine/immo/listingRent';
import { withRealTax } from '../../engine/immo/listingTax';
import type { City, CityMarket, CityTier, Expertise, Listing, ListingFilter, Neighborhood, RealEstateDataSource, ValuationInput } from './types';

const TIER: Record<DvfCity['kind'], CityTier> = { metropole: 'metropolis', grande: 'large', moyenne: 'medium', petite: 'small' };
// Régions : faits administratifs. Zone tendue : liste officielle (décret n° 2013-392) lue de mémoire : À RECONFIRMER sur la page officielle (docs/PARAMETRES-A-RECONFIRMER.md).
const REGION: Record<string, { region: string; tense: boolean }> = {
  paris: { region: 'Île-de-France', tense: true }, lyon: { region: 'Auvergne-Rhône-Alpes', tense: true }, marseille: { region: 'Provence-Alpes-Côte d\'Azur', tense: true },
  bordeaux: { region: 'Nouvelle-Aquitaine', tense: true }, toulouse: { region: 'Occitanie', tense: true }, nantes: { region: 'Pays de la Loire', tense: true },
  lille: { region: 'Hauts-de-France', tense: true }, montpellier: { region: 'Occitanie', tense: true }, nice: { region: 'Provence-Alpes-Côte d\'Azur', tense: true },
  rennes: { region: 'Bretagne', tense: true }, dijon: { region: 'Bourgogne-Franche-Comté', tense: false }, 'saint-etienne': { region: 'Auvergne-Rhône-Alpes', tense: false },
};
export const GAME_TENSION = 0.5;      // VALEUR DE JEU, NON SOURCÉE : aucune source de tension locative par ville
const CACHE_TTL_MS = 5 * 60 * 1000;

const cityOf = (c: DvfCity): City => ({
  id: c.id, name: c.name, region: REGION[c.id]?.region ?? '', tier: TIER[c.kind], fictive: false, tenseZone: REGION[c.id]?.tense ?? false,
  description: 'Prix de vente réels (DVF), loyers estimés ANIL, taux de taxe foncière Terralyse.',
});

const zonesOf = async (cityId: string) => {
  const { zoneLabel } = await import('./dvf/cities');
  return (DVF_CITIES.find((c) => c.id === cityId)?.zones ?? []).map((z) => ({ zone: z, label: zoneLabel(z) ?? z }));
};

const conditionFactor = (c: ValuationInput['condition']): number => REAL_CONDITION_MIX.find((m) => m.condition === c)?.priceFactor ?? 1;
const dayMs = (year: number): number => Date.UTC(year, 0, 1);

const cache = new Map<number, { at: number; listings: Listing[] }>();
export const clearDvfSourceCache = (): void => cache.clear();

const listingsOf = async (year: number): Promise<Listing[]> => {
  const hit = cache.get(year);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.listings;
  const { realListingService, yearStartMs } = await import('../../services/realListingService');
  const entries = await realListingService.listAt(yearStartMs(year), { force: true });
  const listings = entries.map((e): Listing => ({
    ...withRealTax(withRealRent(e.listing, e.rent), e.tax),
    realSources: { rent: e.rent ? e.rent.source : { kind: 'none' }, ...(e.tax ? { tax: e.tax.source } : {}) },
  })).sort((a, b) => a.price - b.price);
  cache.set(year, { at: Date.now(), listings });
  return listings;
};

const assertYear = (year: number): void => {
  const { minYear, maxYear } = realDataState();
  if (!Number.isInteger(year) || year < minYear || year > maxYear) throw new RangeError(`Année hors de la période importée (${minYear}–${maxYear}) : ${year}`);
};

// Prix au m² d'une zone pour un type, ou à défaut la moyenne des zones de la ville. Jamais un prix inventé : sans aucune médiane, erreur.
const pricePerSqmOf = async (cityId: string, neighborhoodId: string | null, type: ValuationInput['type'], year: number): Promise<number> => {
  const { dvfMarketService } = await import('../../services/dvfMarketService');
  const kind = type === 'house' ? 'house' : 'apartment';
  const zone = neighborhoodId?.split(':')[1];
  const zones = zone ? [zone] : (await zonesOf(cityId)).map((z) => z.zone);
  const prices = (await Promise.all(zones.map((z) => dvfMarketService.priceAt(z, kind, dayMs(year))))).filter((p): p is NonNullable<typeof p> => !!p);
  if (prices.length === 0 && zone) return pricePerSqmOf(cityId, null, type, year);
  if (prices.length === 0) throw new RangeError(`Aucun prix DVF pour ${cityId} en ${year} : rien n'est inventé.`);
  return prices.reduce((s, p) => s + p.medianEurM2, 0) / prices.length;
};

export const dvfDataSource: RealEstateDataSource = {
  id: 'dvf',
  get minYear() { return realDataState().minYear; },
  get maxYear() { return realDataState().maxYear; },

  async listCities() { return DVF_CITIES.map(cityOf); },
  async getCity(cityId) { const c = DVF_CITIES.find((x) => x.id === cityId); return c ? cityOf(c) : null; },

  async listNeighborhoods(cityId): Promise<Neighborhood[]> {
    return (await zonesOf(cityId)).map((z) => ({ id: `${cityId}:${z.zone}`, cityId, name: z.label, priceMultiplier: 1, rentMultiplier: 1, tensionOffset: 0 }));
  },

  // Marché de la ville : prix = moyenne des médianes DVF des zones ; loyer = ANIL (série T3 et plus, charges comprises) ; tension = valeur de jeu.
  async getMarket(cityId, year): Promise<CityMarket | null> {
    assertYear(year);
    const city = DVF_CITIES.find((c) => c.id === cityId);
    if (!city) return null;
    const { rentMarketService } = await import('../../services/rentMarketService');
    const pricePerSqm = await pricePerSqmOf(cityId, null, 'apartment', year);
    const before = await pricePerSqmOf(cityId, null, 'apartment', year - 1).catch(() => null);
    const rent = await rentMarketService.rentAt(city.codes[0], 't3', dayMs(year));
    return {
      cityId, year, pricePerSqm: Math.round(pricePerSqm), rentPerSqm: rent ? rent.rentEurM2 : 0, rentalTension: GAME_TENSION, vacancyPct: 5,
      priceChangePct: before ? Math.round(((pricePerSqm / before - 1) * 100) * 10) / 10 : 0,
    };
  },

  getLoanRatePct: (year, months) => fictiveDataSource.getLoanRatePct(Math.min(Math.max(year, fictiveDataSource.minYear), fictiveDataSource.maxYear), months),   // VALEUR DE JEU : taux BCE réels = import fait par Andreja

  async estimateValue(input, year): Promise<number> {
    assertYear(year);
    const p = await pricePerSqmOf(input.cityId, input.neighborhoodId, input.type, year);
    return Math.round(input.surfaceSqm * p * conditionFactor(input.condition) * (input.energyClass ? greenValueFactor(input.type, input.energyClass) : 1));
  },

  async listListings(year, filter: ListingFilter = {}): Promise<Listing[]> {
    assertYear(year);
    return (await listingsOf(year)).filter((l) => (!filter.cityId || l.cityId === filter.cityId) && (!filter.type || l.type === filter.type) && (filter.maxPrice === undefined || l.price <= filter.maxPrice));
  },

  async getListing(listingId, year): Promise<Listing | null> {
    assertYear(year);
    // Un bien déjà acheté doit rester lisible les années suivantes même si l'annonce n'est plus générée (zone sans prix cette année-là) :
    // on reprend alors la dernière annonce connue (charges et taxe de cette année-là), jamais une annonce inventée.
    for (let y = year; y >= realDataState().minYear; y--) {
      const found = (await listingsOf(y)).find((l) => l.id === listingId);
      if (found) return found;
    }
    return null;
  },

  async getExpertise(listingId, year): Promise<Expertise | null> {
    const l = await dvfDataSource.getListing(listingId, year);
    return l ? { listingId, realWorks: l.advertisedWorks, hiddenDefects: [] } : null;
  },
};
