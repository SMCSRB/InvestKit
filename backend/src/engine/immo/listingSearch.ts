import type { Listing } from '../../data/realEstate/types';
import { round2 } from './money';

// ─────────────────────────────────────────────────────────────────────────
// RECHERCHE D'ANNONCES : filtres et tri, PURS (aucun accès base ni réseau).
// N'ajoute AUCUN chiffre : tout ce qui est affiché vient de l'annonce du catalogue
// (le prix au m² et le rendement brut sont de simples divisions de ses champs).
// Les filtres viennent du client : ils sont validés ici (types, bornes, valeurs permises).
// ─────────────────────────────────────────────────────────────────────────
export const SEARCH_TYPES = ['studio', 'apartment', 'house'] as const;
export const SEARCH_CONDITIONS = ['good', 'to_refresh', 'to_renovate'] as const;
export const SEARCH_ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const SEARCH_SORTS = ['relevance', 'price_asc', 'price_desc', 'ppsqm_asc', 'ppsqm_desc', 'yield_desc', 'newest'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface SearchParams {
  q?: string;                 // ville, quartier ou région (texte libre, 60 caractères max)
  cityId?: string;
  types?: string[];
  minPrice?: number; maxPrice?: number;
  minSurface?: number; maxSurface?: number;
  minRooms?: number;
  conditions?: string[];
  energy?: string[];
  minYieldPct?: number;
  urgentOnly?: boolean;
  worksOnly?: boolean;        // « travaux à prévoir » : travaux annoncés ou bien pas en bon état
  sort: SearchSort;
}

export class SearchInputError extends Error {}

const MAX_NUMBER = 1_000_000_000;
const num = (raw: unknown, name: string, { min = 0, max = MAX_NUMBER } = {}): number => {
  if (typeof raw !== 'string' && typeof raw !== 'number') throw new SearchInputError(`${name} invalide`);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new SearchInputError(`${name} invalide`);
  return n;
};
const list = (raw: unknown, name: string, allowed: readonly string[]): string[] => {
  const parts = (Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null);
  if (!parts || parts.length > 12) throw new SearchInputError(`${name} invalide`);
  const out = [...new Set(parts.map((p) => String(p).trim()))];
  if (out.some((v) => !allowed.includes(v))) throw new SearchInputError(`${name} invalide`);
  return out;
};
const empty = (v: unknown) => v === undefined || v === null || v === '';

// Texte sans accents, minuscules : « Péricentre » se trouve avec « pericentre ».
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const parseSearch = (raw: Record<string, unknown> = {}): SearchParams => {
  const p: SearchParams = { sort: 'relevance' };
  if (!empty(raw.q)) {
    if (typeof raw.q !== 'string') throw new SearchInputError('q invalide');
    const q = raw.q.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (q.length > 60) throw new SearchInputError('q invalide');
    if (q) p.q = q;
  }
  if (!empty(raw.cityId)) {
    if (typeof raw.cityId !== 'string' || !/^[a-z0-9-]{1,40}$/.test(raw.cityId)) throw new SearchInputError('cityId invalide');
    p.cityId = raw.cityId;
  }
  // Compatibilité : l'ancien paramètre « type » (un seul type) reste accepté.
  if (!empty(raw.type)) p.types = list(raw.type, 'type', SEARCH_TYPES);
  if (!empty(raw.types)) p.types = list(raw.types, 'types', SEARCH_TYPES);
  if (!empty(raw.maxPrice)) p.maxPrice = num(raw.maxPrice, 'maxPrice', { min: 1 });
  if (!empty(raw.minPrice)) p.minPrice = num(raw.minPrice, 'minPrice');
  if (!empty(raw.minSurface)) p.minSurface = num(raw.minSurface, 'minSurface');
  if (!empty(raw.maxSurface)) p.maxSurface = num(raw.maxSurface, 'maxSurface', { min: 1 });
  if (!empty(raw.minRooms)) p.minRooms = num(raw.minRooms, 'minRooms', { max: 50 });
  if (!empty(raw.conditions)) p.conditions = list(raw.conditions, 'conditions', SEARCH_CONDITIONS);
  if (!empty(raw.energy)) p.energy = list(raw.energy, 'energy', SEARCH_ENERGY);
  if (!empty(raw.minYieldPct)) p.minYieldPct = num(raw.minYieldPct, 'minYieldPct', { max: 100 });
  const flag = (v: unknown, name: string) => { if (v === true || v === 'true' || v === '1') return true; if (v === false || v === 'false' || v === '0') return false; throw new SearchInputError(`${name} invalide`); };
  if (!empty(raw.urgentOnly)) p.urgentOnly = flag(raw.urgentOnly, 'urgentOnly');
  if (!empty(raw.worksOnly)) p.worksOnly = flag(raw.worksOnly, 'worksOnly');
  if (!empty(raw.sort)) {
    if (typeof raw.sort !== 'string' || !(SEARCH_SORTS as readonly string[]).includes(raw.sort)) throw new SearchInputError('sort invalide');
    p.sort = raw.sort as SearchSort;
  }
  if (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice > p.maxPrice) throw new SearchInputError('minPrice dépasse maxPrice');
  if (p.minSurface !== undefined && p.maxSurface !== undefined && p.minSurface > p.maxSurface) throw new SearchInputError('minSurface dépasse maxSurface');
  return p;
};

// Version « enregistrable » : sans tri ni valeur vide, dans un ordre stable (sert aux recherches enregistrées).
export const toStoredFilters = (p: SearchParams): Record<string, unknown> => {
  const { sort, ...rest } = p;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(rest).sort()) { const v = (rest as any)[k]; if (v !== undefined && v !== false) out[k] = v; }
  if (sort !== 'relevance') out.sort = sort;
  return out;
};

