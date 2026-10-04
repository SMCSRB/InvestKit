// Branchement 1/6 : loyer RÉEL (ANIL) d'une annonce. Série selon le bien, conversion €/m² → € par mois, aucune rentabilité sans loyer, mention de source, aucun futur, non branché. Fichiers FABRIQUÉS.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { gameUnitOf, rentGroupOfListing, listingRentFrom } from '../src/engine/immo/listingRent';
import { listingRentService } from '../src/services/listingRentService';
import { rentMarketService } from '../src/services/rentMarketService';
import { parseRentFile } from '../src/data/realEstate/rents/rentFile';
import { RENT_ATTRIBUTION, RENT_MARKET_ENABLED } from '../src/config/rentMarketRules';

describe('série ANIL d\'après le bien', () => {
  it('studio et 1-2 pièces : T1-T2 ; 3 pièces ou plus : T3 et plus ; maison : maisons ; parking : aucune série', () => {
    expect(gameUnitOf('studio', 1)).toBe('studio'); expect(gameUnitOf('apartment', 2)).toBe('t2'); expect(gameUnitOf('apartment', 3)).toBe('t3'); expect(gameUnitOf('apartment', 5)).toBe('t3');
    expect(rentGroupOfListing('studio', 1)).toBe('t12'); expect(rentGroupOfListing('apartment', 2)).toBe('t12'); expect(rentGroupOfListing('apartment', 3)).toBe('t3');
    expect(rentGroupOfListing('house', 4)).toBe('house'); expect(rentGroupOfListing('parking', 0)).toBeNull();
  });
});

describe('conversion du loyer au m² en loyer mensuel', () => {
  const facts = { communeLabel: 'Bordeaux', vintage: 2025, snapshotDate: '2025-09-30', estimate: 'commune' as const, rentEurM2: 14, lowEurM2: 11, highEurM2: 17.5, attribution: RENT_ATTRIBUTION, nature: 'n', approximation: null };
  it('loyer, fourchette et rendement brut (loyer × 12 ÷ prix) ; sans prix au m² : aucun rendement', () => {
    const r = listingRentFrom(facts, 50, 3000);
    expect(r).toMatchObject({ monthlyRent: 700, lowMonthly: 550, highMonthly: 875, rentPerSqm: 14, grossYieldPct: 5.6 });
    expect(r.source).toMatchObject({ kind: 'anil', communeLabel: 'Bordeaux', vintage: 2025, attribution: 'Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin' });
    expect(listingRentFrom(facts, 50).grossYieldPct).toBeNull(); expect(listingRentFrom(facts, 50, 0).grossYieldPct).toBeNull();
    expect(() => listingRentFrom(facts, 0)).toThrow();
  });
});

describe('garde : rien dans le moteur actuel ne reçoit encore de loyer réel', () => {
  const srcFiles = (): string[] => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    return files;
  };
  // Nombre d'arguments de chaque appel « name( … ) » d'un texte (virgules du premier niveau).
  const argCounts = (text: string, name: string): number[] => {
    const out: number[] = []; let i = text.indexOf(`${name}(`);
    while (i !== -1) {
      let depth = 0; let commas = 0; let j = i + name.length; let any = false;
      for (; j < text.length; j++) {
        const c = text[j];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) break; }
        else if (c === ',' && depth === 1) commas++;
        else if (depth >= 1 && !/\s/.test(c)) any = true;
      }
      out.push(any ? commas + 1 : 0);
      i = text.indexOf(`${name}(`, j);
    }
    return out;
  };
  it('drapeau désactivé ; le service de loyer d\'annonce n\'est importé par personne ; le module pur seulement par la décoration des annonces', () => {
    expect(RENT_MARKET_ENABLED).toBe(false);
    const own = /listingRentService\.ts$|engine[\\/]immo[\\/]listingRent\.ts$/;
    const service = srcFiles().filter((f) => /listingRentService/.test(readFileSync(f, 'utf8')) && !own.test(f)).map((f) => path.basename(f));
    expect(service, 'seul le service des annonces réelles (désactivé, appelé par personne) lit le loyer d\'annonce').toEqual(['realListingService.ts']);
    const pure = srcFiles().filter((f) => /immo\/listingRent'/.test(readFileSync(f, 'utf8')) && !own.test(f)).map((f) => path.basename(f)).sort();
    expect(pure).toEqual(['dvfSource.ts', 'realEstateService.ts', 'realListingService.ts']);      // dvfSource : branchement 6/6, refusé hors base « _test »
  });
  it('aucun appelant ne passe de loyer réel à decorateListing (3e argument) : le catalogue actuel garde son loyer', () => {
    for (const f of srcFiles()) {
      if (/realEstateService\.ts$|realListingService\.ts$/.test(f)) continue;       // le service des annonces réelles est désactivé et n'est appelé par personne (branchementAnnoncesDvf.test.ts)
      const counts = argCounts(readFileSync(f, 'utf8'), 'decorateListing');
      expect(counts.every((n) => n <= 2), `${path.basename(f)} : ${counts.join(',')}`).toBe(true);
    }
    const own = readFileSync(path.join(__dirname, '..', 'src', 'services', 'realEstateService.ts'), 'utf8');
    expect(argCounts(own.replace(/export const decorateListing[^\n]*\n/, ''), 'decorateListing').every((n) => n <= 2)).toBe(true);
  });
});

