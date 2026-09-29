import type { PropertyAge, Condition, EnergyClass, UnitType } from '../../engine/immo';

export type { Condition, EnergyClass };

// Tout ce fichier est INDÉPENDANT de la source des données : le catalogue
// fictif et, plus tard, les vraies données DVF produisent exactement ces
// structures. Le reste du jeu ne connaît que ces types.

export type PropertyType = UnitType; // 'studio' | 'apartment' | 'house'
export type CityTier = 'metropolis' | 'large' | 'medium' | 'small';

export interface City {
  id: string;
  name: string;
  region: string;
  tier: CityTier;
  description: string;
  fictive: boolean; // true : ville imaginaire, aucune donnée réelle
}

// Quartier : nuance le marché de la ville (centre plus cher et plus tendu,
// périphérie moins chère et plus détendue).
export interface Neighborhood {
  id: string;
  cityId: string;
  name: string;
  priceMultiplier: number;   // × prix moyen de la ville
  rentMultiplier: number;    // × loyer moyen de la ville
  tensionOffset: number;     // ajouté à la tension de la ville (borné à [0, 1])
}

// Marché d'une ville pour une année simulée.
export interface CityMarket {
  cityId: string;
  year: number;
  pricePerSqm: number;      // € / m², prix moyen de la ville
  rentPerSqm: number;       // € / m² / mois, loyer moyen hors charges
  rentalTension: number;    // 0 = marché détendu, 1 = très tendu (varie un peu chaque année)
  vacancyPct: number;       // vacance moyenne (% du temps non loué), DÉRIVÉE de la tension
  priceChangePct: number;   // variation des prix sur l'année (%)
}

// Annonce : un bien PRIX FIXÉ pour une année donnée. Ne contient jamais
// l'information cachée de l'expertise (voir Expertise).
export interface Listing {
  id: string;
  cityId: string;
  neighborhoodId: string;
  neighborhoodName: string;
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
  rentPerSqm: number;             // loyer au m² retenu (quartier, taille, état, énergie)
  marketRentMonthly: number;      // = surface × loyer au m² : CALCULÉ, jamais figé par annonce
  rentalTension: number;          // tension du quartier (0–1)
  vacancyPct: number;             // vacance moyenne attendue de ce bien (%)
  tenancyMonths: number;          // durée moyenne d'un bail avant changement de locataire
  recoverableChargesMonthly: number; // charges récupérables avancées puis refacturées (€/mois)
  annualCharges: {
    condoFees: number;            // copropriété NON récupérable (€/an)
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

// Bien à valoriser (état actuel, pas nécessairement celui de l'annonce d'origine).
export interface ValuationInput {
  cityId: string;
  neighborhoodId: string;
  type: PropertyType;
  surfaceSqm: number;
  condition: Condition;
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
  listNeighborhoods(cityId: string): Promise<Neighborhood[]>;
  getMarket(cityId: string, year: number): Promise<CityMarket | null>;
  // Taux nominal des crédits (%, hors assurance) proposé cette année-là pour une durée en mois.
  getLoanRatePct(year: number, months: number): Promise<number>;
  // Variation annuelle (%) de l'indice de référence des loyers (IRL), net de tout plafonnement légal.
  getIrlAnnualChangePct(year: number): Promise<number>;
  // Estimation de la valeur d'un bien (€) selon le marché de l'année ; sans bruit propre à une annonce.
  estimateValue(input: ValuationInput, year: number): Promise<number>;
  listListings(year: number, filter?: ListingFilter): Promise<Listing[]>;
  getListing(listingId: string, year: number): Promise<Listing | null>;
  getExpertise(listingId: string, year: number): Promise<Expertise | null>;
}
