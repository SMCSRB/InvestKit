// Loyer RÉEL (ANIL) d'une annonce, lu en base à la date de jeu. PRÉPARATION (PR 1 sur 6 du branchement) : aucune route ni moteur n'appelle ce service tant que le drapeau n'est pas activé (RENT_MARKET_ENABLED = false).
// Règles décidées par Andreja : aucun loyer inventé (commune ou série sans loyer, parking : null, donc aucune rentabilité) ; loyer constant entre deux millésimes ; jamais un millésime futur.
import { rentMarketService, communeOfZone } from './rentMarketService';
import { ListingRent, ListingUnit, listingRentFrom, rentGroupOfListing } from '../engine/immo/listingRent';

export interface ListingRentQuery { zoneCode: string; type: ListingUnit; rooms: number; surfaceSqm: number; pricePerM2?: number | null }

export const listingRentService = {
  async rentFor(q: ListingRentQuery, simulatedMs: number): Promise<ListingRent | null> {
    const group = rentGroupOfListing(q.type, q.rooms);
    if (!group) return null;                                   // parking : aucune série ANIL
    const commune = communeOfZone(q.zoneCode);
    if (!commune) return null;                                 // zone inconnue ou arrondissement hors liste
    const view = await rentMarketService.rentAt(commune, group, simulatedMs);
    return view ? listingRentFrom(view, q.surfaceSqm, q.pricePerM2) : null;
  },
};
