import type { PropertyAge } from '../../engine/immo';

// Tout ce fichier est INDÉPENDANT de la source des données : le catalogue
// fictif et, plus tard, les vraies données DVF produisent exactement ces
// structures. Le reste du jeu ne connaît que ces types.

export type PropertyType = 'studio' | 'apartment' | 'house';
export type Condition = 'good' | 'to_refresh' | 'to_renovate';
export type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type CityTier = 'metropolis' | 'large' | 'medium' | 'small';

export interface City {
  id: string;
  name: string;
  region: string;
  tier: CityTier;
  description: string;
  fictive: boolean; // true : ville imaginaire, aucune donnée réelle
}

// Marché d'une ville pour une année simulée.
export interface CityMarket {
  cityId: string;
  year: number;
  pricePerSqm: number;      // € / m², prix moyen de la ville
  rentPerSqm: number;       // € / m² / mois, loyer moyen hors charges
  vacancyPct: number;       // vacance locative moyenne (% du temps non loué)
  priceChangePct: number;   // variation des prix sur l'année (%)
}

// Annonce : un bien PRIX FIXÉ pour une année donnée. Ne contient jamais
// l'information cachée de l'expertise (voir Expertise).
export interface Listing {
  id: string;
  cityId: string;
  year: number;
  type: PropertyType;
  title: string;
  surfaceSqm: number;
  rooms: number;
  age: PropertyAge;
  energyClass: EnergyClass;
  condition: Condition;           // état affiché dans l'annonce
  price: number;                  // prix net vendeur (€)
  advertisedWorks: number;        // travaux annoncés (€)
  marketRentMonthly: number;      // loyer de marché estimé une fois loué (€/mois)
  vacancyPct: number;
  annualCharges: {
    condoFees: number;            // charges de copropriété non récupérables (€/an)
    propertyTax: number;          // taxe foncière (€/an)
    insurance: number;            // assurance propriétaire non occupant (€/an)
    maintenance: number;          // entretien courant (€/an)
  };
}

// Ce que révèle l'expertise (mécanique de l'étape 3) : la vérité sur le bien.
export interface Expertise {
  listingId: string;
  realWorks: number;              // coût réel des travaux (≥ annoncés si défaut caché)
  hiddenDefects: string[];        // vide si rien à signaler
}

export interface ListingFilter {
  cityId?: string;
  type?: PropertyType;
  maxPrice?: number;
}

// Contrat que doit remplir toute source de données immobilières.
// Asynchrone dès maintenant : une source DVF lira une base ou une API.
export interface RealEstateDataSource {
  readonly id: string;              // 'fictive', plus tard 'dvf'
  readonly minYear: number;
  readonly maxYear: number;
  listCities(): Promise<City[]>;
  getCity(cityId: string): Promise<City | null>;
  getMarket(cityId: string, year: number): Promise<CityMarket | null>;
  // Taux nominal des crédits (%, hors assurance) proposé cette année-là pour une durée en mois.
  getLoanRatePct(year: number, months: number): Promise<number>;
  listListings(year: number, filter?: ListingFilter): Promise<Listing[]>;
  getListing(listingId: string, year: number): Promise<Listing | null>;
  getExpertise(listingId: string, year: number): Promise<Expertise | null>;
}
