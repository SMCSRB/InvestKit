// Branchement 3/6 : annonces de l'Immobilier RÉEL (prix DVF, loyer ANIL). Prix toujours dans les quartiers réels de la zone, jamais un prix ni un loyer inventé, jamais un futur, désactivé par défaut. Fichiers FABRIQUÉS.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { generateZoneListings, ZoneInput } from '../src/engine/immo/realListings';
import { REAL_UNIT_KINDS, REAL_LISTINGS_PER_KIND, REAL_CONDITION_MIX } from '../src/config/realListingRules';
import { realListingService, yearStartMs } from '../src/services/realListingService';
import { dvfMarketService } from '../src/services/dvfMarketService';
import { rentMarketService } from '../src/services/rentMarketService';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { parseRentFile } from '../src/data/realEstate/rents/rentFile';
import { DVF_MARKET_ENABLED } from '../src/config/dvfMarketRules';

const zone = (over: Partial<ZoneInput> = {}): ZoneInput => ({ zoneCode: '33000', zoneLabel: 'Bordeaux 33000', cityId: 'bordeaux', year: 2025, apartment: { medianEurM2: 4000, p25EurM2: 3600, p75EurM2: 4500 }, house: { medianEurM2: 3800, p25EurM2: 3300, p75EurM2: 4300 }, ...over });
const minFactor = Math.min(...REAL_CONDITION_MIX.map((c) => c.priceFactor));

describe('génération des annonces d\'une zone (pur)', () => {
  it('une annonce par surface et par type (studio, T2, T3, maison), identifiants valides et uniques, aucun parking', () => {
    const l = generateZoneListings(zone());
    expect(l).toHaveLength(REAL_UNIT_KINDS.length * REAL_LISTINGS_PER_KIND);
    expect(new Set(l.map((x) => x.id)).size).toBe(l.length);
    expect(l.every((x) => /^[a-z0-9-]{1,80}$/.test(x.id) && x.type !== 'parking')).toBe(true);
    expect(l.filter((x) => x.type === 'house')).toHaveLength(REAL_LISTINGS_PER_KIND);
  });
  it('déterministe : mêmes entrées = mêmes annonces ; une autre année change le tirage', () => {
    expect(generateZoneListings(zone())).toEqual(generateZoneListings(zone()));
    expect(generateZoneListings(zone({ year: 2026 })).map((x) => x.price)).not.toEqual(generateZoneListings(zone()).map((x) => x.price));
  });
  it('le prix au m² reste dans les quartiers RÉELS de la zone (au facteur d\'état près) ; jamais hors fourchette observée', () => {
    for (const x of generateZoneListings(zone())) {
      const p = x.type === 'house' ? { lo: 3300, hi: 4300 } : { lo: 3600, hi: 4500 };
      expect(x.price / x.surfaceSqm).toBeGreaterThanOrEqual(p.lo * minFactor - 500 / x.surfaceSqm);
      expect(x.price / x.surfaceSqm).toBeLessThanOrEqual(p.hi + 500 / x.surfaceSqm);
    }
  });
  it('pas de prix fiable = pas d\'annonce de ce type ; aucun prix : aucune annonce', () => {
    expect(generateZoneListings(zone({ house: null })).some((x) => x.type === 'house')).toBe(false);
    expect(generateZoneListings(zone({ apartment: null })).every((x) => x.type === 'house')).toBe(true);
    expect(generateZoneListings(zone({ apartment: null, house: null }))).toEqual([]);
  });
  it('aucun loyer inventé ici (loyer à 0, à compléter par la source ANIL) ; charges et marché locatif = valeurs de jeu', () => {
    for (const x of generateZoneListings(zone())) { expect(x.marketRentMonthly).toBe(0); expect(x.rentPerSqm).toBe(0); expect(x.annualCharges.condoFees).toBeGreaterThan(0); }
  });
});

