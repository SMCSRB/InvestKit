// Branchement 4/6 : taxe foncière RÉELLE (taux communal Terralyse × base cadastrale ESTIMÉE et signalée). Rien d'inventé : sans taux, la taxe reste une valeur de jeu marquée. Fichiers FABRIQUÉS.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
// @ts-expect-error module JavaScript du frontend
import { taxInfo, isGameValue } from '../../app/lib/immoSources.js';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { listingTaxFrom, withRealTax } from '../src/engine/immo/listingTax';
import { listingDataSources, GAME_VALUE_FIELDS } from '../src/engine/immo/dataSources';
import { decorateListing } from '../src/services/realEstateService';
import { realListingService, yearStartMs } from '../src/services/realListingService';
import { propertyTaxService } from '../src/services/propertyTaxService';
import { dvfMarketService } from '../src/services/dvfMarketService';
import { parseTaxRateFile } from '../src/data/realEstate/taxes/rateFile';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { CADASTRAL_BASE_NET_EUR_PER_SQM, PROPERTY_TAX_ATTRIBUTION, PROPERTY_TAX_ENABLED } from '../src/config/propertyTaxRules';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';

describe('taxe foncière d\'une annonce (pur)', () => {
  it('taxe = surface × base estimée × taux ; la source dit « base estimée » avec l\'attribution Terralyse', () => {
    const t = listingTaxFrom(50, { year: 2025, ratePct: 40 }, 'Bordeaux');
    expect(t.annualEur).toBe(Math.round(50 * CADASTRAL_BASE_NET_EUR_PER_SQM * 0.4));
    expect(t.source).toEqual({ kind: 'terralyse', communeLabel: 'Bordeaux', ratePct: 40, rateYear: 2025, baseEstimated: true, baseNetEurPerSqm: CADASTRAL_BASE_NET_EUR_PER_SQM, attribution: 'Source : Terralyse' });
    expect(PROPERTY_TAX_ATTRIBUTION).toBe('Source : Terralyse');
    expect(() => listingTaxFrom(0, { year: 2025, ratePct: 40 }, 'X')).toThrow();
  });
  it('seule la taxe foncière change ; sans taux, l\'annonce est inchangée', () => {
    const l = { annualCharges: { condoFees: 1, propertyTax: 999, insurance: 3, maintenance: 4 }, x: 1 };
    const t = listingTaxFrom(50, { year: 2025, ratePct: 40 }, 'Bordeaux');
    expect(withRealTax(l, t)).toEqual({ annualCharges: { condoFees: 1, propertyTax: t.annualEur, insurance: 3, maintenance: 4 }, x: 1 });
    expect(withRealTax(l, null)).toBe(l);
  });
});

describe('origine des chiffres', () => {
  const t = listingTaxFrom(50, { year: 2025, ratePct: 40 }, 'Bordeaux');
  it('par défaut la taxe est une valeur de jeu ; avec un taux réel elle sort des valeurs de jeu (le reste reste marqué)', () => {
    expect(listingDataSources().propertyTax).toEqual({ kind: 'jeu' }); expect(listingDataSources().gameValues).toEqual([...GAME_VALUE_FIELDS]);
    const s = listingDataSources(undefined, t.source);
    expect(s.gameValues).not.toContain('propertyTax'); expect(s.gameValues).toEqual(expect.arrayContaining(['condoFees', 'vacancy', 'insurance', 'maintenance']));
    expect(isGameValue(s, 'propertyTax')).toBe(false);
  });
  it('décoration : taxe réelle appliquée ; sans taux (null) ou sans argument, taxe du catalogue inchangée', async () => {
    const l = (await src.listListings(2015))[0];
    const d = decorateListing(l, undefined, undefined, t) as Record<string, any>;
    expect(d.annualCharges.propertyTax).toBe(t.annualEur); expect(d.dataSources.propertyTax.kind).toBe('terralyse'); expect(d.dataSources.gameValues).not.toContain('propertyTax');
    for (const none of [decorateListing(l), decorateListing(l, undefined, undefined, null)] as Array<Record<string, any>>) {
      expect(none.annualCharges.propertyTax).toBe(l.annualCharges.propertyTax); expect(none.dataSources.propertyTax).toEqual({ kind: 'jeu' }); expect(none.dataSources.gameValues).toContain('propertyTax');
    }
  });
  it('mention à l\'écran : taux, année, base ESTIMÉE et attribution ; sinon rien', () => {
    const i = taxInfo({ propertyTax: t.source });
    expect(i.real).toBe(true); expect(i.text).toContain('Bordeaux'); expect(i.text).toContain('40'); expect(i.text).toContain('2025'); expect(i.text).toContain('ESTIMÉE'); expect(i.attribution).toBe('Source : Terralyse');
    expect(taxInfo({ propertyTax: { kind: 'jeu' } }).real).toBe(false); expect(taxInfo(undefined).real).toBe(false);
    const detail = readFileSync(path.join(__dirname, '../../app/components/immo/Detail.jsx'), 'utf8');
    expect(detail).toContain('data-testid="tax-source"');
  });
  it('désactivé : PROPERTY_TAX_ENABLED reste faux', () => { expect(PROPERTY_TAX_ENABLED).toBe(false); });
});

