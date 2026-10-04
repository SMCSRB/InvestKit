// Loyer RÉEL (ANIL) d'une annonce : choix de la série selon le bien, conversion €/m² → € par mois, mention de source pour l'écran, rendement brut. Fonctions pures : aucune base, aucun réseau.
// PRÉPARATION (PR 1 sur 6 du branchement) : rien dans le moteur actuel n'appelle ce module ; le service (listingRentService) lit la base, l'intégration viendra avec le drapeau activé sur la copie de test.
import { GameUnit, rentGroupOf, RentGroup } from '../../config/rentMarketRules';
import { realGrossYield } from './rentYield';
import type { RentSource } from './dataSources';

export type ListingUnit = 'studio' | 'apartment' | 'house' | 'parking';

// Type de bien d'une annonce (type + nombre de pièces) → type du jeu pour les séries ANIL :
// studio = T1-T2 ; appartement de 1 ou 2 pièces = T1-T2 ; 3 pièces ou plus = T3 et plus ; maison = maisons ; parking = aucune série (valeur de jeu).
export const gameUnitOf = (type: ListingUnit, rooms: number): GameUnit => {
  if (type === 'studio') return 'studio';
  if (type === 'house') return 'house';
  if (type === 'parking') return 'parking';
  return rooms <= 2 ? 't2' : 't3';
};
export const rentGroupOfListing = (type: ListingUnit, rooms: number): RentGroup | null => rentGroupOf(gameUnitOf(type, rooms));

const r2 = (n: number): number => Math.round(n * 100) / 100;

// Vue minimale d'un loyer ANIL (RentView du service de loyers) : seuls les champs utilisés ici.
export interface RentFacts {
  communeLabel: string; vintage: number; snapshotDate: string; estimate: 'commune' | 'maille';
  rentEurM2: number; lowEurM2: number; highEurM2: number; attribution: string; nature: string; approximation: string | null;
}

export interface ListingRent {
  monthlyRent: number; lowMonthly: number; highMonthly: number; rentPerSqm: number;     // loyer d'annonce, CHARGES COMPRISES
  grossYieldPct: number | null;                                                        // null sans prix au m² : jamais un rendement inventé
  source: Extract<RentSource, { kind: 'anil' }>;
}

export const listingRentFrom = (rent: RentFacts, surfaceSqm: number, pricePerM2?: number | null): ListingRent => {
  if (!(surfaceSqm > 0) || !Number.isFinite(surfaceSqm)) throw new Error('Surface invalide.');
  const y = realGrossYield({ pricePerM2, rentPerM2: rent.rentEurM2 });
  return {
    monthlyRent: r2(rent.rentEurM2 * surfaceSqm), lowMonthly: r2(rent.lowEurM2 * surfaceSqm), highMonthly: r2(rent.highEurM2 * surfaceSqm), rentPerSqm: rent.rentEurM2,
    grossYieldPct: y ? y.grossYieldPct : null,
    source: { kind: 'anil', communeLabel: rent.communeLabel, vintage: rent.vintage, snapshotDate: rent.snapshotDate, estimate: rent.estimate, lowEurM2: rent.lowEurM2, highEurM2: rent.highEurM2, attribution: rent.attribution, nature: rent.nature, approximation: rent.approximation },
  };
};

// Applique un loyer RÉEL à une annonce (PR 2 sur 6 du branchement). Aucun loyer inventé :
//  - loyer connu : loyer du mois et loyer au m² ANIL (charges comprises, donc AUCUNE charge récupérable en plus : pas de double compte) ;
//  - loyer inconnu (null) : rentAvailable = false, loyer 0 ; rendement, flux et rentabilité nette ne sont jamais calculés.
export const withRealRent = <L extends { marketRentMonthly: number; rentPerSqm: number; recoverableChargesMonthly: number; rentAvailable?: boolean; rentIncludesCharges?: boolean }>(l: L, rent: ListingRent | null): L => {
  if (!rent) return { ...l, marketRentMonthly: 0, rentPerSqm: 0, recoverableChargesMonthly: 0, rentAvailable: false, rentIncludesCharges: false };
  return { ...l, marketRentMonthly: Math.round(rent.monthlyRent), rentPerSqm: rent.rentPerSqm, recoverableChargesMonthly: 0, rentAvailable: true, rentIncludesCharges: true };
};
