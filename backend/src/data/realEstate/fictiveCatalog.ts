import { round2, estimateMarketRent, averageVacancyPct } from '../../engine/immo';
import { RENT_MODEL, VACANCY_MODEL, TENANCY_MONTHS } from '../../config/immoRules';
import { createRng, hashString, approxGaussian } from '../../utils/seededRandom';
import type {
  City, CityMarket, Neighborhood, CityTier, Condition, EnergyClass, Expertise, Listing, ListingFilter,
  PropertyType, RealEstateDataSource,
} from './types';

// ─────────────────────────────────────────────────────────────────────────
// CATALOGUE FICTIF. Villes imaginaires, prix et loyers inventés mais
// plausibles : ce n'est PAS une donnée de marché. Entièrement déterministe
// (graine fixe) : le même appel donne toujours le même résultat, sur tout
// serveur. Sera remplacé par une source DVF via la même interface.
// ─────────────────────────────────────────────────────────────────────────
const MIN_YEAR = 2010;
const MAX_YEAR = 2026;
const CATALOG_SEED = 1789;

interface CityProfile extends City {
  basePricePerSqm: number;   // en 2010
  baseRentPerSqm: number;    // en 2010, €/m²/mois
  trendOffsetPct: number;    // écart annuel moyen vs cycle national
  volatilityPct: number;
  rentalTension: number;     // 0 détendu … 1 très tendu (la vacance en est déduite)
  taxPerSqm: number;         // taxe foncière €/m²/an
}

const CITIES: CityProfile[] = [
  { id: 'marvelle', name: 'Marvelle', region: 'Grande Couronne', tier: 'metropolis', fictive: true,
    description: 'Métropole dynamique, prix élevés, forte demande locative.',
    basePricePerSqm: 4200, baseRentPerSqm: 15.5, trendOffsetPct: 0.8, volatilityPct: 2.0, rentalTension: 0.85, taxPerSqm: 21 },
  { id: 'valcourt', name: 'Valcourt', region: 'Vallée du Nord', tier: 'large', fictive: true,
    description: 'Grande ville régionale, marché profond et stable.',
    basePricePerSqm: 2600, baseRentPerSqm: 11, trendOffsetPct: 0.3, volatilityPct: 1.8, rentalTension: 0.65, taxPerSqm: 17 },
  { id: 'portelune', name: 'Portelune', region: 'Côte Ouest', tier: 'large', fictive: true,
    description: 'Port touristique : prix soutenus, vacance plus élevée hors saison.',
    basePricePerSqm: 3000, baseRentPerSqm: 12.5, trendOffsetPct: 0.6, volatilityPct: 3.0, rentalTension: 0.35, taxPerSqm: 16 },
  { id: 'saint-aubrion', name: 'Saint-Aubrion', region: 'Plateaux du Centre', tier: 'medium', fictive: true,
    description: 'Ville moyenne tranquille, rendements corrects.',
    basePricePerSqm: 1700, baseRentPerSqm: 8.5, trendOffsetPct: 0, volatilityPct: 1.5, rentalTension: 0.45, taxPerSqm: 15 },
  { id: 'brumevalle', name: 'Brumevalle', region: 'Bassin Minier', tier: 'medium', fictive: true,
    description: 'Ancienne ville industrielle : prix bas, rendement brut élevé mais risque de vacance.',
    basePricePerSqm: 1100, baseRentPerSqm: 6.5, trendOffsetPct: -0.7, volatilityPct: 2.0, rentalTension: 0.2, taxPerSqm: 14 },
  { id: 'roquemont', name: 'Roquemont', region: 'Sud Universitaire', tier: 'medium', fictive: true,
    description: 'Ville étudiante : petites surfaces très demandées, vacance faible.',
    basePricePerSqm: 2100, baseRentPerSqm: 12, trendOffsetPct: 0.2, volatilityPct: 1.5, rentalTension: 0.8, taxPerSqm: 15 },
  { id: 'ternelle', name: 'Ternelle', region: 'Campagne Est', tier: 'small', fictive: true,
    description: 'Bourg rural : tickets d\'entrée très bas, marché étroit.',
    basePricePerSqm: 900, baseRentPerSqm: 5.5, trendOffsetPct: -0.3, volatilityPct: 1.2, rentalTension: 0.25, taxPerSqm: 12 },
  { id: 'clairval', name: 'Clairval', region: 'Grande Couronne', tier: 'medium', fictive: true,
    description: 'Périurbain résidentiel : familles, biens plus grands.',
    basePricePerSqm: 2000, baseRentPerSqm: 8.8, trendOffsetPct: 0.4, volatilityPct: 1.4, rentalTension: 0.6, taxPerSqm: 16 },
];

