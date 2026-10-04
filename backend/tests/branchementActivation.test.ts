// Branchement 6/6 : activation de l'Immobilier RÉEL, sur une base de test seulement. Éteint par défaut ; jamais sur la base « investkit » ; achat et fiche de bout en bout avec les vraies données.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { env } from '../src/config/env';
import { realDataState } from '../src/config/realSourceRules';
import { getRealEstateDataSource } from '../src/data/realEstate';
import { clearDvfSourceCache } from '../src/data/realEstate/dvfSource';
import { realEstateService as svc } from '../src/services/realEstateService';
import { dvfMarketService } from '../src/services/dvfMarketService';
import { rentMarketService } from '../src/services/rentMarketService';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { parseRentFile } from '../src/data/realEstate/rents/rentFile';
import { DVF_MARKET_ENABLED } from '../src/config/dvfMarketRules';
import { RENT_MARKET_ENABLED } from '../src/config/rentMarketRules';
import { PROPERTY_TAX_ENABLED } from '../src/config/propertyTaxRules';

describe('verrou : éteint par défaut, jamais sur une base qui ne finit pas par « _test »', () => {
  it('sans IMMO_REAL_DATA=true : éteint, même sur une base de test', () => {
    expect(realDataState(undefined, 'investkit_design_test').enabled).toBe(false);
    expect(realDataState('false', 'investkit_design_test').enabled).toBe(false);
    expect(realDataState('1', 'investkit_design_test').enabled).toBe(false);
  });
  it('IMMO_REAL_DATA=true sur le VRAI site (investkit) ou toute base sans « _test » : reste éteint', () => {
    for (const db of ['investkit', 'investkit_prod', 'test_investkit', 'investkit_test_old', '']) {
      const s = realDataState('true', db);
      expect(s.enabled, db).toBe(false); expect(s.reason).toContain('_test');
    }
  });
  it('allumé seulement avec les deux conditions ; années réglables et bornées', () => {
    expect(realDataState('true', 'investkit_design_test').enabled).toBe(true);
    expect(realDataState('true', 'investkit_test').enabled).toBe(true);
    expect(realDataState('true', 'investkit_test', undefined, undefined)).toMatchObject({ minYear: 2022, maxYear: 2025 });
    expect(realDataState('true', 'investkit_test', '2023', '2026')).toMatchObject({ minYear: 2023, maxYear: 2026 });
    expect(realDataState('true', 'investkit_test', 'abc', '2020')).toMatchObject({ minYear: 2022, maxYear: 2022 });
  });
  it('les drapeaux d\'origine restent faux dans le code ; REAL_ESTATE_SOURCE=dvf est refusé tant que le verrou est fermé', () => {
    expect(DVF_MARKET_ENABLED).toBe(false); expect(RENT_MARKET_ENABLED).toBe(false); expect(PROPERTY_TAX_ENABLED).toBe(false);
    const saved = { src: env.realEstateSource, flag: process.env.IMMO_REAL_DATA };
    try {
      env.realEstateSource = 'dvf'; delete process.env.IMMO_REAL_DATA;
      expect(() => getRealEstateDataSource()).toThrow(/refusé/);
    } finally { env.realEstateSource = saved.src; if (saved.flag === undefined) delete process.env.IMMO_REAL_DATA; else process.env.IMMO_REAL_DATA = saved.flag; }
  });
  it('par défaut le jeu lit toujours le catalogue fictif', () => { expect(getRealEstateDataSource().id).toBe('fictive'); });
  it('seul l\'index des sources importe la source réelle (aucune route ni aucun service ne la contourne)', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const users = files.filter((f) => /dvfSource'/.test(readFileSync(f, 'utf8')) && !/data[\\/]realEstate[\\/](index|dvfSource)\.ts$/.test(f));
    expect(users).toEqual([]);
  });
});