describe.skipIf(!hasDb)('lecture en base (source « anil »)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_rent_market, immo_rent_imports, immo_irl, immo_irl_imports CASCADE'); }, 60_000);
  afterAll(async () => { await query('TRUNCATE immo_rent_market, immo_rent_imports CASCADE'); await teardownDb(); });
  const NOW = new Date('2026-10-04T00:00:00Z');
  const at = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const f = (vintage: number, k: number) => ({ source: 'ANIL — Carte des loyers', vintage, snapshotDate: `${vintage}-09-30`, rows: [
    ['33063', 'all', 10 + k, 8 + k, 13 + k, 'commune', 100], ['33063', 't12', 12 + k, 10 + k, 15 + k, 'commune', 100], ['33063', 't3', 9 + k, 7 + k, 12 + k, 'maille', 40], ['33063', 'house', 8 + k, 6 + k, 11 + k, 'commune', 30],
  ] });
  const load = async (vintage: number, k: number) => { const o = f(vintage, k); await rentMarketService.importRents(parseRentFile(o, NOW), createHash('sha256').update(JSON.stringify(o)).digest('hex')); };

  it('série selon le bien, loyer = loyer au m² × surface, mention de source, rendement avec le prix au m²', async () => {
    await load(2024, 0);
    const d = at('2024-10-01');
    const studio = (await listingRentService.rentFor({ zoneCode: '33000', type: 'studio', rooms: 1, surfaceSqm: 20, pricePerM2: 4000 }, d))!;
    expect(studio.rentPerSqm).toBe(12); expect(studio.monthlyRent).toBe(240); expect(studio.grossYieldPct).toBe(3.6);              // série T1-T2
    const t3 = (await listingRentService.rentFor({ zoneCode: '33100', type: 'apartment', rooms: 3, surfaceSqm: 60 }, d))!;
    expect(t3.rentPerSqm).toBe(9); expect(t3.source.estimate).toBe('maille'); expect(t3.grossYieldPct).toBeNull();               // série T3 ; tous les codes postaux d'une commune partagent son loyer
    const house = (await listingRentService.rentFor({ zoneCode: '33000', type: 'house', rooms: 4, surfaceSqm: 90 }, d))!;
    expect(house.rentPerSqm).toBe(8); expect(house.monthlyRent).toBe(720);
    expect(studio.source).toMatchObject({ kind: 'anil', communeLabel: 'Bordeaux', attribution: RENT_ATTRIBUTION, approximation: null });
  });
  it('aucun loyer inventé : parking, commune sans loyer, zone inconnue, avant le premier millésime', async () => {
    const d = at('2024-10-01');
    expect(await listingRentService.rentFor({ zoneCode: '33000', type: 'parking', rooms: 0, surfaceSqm: 11, pricePerM2: 2000 }, d)).toBeNull();
    expect(await listingRentService.rentFor({ zoneCode: '75111', type: 'apartment', rooms: 2, surfaceSqm: 30, pricePerM2: 9000 }, d)).toBeNull();       // pas de loyer importé pour Paris 11e : aucune rentabilité
    expect(await listingRentService.rentFor({ zoneCode: '00000', type: 'apartment', rooms: 2, surfaceSqm: 30 }, d)).toBeNull();
    expect(await listingRentService.rentFor({ zoneCode: '33000', type: 'studio', rooms: 1, surfaceSqm: 20 }, at('2023-12-31'))).toBeNull();
  });
  it('loyer constant entre deux millésimes ; jamais un millésime futur ; approximation signalée avant le 30 septembre du premier millésime', async () => {
    await load(2025, 2);
    const q = { zoneCode: '33000', type: 'studio' as const, rooms: 1, surfaceSqm: 20 };
    expect((await listingRentService.rentFor(q, at('2024-03-01')))!.source.approximation).toMatch(/approximation avant cette date/);          // avant le 30/09/2024 : premier millésime
    expect((await listingRentService.rentFor(q, at('2025-09-29')))!.rentPerSqm).toBe(12);                                                      // 2024 jusqu'à la veille du 30/09/2025
    const next = (await listingRentService.rentFor(q, at('2025-09-30')))!;
    expect(next.rentPerSqm).toBe(14); expect(next.source.vintage).toBe(2025); expect(next.source.approximation).toBeNull();
  });
});