// Quartiers : trois par ville (mêmes écarts relatifs, appliqués au marché de la ville).
const NEIGHBORHOOD_SPECS = [
  { key: 'centre', name: 'Centre', priceMultiplier: 1.15, rentMultiplier: 1.1, tensionOffset: 0.08, weight: 0.3 },
  { key: 'pericentre', name: 'Péricentre', priceMultiplier: 1.0, rentMultiplier: 1.0, tensionOffset: 0, weight: 0.4 },
  { key: 'peripherie', name: 'Périphérie', priceMultiplier: 0.85, rentMultiplier: 0.9, tensionOffset: -0.1, weight: 0.3 },
];
const neighborhoodsOf = (cityId: string): Neighborhood[] =>
  NEIGHBORHOOD_SPECS.map((n) => ({
    id: `${cityId}:${n.key}`, cityId, name: n.name,
    priceMultiplier: n.priceMultiplier, rentMultiplier: n.rentMultiplier, tensionOffset: n.tensionOffset,
  }));

// Cycle national FICTIF de variation annuelle des prix (%), 2010→2026.
const NATIONAL_PRICE_CYCLE: Record<number, number> = {
  2010: 4.0, 2011: 2.5, 2012: -1.0, 2013: -2.0, 2014: -1.5, 2015: 0.5, 2016: 2.5, 2017: 4.0, 2018: 3.5,
  2019: 4.5, 2020: 5.0, 2021: 6.5, 2022: 3.0, 2023: -3.0, 2024: -4.0, 2025: -1.0, 2026: 1.5,
};

// Variation annuelle FICTIVE de l'IRL (%), net de plafonnement. Les vraies
// valeurs de l'Insee pourront remplacer cette série via la même interface.
const IRL_ANNUAL_CHANGE: Record<number, number> = {
  2010: 0.9, 2011: 1.8, 2012: 2.0, 2013: 1.2, 2014: 0.6, 2015: 0.1, 2016: 0.2, 2017: 0.9, 2018: 1.3,
  2019: 1.7, 2020: 0.7, 2021: 0.4, 2022: 2.5, 2023: 3.5, 2024: 3.3, 2025: 1.4, 2026: 1.1,
};

