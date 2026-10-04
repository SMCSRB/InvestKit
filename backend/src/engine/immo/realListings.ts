// Génère, pour UNE zone de prix (arrondissement ou code postal), des annonces à partir des prix RÉELS de DVF. Fonction pure et DÉTERMINISTE : mêmes entrées = mêmes annonces.
// Réel : le prix au m² (tiré entre les quartiles des ventes réelles de la zone). Valeur de jeu : surface, état, âge, énergie, charges (config/realListingRules.ts). Loyer : NON défini ici (voir listingRent, source ANIL).
import type { Listing } from '../../data/realEstate/types';
import { createRng, hashString } from '../../utils/seededRandom';
import { REAL_UNIT_KINDS, REAL_KIND_LABEL, REAL_LISTINGS_PER_KIND, REAL_CONDITION_MIX, REAL_ENERGY_MIX, REAL_NEW_PROBABILITY, REAL_GAME_VALUES } from '../../config/realListingRules';

export interface ZonePrice { medianEurM2: number; p25EurM2: number; p75EurM2: number }
export interface ZoneInput {
  zoneCode: string; zoneLabel: string; cityId: string; department: string; year: number;
  apartment: ZonePrice | null; house: ZonePrice | null;        // null = pas de prix fiable : aucune annonce de ce type (jamais un prix inventé)
}

const pick = <T extends { weight: number }>(items: readonly T[], u: number): T => {
  let acc = 0;
  for (const it of items) { acc += it.weight; if (u < acc) return it; }
  return items[items.length - 1];
};
const roundPrice = (p: number): number => Math.round(p / 500) * 500;

export const generateZoneListings = (z: ZoneInput): Listing[] => {
  const out: Listing[] = [];
  const G = REAL_GAME_VALUES;
  for (const kind of REAL_UNIT_KINDS) {
    const prices = kind.dvfType === 'house' ? z.house : z.apartment;
    if (!prices) continue;
    for (let n = 0; n < REAL_LISTINGS_PER_KIND; n++) {
      const surface = kind.surfaces[n % kind.surfaces.length];
      const rng = createRng(hashString(`${z.zoneCode}:${kind.id}:${n}:${z.year}`));
      const cond = pick(REAL_CONDITION_MIX, rng());
      const energy = pick(REAL_ENERGY_MIX.map((e) => ({ ...e })), rng()).cls;
      const age = rng() < REAL_NEW_PROBABILITY ? 'new' : 'old';
      const perM2 = prices.p25EurM2 + rng() * (prices.p75EurM2 - prices.p25EurM2);       // jamais hors des quartiles réels
      out.push({
        id: `r-${z.zoneCode}-${kind.id}-${n + 1}`,
        cityId: z.cityId, department: z.department, neighborhoodId: `${z.cityId}:${z.zoneCode}`, neighborhoodName: z.zoneLabel,
        year: z.year, type: kind.type, title: `${REAL_KIND_LABEL[kind.id]} — ${z.zoneLabel}`, urgentSale: false,
        surfaceSqm: surface, rooms: kind.rooms, age, energyClass: energy, condition: cond.condition,
        price: roundPrice(surface * perM2 * cond.priceFactor),
        advertisedWorks: Math.round(cond.worksPerSqm * surface),
        rentPerSqm: 0, marketRentMonthly: 0, recoverableChargesMonthly: 0,           // loyer : voir listingRent (ANIL) ; rien d'inventé ici
        rentalTension: G.rentalTension, vacancyPct: G.vacancyPct, tenancyMonths: G.tenancyMonths,
        annualCharges: {
          condoFees: Math.round(surface * G.condoPerSqmYear * G.nonRecoverableShare), propertyTax: Math.round(surface * G.propertyTaxPerSqmYear),
          insurance: G.insuranceYear, maintenance: Math.round(surface * G.maintenancePerSqmYear),
        },
      });
    }
  }
  return out;
};
