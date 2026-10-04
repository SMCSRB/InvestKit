// Branchement 2/6 : rentabilité et mentions avec un loyer RÉEL. Aucun loyer = aucune rentabilité ; loyer ANIL = mention + rendement brut indicatif ; sans loyer réel fourni, le comportement actuel est inchangé.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
// @ts-expect-error module JavaScript du frontend
import { rentInfo, rentKnown, yieldAvailable, isGameValue } from '../../app/lib/immoSources.js';
import { decorateListing, listingEconomics, scenarioContext } from '../src/services/realEstateService';
import { withRealRent, listingRentFrom } from '../src/engine/immo/listingRent';
import { listingDataSources } from '../src/engine/immo/dataSources';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { RENT_ATTRIBUTION } from '../src/config/rentMarketRules';

const facts = { communeLabel: 'Bordeaux', vintage: 2025, snapshotDate: '2025-09-30', estimate: 'commune' as const, rentEurM2: 14, lowEurM2: 11, highEurM2: 17.5, attribution: RENT_ATTRIBUTION, nature: 'Loyer d\'annonce, charges comprises.', approximation: null };
const base = async () => { const l = (await src.listListings(2015)).find((x) => x.type === 'apartment' && x.surfaceSqm >= 40)!; return l; };

describe('décoration d\'une annonce', () => {
  it('sans loyer réel fourni (catalogue actuel) : comportement INCHANGÉ (loyer, rendement et source de jeu)', async () => {
    const l = await base(); const d = decorateListing(l) as Record<string, unknown>;
    expect(d.marketRentMonthly).toBe(l.marketRentMonthly); expect(d.dataSources).toEqual(listingDataSources());
    expect(typeof d.grossYieldPct).toBe('number'); expect(d).not.toHaveProperty('rentAvailable');
    expect(listingEconomics(l).grossYieldPct).not.toBeNull();
  });
  it('loyer ANIL : loyer mensuel = loyer au m² × surface, charges comprises (aucune charge récupérable en plus), rendement brut, mention ANIL', async () => {
    const l = await base(); const rent = listingRentFrom(facts, l.surfaceSqm, l.price / l.surfaceSqm);
    const d = decorateListing(l, await scenarioContext(2015), rent) as Record<string, any>;
    expect(d.marketRentMonthly).toBe(Math.round(14 * l.surfaceSqm)); expect(d.rentPerSqm).toBe(14); expect(d.recoverableChargesMonthly).toBe(0);
    expect(d).toMatchObject({ rentAvailable: true, rentIncludesCharges: true });
    expect(d.grossYieldPct).toBeCloseTo((14 * l.surfaceSqm * 12 / l.price) * 100, 1);
    expect(d.dataSources.rent).toMatchObject({ kind: 'anil', attribution: 'Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin' });
    expect(d.dataSources.gameValues).not.toContain('rent'); expect(d.dataSources.gameValues).toEqual(expect.arrayContaining(['condoFees', 'propertyTax', 'vacancy']));
    expect(d.scenario).toBeTruthy(); expect(d.netYieldPct).not.toBeNull();
  });
  it('AUCUN loyer connu : aucune rentabilité ni flux, loyer à 0 non affiché, source « none », jamais un loyer inventé', async () => {
    const l = await base(); const d = decorateListing(l, await scenarioContext(2015), null) as Record<string, any>;
    expect(d).toMatchObject({ rentAvailable: false, marketRentMonthly: 0, rentPerSqm: 0, grossYieldPct: null });
    expect(d).not.toHaveProperty('scenario'); expect(d).not.toHaveProperty('netYieldPct'); expect(d).not.toHaveProperty('monthlyCashFlow');
    expect(d.dataSources.rent).toEqual({ kind: 'none' }); expect(d.dataSources.gameValues).not.toContain('rent');
    const ec = listingEconomics(withRealRent(l, null)) as Record<string, unknown>;
    expect(ec).toMatchObject({ grossYieldPct: null, netYieldPct: null, annualCashFlow: null, collectedAnnualRent: null, breakevenOccupancyPct: null });
    expect(typeof ec.totalInvestment).toBe('number'); expect(typeof ec.notaryFees).toBe('number');         // coût d'achat toujours connu
  });
});

describe('mentions à l\'écran (module du frontend)', () => {
  it('« none » : pas de loyer, libellé neutre, rentabilité non disponible ; ANIL : « Loyer moyen de la commune » avec attribution exacte', () => {
    const none = rentInfo({ rent: { kind: 'none' } });
    expect(none).toMatchObject({ real: false, unavailable: true, label: 'Loyer' }); expect(rentKnown({ rent: { kind: 'none' } })).toBe(false);
    expect(rentKnown({ rent: { kind: 'jeu' } })).toBe(true); expect(rentKnown(undefined)).toBe(true);
    expect(yieldAvailable(null)).toBe(false);
    const anil = rentInfo({ rent: { kind: 'anil', communeLabel: 'Bordeaux', vintage: 2025, snapshotDate: '2025-09-30', estimate: 'commune', lowEurM2: 11, highEurM2: 17.5, attribution: RENT_ATTRIBUTION, nature: 'n' } });
    expect(anil).toMatchObject({ real: true, label: 'Loyer moyen de la commune', attribution: 'Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin' });
    expect(isGameValue({ gameValues: ['condoFees'] }, 'rent')).toBe(false);
  });
  it('la fiche affiche « — » et le texte « Rentabilité non disponible » sans loyer connu', () => {
    const detail = readFileSync(path.join(__dirname, '../../app/components/immo/Detail.jsx'), 'utf8');
    expect(detail).toContain('rentSrc.unavailable'); expect(detail).toContain('data-testid="rent-unavailable"'); expect(detail).toContain("ec.collectedAnnualRent === null");
  });
});