// Taux nominal FICTIF des crédits sur 20 ans (%, hors assurance).
const LOAN_RATE_20Y: Record<number, number> = {
  2010: 3.6, 2011: 3.7, 2012: 3.4, 2013: 3.2, 2014: 2.6, 2015: 2.0, 2016: 1.7, 2017: 1.6, 2018: 1.6,
  2019: 1.3, 2020: 1.2, 2021: 1.1, 2022: 2.0, 2023: 4.0, 2024: 3.8, 2025: 3.6, 2026: 3.5,
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// ── Marché : l'évolution est calculée année par année depuis 2010, avec un
//    aléa déterminé par (ville, année) : indépendant de l'ordre des appels.
const marketCache = new Map<string, CityMarket>();

const computeMarket = (city: CityProfile, year: number): CityMarket => {
  const key = `${city.id}:${year}`;
  const cached = marketCache.get(key);
  if (cached) return cached;

  let price = city.basePricePerSqm;
  let rent = city.baseRentPerSqm;
  let change = 0;
  for (let y = MIN_YEAR + 1; y <= year; y++) {
    const rng = createRng(hashString(`${CATALOG_SEED}:${city.id}:${y}`));
    const shock = approxGaussian(rng) * city.volatilityPct;
    change = clamp(NATIONAL_PRICE_CYCLE[y] + city.trendOffsetPct + shock, -15, 20);
    price *= 1 + change / 100;
    rent *= 1 + clamp(0.5 * change + 0.5, -0.5, 3.5) / 100; // les loyers suivent, en plus lissé
  }
  const tensionRng = createRng(hashString(`${CATALOG_SEED}:${city.id}:tension:${year}`));
  // Arrondie UNE fois : la vacance affichée est dérivée de la tension affichée.
  const tension = round2(clamp(city.rentalTension + approxGaussian(tensionRng) * 0.03, 0, 1));
  const market: CityMarket = {
    cityId: city.id,
    year,
    pricePerSqm: Math.round(price),
    rentPerSqm: round2(rent),
    rentalTension: tension,
    vacancyPct: averageVacancyPct(tension, TENANCY_MONTHS.apartment, VACANCY_MODEL),
    priceChangePct: year === MIN_YEAR ? 0 : round2(change),
  };
  marketCache.set(key, market);
  return market;
};

// ── Biens : générés UNE fois, de façon déterministe, indépendamment de l'année.
interface PropertyTemplate {
  id: string;
  cityId: string;
  neighborhoodId: string;
  type: PropertyType;
  title: string;
  surfaceSqm: number;
  rooms: number;
  age: 'old' | 'new';
  energyClass: EnergyClass;
  condition: Condition;
  priceFactor: number;      // écart au prix (type + bruit propre au bien) ; le loyer, lui, est CALCULÉ
  advertisedWorksPerSqm: number;
  realWorksPerSqm: number;  // ≥ annoncé si défaut caché
  hiddenDefects: string[];
}

const TYPE_SPECS: { type: PropertyType; label: string; rooms: number; min: number; max: number; priceFactor: number; condoPerSqm: number }[] = [
  { type: 'studio', label: 'Studio', rooms: 1, min: 17, max: 24, priceFactor: 1.15, condoPerSqm: 22 },
  { type: 'apartment', label: 'T2', rooms: 2, min: 34, max: 46, priceFactor: 1.0, condoPerSqm: 20 },
  { type: 'apartment', label: 'T3', rooms: 3, min: 54, max: 70, priceFactor: 0.95, condoPerSqm: 18 },
  { type: 'house', label: 'Maison T4', rooms: 4, min: 85, max: 110, priceFactor: 0.9, condoPerSqm: 0 },
];
const RENOVATION_PROJECT = { type: 'apartment' as PropertyType, label: 'T2 à rénover', rooms: 2, min: 36, max: 48 };

const HIDDEN_DEFECTS = [
  'Humidité dans les murs porteurs',
  'Toiture à refaire à court terme',
  'Installation électrique non conforme',
  'Copropriété avec gros travaux votés',
  'Canalisations en plomb',
];

const energyFor = (rng: () => number, condition: Condition): EnergyClass => {
  const table: EnergyClass[] = condition === 'to_renovate' ? ['E', 'F', 'G', 'F', 'G'] : condition === 'to_refresh' ? ['C', 'D', 'E', 'D'] : ['B', 'C', 'D', 'C'];
  return table[Math.floor(rng() * table.length)];
};

const pickNeighborhood = (rng: () => number, cityId: string): string => {
  let r = rng();
  for (const n of NEIGHBORHOOD_SPECS) {
    if (r < n.weight) return `${cityId}:${n.key}`;
    r -= n.weight;
  }
  return `${cityId}:${NEIGHBORHOOD_SPECS[NEIGHBORHOOD_SPECS.length - 1].key}`;
};

// Effet de l'état sur le PRIX (l'effet sur le loyer est dans RENT_MODEL).
const CONDITION_PRICE_FACTOR: Record<Condition, number> = { good: 1, to_refresh: 0.94, to_renovate: 0.78 };

const TEMPLATES: PropertyTemplate[] = [];
for (const city of CITIES) {
  const rng = createRng(hashString(`${CATALOG_SEED}:props:${city.id}`));
  let n = 0;
  const pushTemplate = (spec: { type: PropertyType; label: string; rooms: number; min: number; max: number }, priceFactor: number, condition: Condition) => {
    n += 1;
    const surface = Math.round(spec.min + rng() * (spec.max - spec.min));
    const defective = rng() < 0.3;
    const advertised = condition === 'to_renovate' ? 450 + Math.round(rng() * 200) : condition === 'to_refresh' ? 150 + Math.round(rng() * 100) : 0;
    const realExtra = defective ? 1.5 + rng() * 0.8 : 1;
    const defects = defective ? [HIDDEN_DEFECTS[Math.floor(rng() * HIDDEN_DEFECTS.length)]] : [];
    TEMPLATES.push({
      id: `${city.id}-${n}`,
      cityId: city.id,
      neighborhoodId: pickNeighborhood(rng, city.id),
      type: spec.type,
      title: `${spec.label} — ${city.name}`,
      surfaceSqm: surface,
      rooms: spec.rooms,
      age: rng() < 0.12 ? 'new' : 'old',
      energyClass: energyFor(rng, condition),
      condition,
      priceFactor: round2(priceFactor * (0.95 + rng() * 0.1)),
      advertisedWorksPerSqm: advertised,
      realWorksPerSqm: Math.round(advertised * realExtra) + (defective && advertised === 0 ? 200 : 0),
      hiddenDefects: defects,
    });
  };
  for (const spec of TYPE_SPECS) {
    pushTemplate(spec, spec.priceFactor, rng() < 0.35 ? 'to_refresh' : 'good');
  }
  pushTemplate(RENOVATION_PROJECT, 1.0, 'to_renovate');
  // Un second studio/T2 dans chaque ville pour élargir le choix.
  pushTemplate(TYPE_SPECS[0], TYPE_SPECS[0].priceFactor * 0.92, 'good');
  pushTemplate(TYPE_SPECS[1], TYPE_SPECS[1].priceFactor * 1.05, 'good');
}

const roundPrice = (p: number): number => Math.round(p / 500) * 500;

const priceTemplate = (t: PropertyTemplate, year: number): Listing => {
  const city = CITIES.find((c) => c.id === t.cityId)!;
  const nbh = neighborhoodsOf(city.id).find((n) => n.id === t.neighborhoodId)!;
  const market = computeMarket(city, year);
  const condoSpec = TYPE_SPECS.find((s) => s.label === t.title.split(' — ')[0]);
  const condoPerSqm = condoSpec?.condoPerSqm ?? 20;
  const inflation = Math.pow(1.015, year - MIN_YEAR);

  // Le loyer est CALCULÉ : surface × loyer au m² du quartier × taille × état × énergie.
  const rent = estimateMarketRent(
    { surfaceSqm: t.surfaceSqm, cityRentPerSqm: market.rentPerSqm, neighborhoodRentMultiplier: nbh.rentMultiplier, condition: t.condition, energyClass: t.energyClass },
    RENT_MODEL
  );
  const tension = round2(clamp(market.rentalTension + nbh.tensionOffset, 0, 1));
  const tenancyMonths = TENANCY_MONTHS[t.type];

  return {
    id: t.id,
    cityId: t.cityId,
    neighborhoodId: nbh.id,
    neighborhoodName: nbh.name,
    year,
    type: t.type,
    title: t.title,
    surfaceSqm: t.surfaceSqm,
    rooms: t.rooms,
    age: t.age,
    energyClass: t.energyClass,
    condition: t.condition,
    price: roundPrice(t.surfaceSqm * market.pricePerSqm * nbh.priceMultiplier * t.priceFactor * CONDITION_PRICE_FACTOR[t.condition]),
    advertisedWorks: Math.round(t.advertisedWorksPerSqm * t.surfaceSqm * inflation),
    rentPerSqm: rent.rentPerSqm,
    marketRentMonthly: Math.round(rent.monthlyRent),
    rentalTension: tension,
    vacancyPct: averageVacancyPct(tension, tenancyMonths, VACANCY_MODEL),
    tenancyMonths,
    recoverableChargesMonthly: Math.round(t.surfaceSqm * 1.2 * inflation),
    annualCharges: {
      condoFees: Math.round(t.surfaceSqm * condoPerSqm * 0.35 * inflation), // part non récupérable
      propertyTax: Math.round(t.surfaceSqm * city.taxPerSqm * inflation),
      insurance: Math.round(120 * inflation),
      maintenance: Math.round(t.surfaceSqm * 6 * inflation),
    },
  };
};

const assertYear = (year: number): void => {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Année hors catalogue (${MIN_YEAR}–${MAX_YEAR}) : ${year}`);
  }
};

const LOAN_TERM_SPREAD: [number, number][] = [[120, -0.4], [180, -0.25], [240, 0], [300, 0.15], [360, 0.3]];

export const fictiveDataSource: RealEstateDataSource = {
  id: 'fictive',
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR,

  async listCities(): Promise<City[]> {
    return CITIES.map(({ id, name, region, tier, description, fictive }) => ({ id, name, region, tier: tier as CityTier, description, fictive }));
  },

  async getCity(cityId: string): Promise<City | null> {
    const c = CITIES.find((x) => x.id === cityId);
    return c ? { id: c.id, name: c.name, region: c.region, tier: c.tier, description: c.description, fictive: c.fictive } : null;
  },

  async listNeighborhoods(cityId: string): Promise<Neighborhood[]> {
    return CITIES.some((c) => c.id === cityId) ? neighborhoodsOf(cityId) : [];
  },

  async getIrlAnnualChangePct(year: number): Promise<number> {
    assertYear(year);
    return IRL_ANNUAL_CHANGE[year];
  },

  async getMarket(cityId: string, year: number): Promise<CityMarket | null> {
    assertYear(year);
    const c = CITIES.find((x) => x.id === cityId);
    return c ? computeMarket(c, year) : null;
  },

  async getLoanRatePct(year: number, months: number): Promise<number> {
    assertYear(year);
    if (!Number.isInteger(months) || months < 12 || months > 480) throw new RangeError('Durée de prêt invalide');
    const base = LOAN_RATE_20Y[year];
    // Interpolation linéaire de l'écart selon la durée.
    let spread = LOAN_TERM_SPREAD[0][1];
    if (months >= LOAN_TERM_SPREAD[LOAN_TERM_SPREAD.length - 1][0]) spread = LOAN_TERM_SPREAD[LOAN_TERM_SPREAD.length - 1][1];
    else {
      for (let i = 0; i < LOAN_TERM_SPREAD.length - 1; i++) {
        const [m0, s0] = LOAN_TERM_SPREAD[i];
        const [m1, s1] = LOAN_TERM_SPREAD[i + 1];
        if (months >= m0 && months <= m1) spread = s0 + ((s1 - s0) * (months - m0)) / (m1 - m0);
      }
    }
    return round2(Math.max(0, base + spread));
  },

  async listListings(year: number, filter: ListingFilter = {}): Promise<Listing[]> {
    assertYear(year);
    return TEMPLATES
      .filter((t) => (!filter.cityId || t.cityId === filter.cityId) && (!filter.type || t.type === filter.type))
      .map((t) => priceTemplate(t, year))
      .filter((l) => filter.maxPrice === undefined || l.price <= filter.maxPrice)
      .sort((a, b) => a.price - b.price);
  },

  async getListing(listingId: string, year: number): Promise<Listing | null> {
    assertYear(year);
    const t = TEMPLATES.find((x) => x.id === listingId);
    return t ? priceTemplate(t, year) : null;
  },

  async getExpertise(listingId: string, year: number): Promise<Expertise | null> {
    assertYear(year);
    const t = TEMPLATES.find((x) => x.id === listingId);
    if (!t) return null;
    const inflation = Math.pow(1.015, year - MIN_YEAR);
    return {
      listingId,
      realWorks: Math.round(t.realWorksPerSqm * t.surfaceSqm * inflation),
      hiddenDefects: t.hiddenDefects,
    };
  },
};