describe.skipIf(!hasDb)('lecture en base (taux Terralyse + prix DVF)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_property_tax_rates, immo_property_tax_imports, immo_dvf_market, immo_dvf_imports, immo_rent_market, immo_rent_imports CASCADE'); }, 60_000);
  afterAll(async () => { await query('TRUNCATE immo_property_tax_rates, immo_property_tax_imports, immo_dvf_market, immo_dvf_imports CASCADE'); await teardownDb(); });
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
  const tax = { source: 'Terralyse : taux', rows: [['33063', 2023, 40, 30, 10, null], ['33063', 2024, 44, 33, 11, 8], ['75056', 2024, 25, 25, 0, null]] };
  const dvf = { source: 'DVF géolocalisées (DGFiP, via data.gouv.fr), Licence Ouverte 2.0', windowMonths: 12, minSales: 10, range: { from: '2022-11', to: '2024-12' },
    columns: ['zone', 'mois', 'type', 'ventes', 'médiane €/m²', 'quartier 1', 'quartier 3', 'repli'],
    rows: [['33000', '2022-12', 'a', 40, 3800, 3400, 4200, null], ['33000', '2023-12', 'a', 40, 3900, 3500, 4300, null], ['33000', '2024-12', 'a', 42, 4000, 3600, 4500, null], ['75111', '2024-12', 'a', 50, 9000, 8400, 9700, null]] };

  it('le taux en vigueur à la date de jeu (aucun futur) donne la taxe de chaque annonce ; Paris utilise la commune entière ; avant le premier taux : valeur de jeu', async () => {
    await propertyTaxService.importRates(parseTaxRateFile(tax), sum(tax));
    await dvfMarketService.importMarket(parseMarketFile(dvf), sum(dvf));
    const at2025 = (await realListingService.listAt(yearStartMs(2025), { force: true }));
    const bx = at2025.filter((e) => e.listing.neighborhoodId === 'bordeaux:33000');
    expect(bx.length).toBeGreaterThan(0);
    for (const e of bx) {
      expect(e.tax!.source).toMatchObject({ ratePct: 44, rateYear: 2024, baseEstimated: true });                    // le taux de 2024 est utilisable depuis le 1er octobre 2024
      expect(e.listing.annualCharges.propertyTax).not.toBe(e.tax!.annualEur);                                        // l'annonce brute porte encore la valeur de jeu : c'est la décoration qui applique le taux
      expect(e.tax!.annualEur).toBe(Math.round(Math.round(e.listing.surfaceSqm * CADASTRAL_BASE_NET_EUR_PER_SQM) * 0.44));
    }
    const paris = at2025.filter((e) => e.listing.neighborhoodId === 'paris:75111');
    expect(paris.length).toBeGreaterThan(0); expect(paris.every((e) => e.tax?.source.ratePct === 25)).toBe(true);    // commune 75056, pas l'arrondissement
    const at2024 = await realListingService.listAt(yearStartMs(2024), { force: true });
    expect(at2024.filter((e) => e.listing.neighborhoodId === 'bordeaux:33000').every((e) => e.tax?.source.ratePct === 40 && e.tax.source.rateYear === 2023)).toBe(true);   // le taux de 2023 (usable depuis octobre 2023)
    const at2023 = await realListingService.listAt(yearStartMs(2023), { force: true });
    expect(at2023.filter((e) => e.listing.neighborhoodId === 'bordeaux:33000').every((e) => e.tax === null)).toBe(true);        // avant le premier taux : aucune taxe réelle, valeur de jeu
  });
  it('annonces décorées : mention réelle avec taux, ou valeur de jeu marquée sans taux', async () => {
    const d2025 = (await realListingService.decoratedAt(yearStartMs(2025), undefined, { force: true })) as Array<Record<string, any>>;
    const x = d2025.find((l) => l.neighborhoodId === 'bordeaux:33000')!;
    expect(x.dataSources.propertyTax.kind).toBe('terralyse'); expect(x.dataSources.gameValues).not.toContain('propertyTax');
    expect(x.annualCharges.propertyTax).toBe(Math.round(Math.round(x.surfaceSqm * CADASTRAL_BASE_NET_EUR_PER_SQM) * 0.44));
    const d2023 = (await realListingService.decoratedAt(yearStartMs(2023), undefined, { force: true })) as Array<Record<string, any>>;
    const y = d2023.find((l) => l.neighborhoodId === 'bordeaux:33000')!;
    expect(y.dataSources.propertyTax).toEqual({ kind: 'jeu' }); expect(y.dataSources.gameValues).toContain('propertyTax');
  });
});
