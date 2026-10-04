// Mentions à l'écran sur l'origine des chiffres de l'Immobilier : attribution du loyer réel, « loyer moyen de la commune », marque « valeur de jeu » sur ce qui n'a pas de source ouverte.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
// @ts-expect-error module JavaScript du frontend
import { isGameValue, rentInfo, yieldAvailable, NO_YIELD_TEXT, GAME_VALUE_LABEL, GAME_VALUE_HELP } from '../../app/lib/immoSources.js';
import { listingDataSources, GAME_VALUE_FIELDS, RentSource } from '../src/engine/immo/dataSources';
import { decorateListing } from '../src/services/realEstateService';
import { RENT_ATTRIBUTION, RENT_NATURE } from '../src/config/rentMarketRules';

const APP = path.join(__dirname, '../../app');
const read = (p: string) => readFileSync(path.join(APP, p), 'utf8');
const anil: RentSource = { kind: 'anil', communeLabel: 'Bordeaux', vintage: 2025, snapshotDate: '2025-09-30', estimate: 'commune', lowEurM2: 10.2, highEurM2: 17.5, attribution: RENT_ATTRIBUTION, nature: RENT_NATURE };

describe('origine des chiffres : côté serveur', () => {
  it('aujourd\'hui (catalogue fictif) : le loyer et toutes les charges sont des valeurs de jeu', () => {
    const s = listingDataSources();
    expect(s.rent).toEqual({ kind: 'jeu' });
    expect(s.gameValues).toEqual([...GAME_VALUE_FIELDS]);
    expect(GAME_VALUE_FIELDS).toEqual(['rent', 'vacancy', 'tenancy', 'condoFees', 'propertyTax', 'insurance', 'maintenance', 'recoverableCharges']);
  });
  it('un loyer réel retire seulement « rent » des valeurs de jeu ; le reste reste marqué', () => {
    const s = listingDataSources(anil);
    expect(s.rent.kind).toBe('anil');
    expect(s.gameValues).not.toContain('rent');
    expect(s.gameValues).toEqual(expect.arrayContaining(['condoFees', 'vacancy', 'propertyTax']));
  });
  it('chaque annonce renvoyée par le serveur porte sa source', () => {
    const l = { id: 'x', price: 100_000, marketRentMonthly: 400, surfaceSqm: 40, advertisedWorks: 0, needsWorks: false, energyClass: 'D', condition: 'good' } as never;
    expect((decorateListing(l) as { dataSources: unknown }).dataSources).toEqual(listingDataSources());
  });
});

describe('origine des chiffres : textes de l\'écran', () => {
  it('loyer de jeu : « Loyer de référence », pas d\'attribution ; loyer ANIL : « Loyer moyen de la commune », nature, millésime, fourchette, attribution', () => {
    expect(rentInfo(listingDataSources())).toMatchObject({ real: false, label: 'Loyer de référence', attribution: null });
    expect(rentInfo(undefined).real).toBe(false);
    const r = rentInfo(listingDataSources(anil));
    expect(r.real).toBe(true);
    expect(r.label).toBe('Loyer moyen de la commune');
    expect(r.source).toContain('loyer d\'annonce, charges comprises');
    expect(r.source).toContain('Millésime 2025');
    expect(r.source).toContain('30/09/2025');
    expect(r.source).toContain('10,2 à 17,5');
    expect(r.attribution).toMatch(/ANIL/);
    expect(r.attribution).toMatch(/Licence Ouverte 2\.0/);
    expect(r.estimate).toBeNull();
    expect(rentInfo(listingDataSources({ ...anil, estimate: 'maille' })).estimate).toMatch(/groupe de communes voisines/);
  });
  it('« valeur de jeu » : marqué par défaut (sans information), plus marqué quand une source réelle le remplace', () => {
    expect(GAME_VALUE_LABEL).toBe('valeur de jeu');
    expect(GAME_VALUE_HELP).toMatch(/non sourcée, à reconfirmer/);
    expect(isGameValue(undefined, 'rent')).toBe(true);
    expect(isGameValue(listingDataSources(), 'condoFees')).toBe(true);
    expect(isGameValue(listingDataSources(anil), 'rent')).toBe(false);
    expect(isGameValue(listingDataSources(anil), 'condoFees')).toBe(true);
  });
  it('pas de loyer, pas de rentabilité', () => {
    expect(yieldAvailable(4.2)).toBe(true);
    expect(yieldAvailable(null)).toBe(false);
    expect(yieldAvailable(undefined)).toBe(false);
    expect(yieldAvailable(NaN)).toBe(false);
    expect(NO_YIELD_TEXT).toMatch(/pas de loyer connu/);
  });
  it('la fiche marque chacune des valeurs de jeu, affiche l\'attribution du loyer réel et ne montre pas de rendement sans loyer', () => {
    const detail = read('components/immo/Detail.jsx');
    for (const f of GAME_VALUE_FIELDS) expect(detail, f).toContain(`isGameValue(l.dataSources, '${f}')`);
    expect(detail).toContain('data-testid="rent-source"');
    expect(detail).toContain('rentSrc.attribution');
    expect(detail).toContain('yieldAvailable(l.grossYieldPct)');
    const search = read('components/immo/Search.jsx');
    expect(search).toContain('yieldAvailable(l.grossYieldPct)');
    expect(search).toContain('<GameValueTag compact />');
  });
});