// Champs DÉRIVÉS par simple division/arrondi des champs de l'annonce (jamais de donnée nouvelle).
export const pricePerSqm = (l: Pick<Listing, 'price' | 'surfaceSqm'>): number => round2(l.price / l.surfaceSqm);
export const grossYieldPct = (l: Pick<Listing, 'price' | 'marketRentMonthly'>): number => round2(((l.marketRentMonthly * 12) / l.price) * 100);
export const needsWorks = (l: Pick<Listing, 'advertisedWorks' | 'condition'>): boolean => l.advertisedWorks > 0 || l.condition !== 'good';
// Rang de publication : le numéro à la fin de l'identifiant (marvelle-7 est publiée après marvelle-1).
export const publicationRank = (l: Pick<Listing, 'id'>): number => Number(/-(\d+)$/.exec(l.id)?.[1] ?? 0);

export interface Place { cityName: string; region: string }

export const matchesSearch = (l: Listing, p: SearchParams, place?: Place): boolean => {
  if (p.cityId && l.cityId !== p.cityId) return false;
  if (p.q) {
    const hay = fold(`${place?.cityName ?? ''} ${place?.region ?? ''} ${l.neighborhoodName} ${l.title}`);
    if (!fold(p.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (p.types && !p.types.includes(l.type)) return false;
  if (p.minPrice !== undefined && l.price < p.minPrice) return false;
  if (p.maxPrice !== undefined && l.price > p.maxPrice) return false;
  if (p.minSurface !== undefined && l.surfaceSqm < p.minSurface) return false;
  if (p.maxSurface !== undefined && l.surfaceSqm > p.maxSurface) return false;
  if (p.minRooms !== undefined && l.rooms < p.minRooms) return false;
  if (p.conditions && !p.conditions.includes(l.condition)) return false;
  if (p.energy && !p.energy.includes(l.energyClass)) return false;
  if (p.minYieldPct !== undefined && grossYieldPct(l) < p.minYieldPct) return false;
  if (p.urgentOnly && !l.urgentSale) return false;
  if (p.worksOnly && !needsWorks(l)) return false;
  return true;
};

// Tri stable : à égalité, l'identifiant départage (le résultat ne dépend jamais de l'ordre d'arrivée).
export const sortListings = (ls: Listing[], sort: SearchSort): Listing[] => {
  const key: Record<SearchSort, (l: Listing) => number> = {
    relevance: () => 0,
    price_asc: (l) => l.price, price_desc: (l) => -l.price,
    ppsqm_asc: (l) => pricePerSqm(l), ppsqm_desc: (l) => -pricePerSqm(l),
    yield_desc: (l) => -grossYieldPct(l),
    newest: (l) => -publicationRank(l),
  };
  const k = key[sort];
  return [...ls].sort((a, b) => k(a) - k(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
};

export const searchListings = (all: Listing[], p: SearchParams, places: Record<string, Place> = {}): Listing[] =>
  sortListings(all.filter((l) => matchesSearch(l, p, places[l.cityId])), p.sort);