describe.skipIf(!hasDb)('de bout en bout avec les vraies données (base de test)', () => {
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
  const NOW = new Date('2026-10-04T00:00:00Z');
  const rows = (zone: string, p: number) => [[zone, '2024-11', 'a', 40, p, p * 0.9, p * 1.1, null], [zone, '2024-12', 'a', 42, p, p * 0.9, p * 1.1, null], [zone, '2024-11', 'm', 40, p * 0.8, p * 0.7, p * 0.9, null], [zone, '2024-12', 'm', 40, p * 0.8, p * 0.7, p * 0.9, null]];
  const dvf = { source: 'DVF géolocalisées (DGFiP, via data.gouv.fr), Licence Ouverte 2.0', windowMonths: 12, minSales: 10, range: { from: '2024-11', to: '2024-12' },
    columns: ['zone', 'mois', 'type', 'ventes', 'médiane €/m²', 'quartier 1', 'quartier 3', 'repli'], rows: [...rows('33000', 4000), ...rows('75111', 9000)] };
  const rents = { source: 'ANIL — Carte des loyers', vintage: 2024, snapshotDate: '2024-09-30', rows: ['all', 't12', 't3', 'house'].map((g) => ['33063', g, 12, 9, 15, 'commune', 100]) };
  const saved = { src: env.realEstateSource, flag: process.env.IMMO_REAL_DATA, min: process.env.IMMO_REAL_MIN_YEAR, max: process.env.IMMO_REAL_MAX_YEAR };
  const turnOn = () => { env.realEstateSource = 'dvf'; process.env.IMMO_REAL_DATA = 'true'; process.env.IMMO_REAL_MIN_YEAR = '2025'; process.env.IMMO_REAL_MAX_YEAR = '2025'; clearDvfSourceCache(); };
  const turnOff = () => { env.realEstateSource = saved.src; for (const [k, v] of [['IMMO_REAL_DATA', saved.flag], ['IMMO_REAL_MIN_YEAR', saved.min], ['IMMO_REAL_MAX_YEAR', saved.max]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } clearDvfSourceCache(); };
  const clean = () => query('TRUNCATE immo_dvf_market, immo_dvf_imports, immo_rent_market, immo_rent_imports CASCADE');
  beforeAll(async () => { await setupDb(); await clean(); await dvfMarketService.importMarket(parseMarketFile(dvf), sum(dvf)); await rentMarketService.importRents(parseRentFile(rents, NOW), sum(rents)); }, 60_000);
  afterEach(turnOff);
  afterAll(async () => { turnOff(); await clean(); await teardownDb(); });

  it('verrou ouvert : source « dvf », 12 villes réelles, quartiers = zones, marché et valeur lus dans DVF/ANIL', async () => {
    turnOn();
    const s = getRealEstateDataSource();
    expect(s.id).toBe('dvf'); expect([s.minYear, s.maxYear]).toEqual([2025, 2025]);
    const cities = await s.listCities();
    expect(cities).toHaveLength(12); expect(cities.every((c) => c.fictive === false)).toBe(true);
    expect((await s.listNeighborhoods('bordeaux')).map((n) => n.id)).toContain('bordeaux:33000');
    const m = (await s.getMarket('bordeaux', 2025))!;
    expect(m.pricePerSqm).toBe(4000); expect(m.rentPerSqm).toBe(12);     // médiane DVF de la zone ; loyer ANIL T3 et plus (charges comprises)
    const v = await s.estimateValue({ cityId: 'bordeaux', neighborhoodId: 'bordeaux:33000', type: 'apartment', surfaceSqm: 50, condition: 'good' }, 2025);
    expect(v).toBe(200000);
    await expect(s.estimateValue({ cityId: 'dijon', neighborhoodId: 'dijon:21000', type: 'apartment', surfaceSqm: 50, condition: 'good' }, 2025)).rejects.toThrow(/rien n'est inventé/);   // jamais un prix inventé
    await expect(s.listListings(2020)).rejects.toThrow(/hors de la période importée/);
  });

  it('partie, recherche, fiche, expertise honnête, achat : tout passe par la source réelle', async () => {
    turnOn();
    const uid = await createUser({ balance: 5_000_000, freeDomain: 'real_estate', proOverride: true });
    await svc.startGame(uid, 'executive');
    const g = (await query('SELECT data_source, simulated_year FROM re_games WHERE user_id = $1', [uid])).rows[0];
    expect(g.data_source).toBe('dvf'); expect(g.simulated_year).toBe(2025);
    const res: any = await svc.listListings(uid, {});
    expect(res.cities).toHaveLength(12);
    const bx = res.listings.filter((l: any) => l.neighborhoodId === 'bordeaux:33000');
    expect(bx.length).toBeGreaterThan(0);
    expect(bx.every((l: any) => l.dataSources.rent.kind === 'anil' && l.rentAvailable === true && l.department === '33')).toBe(true);
    const paris = res.listings.filter((l: any) => l.neighborhoodId === 'paris:75111');
    expect(paris.every((l: any) => l.dataSources.rent.kind === 'none' && l.grossYieldPct === null)).toBe(true);     // prix connu, pas de loyer : aucune rentabilité
    expect(res.listings.every((l: any) => l.realSources === undefined)).toBe(true);                                   // détail interne non exposé
    const l = bx[0];
    const d: any = await svc.getListingDetail(uid, l.id);
    expect(d.city.fictive).toBe(false); expect(d.listing.dataSources.rent.kind).toBe('anil');
    const exp: any = await svc.buyExpertise(uid, l.id);
    expect(exp.hiddenDefects).toEqual([]); expect(exp.realWorks).toBe(d.listing.advertisedWorks);               // aucun défaut caché inventé
    const prev: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: Math.ceil(l.price / 4), months: 240 });
    expect(prev).toBeTruthy();
    const bought: any = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: Math.ceil(l.price / 3), months: 240 });
    expect(bought).toBeTruthy();
    expect((await svc.listProperties(uid) as any).properties?.length ?? (await svc.listProperties(uid) as any).length).toBeGreaterThan(0);
  });

  it('verrou refermé : le catalogue fictif revient', async () => {
    turnOn(); expect(getRealEstateDataSource().id).toBe('dvf');
    turnOff(); expect(getRealEstateDataSource().id).toBe('fictive');
  });
});