describe('garde : désactivé et non branché', () => {
  it('drapeau désactivé ; rien ne s\'active sans « force » ; seuls eux-mêmes importent ces modules', async () => {
    expect(DVF_MARKET_ENABLED).toBe(false);
    expect(realListingService.enabled()).toBe(false); expect(realListingService.enabled({ force: true })).toBe(true);
    expect(await realListingService.listAt(yearStartMs(2025))).toEqual([]);          // aucune lecture en base
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const own = /realListingService\.ts$|engine[\\/]immo[\\/]realListings\.ts$|realListingRules\.ts$|realEstate[\\/]dvfSource\.ts$/;     // dvfSource : branchement 6/6, refusé hors base « _test » (voir branchementActivation.test.ts)
    const users = files.filter((f) => /realListingService|immo\/realListings'|realListingRules/.test(readFileSync(f, 'utf8')) && !own.test(f));
    expect(users, 'aucune route ni aucun moteur ne doit lire les annonces réelles tant que le drapeau est désactivé').toEqual([]);
  });
});

describe.skipIf(!hasDb)('lecture en base (DVF + ANIL)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_dvf_market, immo_dvf_imports, immo_rent_market, immo_rent_imports CASCADE'); }, 60_000);
  afterAll(async () => { await query('TRUNCATE immo_dvf_market, immo_dvf_imports, immo_rent_market, immo_rent_imports CASCADE'); await teardownDb(); });
  const NOW = new Date('2026-10-04T00:00:00Z');
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
  const dvf = { source: 'DVF géolocalisées (DGFiP, via data.gouv.fr), Licence Ouverte 2.0', windowMonths: 12, minSales: 10, range: { from: '2024-11', to: '2024-12' },
    columns: ['zone', 'mois', 'type', 'ventes', 'médiane €/m²', 'quartier 1', 'quartier 3', 'repli'],
    rows: [['33000', '2024-11', 'a', 40, 3900, 3500, 4300, null], ['33000', '2024-12', 'a', 42, 4000, 3600, 4500, null], ['75111', '2024-12', 'a', 50, 9000, 8400, 9700, null]] };
  const rents = { source: 'ANIL — Carte des loyers', vintage: 2024, snapshotDate: '2024-09-30', rows: [['33063', 'all', 12, 9, 15, 'commune', 100], ['33063', 't12', 14, 11, 17, 'commune', 100], ['33063', 't3', 11, 8, 14, 'commune', 100], ['33063', 'house', 10, 8, 13, 'commune', 30]] };

  it('prix de la zone à la date de jeu (dernier mois entièrement passé), loyer ANIL de la commune, rien d\'inventé', async () => {
    await dvfMarketService.importMarket(parseMarketFile(dvf), sum(dvf));
    await rentMarketService.importRents(parseRentFile(rents, NOW), sum(rents));
    const all = await realListingService.listAt(yearStartMs(2025), { force: true });
    const bordeaux = all.filter((e) => e.listing.neighborhoodId === 'bordeaux:33000');
    expect(bordeaux).toHaveLength(3 * REAL_LISTINGS_PER_KIND);                      // studio, T2, T3 ; pas de maison : aucun prix DVF de maison
    expect(bordeaux.every((e) => e.listing.type !== 'house')).toBe(true);
    expect(bordeaux.every((e) => e.rent !== null)).toBe(true);
    const studio = bordeaux.find((e) => e.listing.type === 'studio')!;
    expect(studio.rent!.rentPerSqm).toBe(14); expect(studio.rent!.monthlyRent).toBe(14 * studio.listing.surfaceSqm);         // série T1-T2
    const t3 = bordeaux.find((e) => e.listing.rooms === 3)!; expect(t3.rent!.rentPerSqm).toBe(11);                             // série T3 et plus
    const paris = all.filter((e) => e.listing.neighborhoodId === 'paris:75111');
    expect(paris).toHaveLength(3 * REAL_LISTINGS_PER_KIND); expect(paris.every((e) => e.rent === null)).toBe(true);             // prix connu, loyer inconnu : aucune rentabilité
    expect(all.every((e) => ['bordeaux', 'paris'].includes(e.listing.cityId))).toBe(true);                                      // aucune zone sans prix
  });
  it('jamais un prix futur : le 15 décembre 2024, le mois de décembre n\'est pas encore utilisable', async () => {
    const dec = (await realListingService.listAt(Date.UTC(2024, 11, 15), { force: true })).filter((e) => e.listing.neighborhoodId === 'bordeaux:33000');
    const jan = (await realListingService.listAt(yearStartMs(2025), { force: true })).filter((e) => e.listing.neighborhoodId === 'bordeaux:33000');
    expect(dec.length).toBeGreaterThan(0);
    for (const e of dec) expect(e.listing.price / e.listing.surfaceSqm).toBeLessThanOrEqual(4300 + 500 / e.listing.surfaceSqm);     // quartiles de novembre (3500 à 4300)
    const maxJan = Math.max(...jan.map((e) => e.listing.price / e.listing.surfaceSqm)); expect(maxJan).toBeGreaterThan(4300);
  });
  it('annonces décorées : mention ANIL avec rendement brut quand il y a un loyer ; « aucun loyer » sans rentabilité sinon', async () => {
    const d = (await realListingService.decoratedAt(yearStartMs(2025), undefined, { force: true })) as Array<Record<string, any>>;
    const withRent = d.find((x) => x.neighborhoodId === 'bordeaux:33000')!;
    expect(withRent.dataSources.rent.kind).toBe('anil'); expect(typeof withRent.grossYieldPct).toBe('number');
    const without = d.find((x) => x.neighborhoodId === 'paris:75111')!;
    expect(without.dataSources.rent).toEqual({ kind: 'none' }); expect(without.grossYieldPct).toBeNull(); expect(without.rentAvailable).toBe(false);
  });
});
