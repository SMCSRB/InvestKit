// Annonces de l'Immobilier RÉEL à la date de jeu : prix des zones lus dans DVF, loyer lu dans ANIL, annonces générées par engine/immo/realListings.ts.
// PRÉPARATION (PR 3 sur 6 du branchement) : désactivé par défaut (DVF_MARKET_ENABLED = false) ; aucune route ni aucun moteur n'appelle ce service. Aucune lecture en base tant qu'il est désactivé.
// Règles : jamais un prix inventé (zone sans prix fiable : aucune annonce de ce type) ; jamais un loyer inventé (sans loyer ANIL : rent = null, donc aucune rentabilité) ; jamais une donnée postérieure à la date de jeu.
import { dvfMarketService } from './dvfMarketService';
import { listingRentService } from './listingRentService';
import { allZones, cityOfZone, zoneLabel } from '../data/realEstate/dvf/cities';
import { generateZoneListings, ZonePrice } from '../engine/immo/realListings';
import { DVF_MARKET_ENABLED } from '../config/dvfMarketRules';
import { decorateListing } from './realEstateService';
import type { ScenarioContext } from '../engine/immo';
import type { Listing } from '../data/realEstate/types';
import type { ListingRent } from '../engine/immo/listingRent';

export interface RealListingEntry { listing: Listing; rent: ListingRent | null }
export interface RealListingOptions { force?: boolean }       // force : tests et copie de test seulement ; sinon DVF_MARKET_ENABLED décide

// Date de jeu d'une année = 1er janvier (comme le catalogue actuel, par année) : dernier mois entièrement passé = décembre précédent.
export const yearStartMs = (year: number): number => Date.UTC(year, 0, 1);

const toPrice = (v: { medianEurM2: number; p25EurM2: number; p75EurM2: number } | null): ZonePrice | null => (v ? { medianEurM2: v.medianEurM2, p25EurM2: v.p25EurM2, p75EurM2: v.p75EurM2 } : null);

export const realListingService = {
  enabled: (opts: RealListingOptions = {}): boolean => opts.force === true || DVF_MARKET_ENABLED,

  async listAt(simulatedMs: number, opts: RealListingOptions = {}): Promise<RealListingEntry[]> {
    if (!realListingService.enabled(opts)) return [];
    const year = new Date(simulatedMs).getUTCFullYear();
    const out: RealListingEntry[] = [];
    for (const zone of allZones()) {
      const city = cityOfZone(zone); const label = zoneLabel(zone);
      if (!city || !label) continue;
      const [apt, house] = await Promise.all([dvfMarketService.priceAt(zone, 'apartment', simulatedMs), dvfMarketService.priceAt(zone, 'house', simulatedMs)]);
      for (const listing of generateZoneListings({ zoneCode: zone, zoneLabel: label, cityId: city.id, year, apartment: toPrice(apt), house: toPrice(house) })) {
        const rent = await listingRentService.rentFor({ zoneCode: zone, type: listing.type, rooms: listing.rooms, surfaceSqm: listing.surfaceSqm, pricePerM2: listing.price / listing.surfaceSqm }, simulatedMs);
        out.push({ listing, rent });
      }
    }
    return out;
  },

  // Annonces prêtes pour l'écran : loyer ANIL et mentions (decorateListing), ou « aucun loyer » (aucune rentabilité) quand la commune n'a pas de loyer.
  async decoratedAt(simulatedMs: number, ctx?: ScenarioContext, opts: RealListingOptions = {}) {
    return (await realListingService.listAt(simulatedMs, opts)).map((e) => decorateListing(e.listing, ctx, e.rent));
  },
};