describe.skipIf(!hasDb)('un bien déjà acheté reste lisible les années suivantes', () => {
  it('annonce absente en 2026 mais connue en 2025 : on reprend la dernière annonce connue', async () => {
    const { dvfDataSource } = await import('../src/data/realEstate/dvfSource');
    const saved = { flag: process.env.IMMO_REAL_DATA, min: process.env.IMMO_REAL_MIN_YEAR, max: process.env.IMMO_REAL_MAX_YEAR };
    process.env.IMMO_REAL_DATA = 'true'; process.env.IMMO_REAL_MIN_YEAR = '2025'; process.env.IMMO_REAL_MAX_YEAR = '2026'; clearDvfSourceCache();
    try {
      await setupDb(); await query('TRUNCATE immo_dvf_market, immo_dvf_imports, immo_rent_market, immo_rent_imports CASCADE');
      const f = { source: 'DVF géolocalisées (DGFiP, via data.gouv.fr), Licence Ouverte 2.0', windowMonths: 12, minSales: 10, range: { from: '2024-11', to: '2024-12' },
        columns: ['zone', 'mois', 'type', 'ventes', 'médiane €/m²', 'quartier 1', 'quartier 3', 'repli'], rows: [['33000', '2024-12', 'a', 42, 4000, 3600, 4500, null]] };
      await dvfMarketService.importMarket(parseMarketFile(f), 'x'.repeat(64));
      const l2025 = (await dvfDataSource.listListings(2025))[0];
      expect(l2025).toBeTruthy();
      expect((await dvfDataSource.getListing(l2025.id, 2026))?.id).toBe(l2025.id);
      expect(await dvfDataSource.getListing('r-inconnu-1', 2026)).toBeNull();
    } finally {
      for (const [k, v] of [['IMMO_REAL_DATA', saved.flag], ['IMMO_REAL_MIN_YEAR', saved.min], ['IMMO_REAL_MAX_YEAR', saved.max]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
      clearDvfSourceCache(); await query('TRUNCATE immo_dvf_market, immo_dvf_imports CASCADE'); await teardownDb();
    }
  }, 60_000);
});
