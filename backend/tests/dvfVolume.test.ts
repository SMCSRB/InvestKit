// Volume réaliste : 5 années × 300 000 ventes (1,5 million), comme sur le serveur d'Andreja (243 758 en 2023, 219 034 en 2024, 251 093 en 2025…).
// Régression : « Maximum call stack size exceeded » à l'écriture de dvf-marche.json, causé par Math.min(...tableau de 1,2 million d'éléments).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { pushAll, minOf, maxOf } from '../src/data/realEstate/dvf/arrays';
import { buildFromSales, monthBounds } from '../src/data/realEstate/dvf/pipeline';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { DvfSale, trimOutliers } from '../src/data/realEstate/dvf/clean';

const YEARS = [2021, 2022, 2023, 2024, 2025];
const PER_YEAR = 300_000;
const ZONES = DVF_CITIES.flatMap((c) => c.codes.map((code, i) => ({ code, base: c.id === 'paris' ? 9_000 + (i % 5) * 500 : c.id === 'saint-etienne' ? 1_300 : 2_000 + ((DVF_CITIES.indexOf(c) * 311 + i * 97) % 3_500) })));

// Générateur déterministe (pas d'aléa : le test doit être reproductible).
const lcg = (seed: number) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; }; };

const bigArray = (n: number): number[] => { const a = new Array<number>(n); for (let i = 0; i < n; i++) a[i] = (i * 7) % 1000 + 1; return a; };

describe('grands tableaux sans « spread »', () => {
  it('Math.min(...tableau) plante à 1,5 million d\'éléments (la cause du bug) ; nos fonctions, non', () => {
    const big = bigArray(1_500_000);
    expect(() => Math.min(...big)).toThrow(RangeError);               // c'est exactement le plantage vu sur le serveur
    expect(minOf(big)).toBe(1);
    expect(maxOf(big)).toBe(1000);
    const target: number[] = [];
    expect(() => target.push(...big)).toThrow(RangeError);
    expect(pushAll([], big)).toHaveLength(1_500_000);
    expect(minOf([])).toBe(Infinity);
    expect(maxOf([])).toBe(-Infinity);
  });
});

describe('chaîne de préparation sur 1,5 million de ventes (en mémoire)', () => {
  it('nettoyage, médianes glissantes et rapport passent sans erreur, avec les bons résultats', () => {
    const rnd = lcg(42);
    const sales: DvfSale[] = [];
    for (const year of YEARS) {
      for (let i = 0; i < PER_YEAR; i++) {
        const z = ZONES[Math.floor(rnd() * ZONES.length)];
        const house = rnd() < 0.2;
        const surface = house ? 80 + Math.floor(rnd() * 60) : 20 + Math.floor(rnd() * 80);
        const perM2 = Math.round(z.base * (0.85 + rnd() * 0.3));
        const month = 1 + Math.floor(rnd() * 12);
        sales.push({ id: `${z.code}-${year}-${i}`, date: `${year}-${String(month).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`, code: z.code, type: house ? 'maison' : 'appartement', surface, price: surface * perM2, pricePerM2: perM2, rooms: 2, lon: null, lat: null });
      }
    }
    expect(sales).toHaveLength(YEARS.length * PER_YEAR);
    expect(monthBounds(sales)).toEqual({ first: '2021-01', last: '2025-12' });
    const built = buildFromSales(sales, {});
    expect(built.kept.length).toBeGreaterThan(1_400_000);
    expect(built.range).toEqual({ from: '2021-01', to: '2025-12' });
    expect(built.rows).toHaveLength(54 * 2 * 60);                         // 54 quartiers × 2 types × 60 mois
    expect(built.report.presentYears).toEqual(YEARS);
    expect(built.report.absentYears).toEqual([2014, 2015, 2016, 2017, 2018, 2019, 2020]);
    expect(built.report.perCity).toHaveLength(12);
    expect(built.report.perCity.every((c) => c.sales > 20_000)).toBe(true);        // Saint-Étienne n’a qu’un quartier sur 54 : environ 28 000 ventes
    const paris = built.rows.find((r) => r.key === '75111' && r.month === '2025-06' && r.type === 'appartement')!;
    expect(paris.fallback).toBeNull();
    expect(paris.median!).toBeGreaterThan(7_500); expect(paris.median!).toBeLessThan(11_500);
    // Une seule année énorme dans UN groupe (commune, type, année) : les valeurs aberrantes sont écartées sans erreur non plus.
    const one: DvfSale[] = [];
    for (let i = 0; i < 400_000; i++) one.push({ id: `x${i}`, date: '2024-05-10', code: '33063', type: 'appartement', surface: 50, price: 50 * (i % 1000 === 0 ? 90_000 : 4_000), pricePerM2: i % 1000 === 0 ? 90_000 : 4_000, rooms: 2, lon: null, lat: null });
    const t = trimOutliers(one);
    expect(t.removed).toBe(400);
    expect(t.kept).toHaveLength(399_600);
  }, 240_000);
});

describe('script immo:import-dvf sur 1,5 million de lignes (fichiers fabriqués)', () => {
  it('écrit dvf-marche.json sans « Maximum call stack size exceeded » ; immo:load-dvf et immo:simulate-niveau le relisent', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dvf-volume-'));
    const rnd = lcg(7);
    const HEAD = 'id_mutation,date_mutation,nature_mutation,valeur_fonciere,code_commune,id_parcelle,nombre_lots,type_local,surface_reelle_bati,nombre_pieces_principales,longitude,latitude';
    const perFile = Math.floor(PER_YEAR / ZONES.length);                  // environ 5 555 lignes par quartier et par année
    let total = 0;
    for (const year of YEARS) {
      mkdirSync(path.join(dir, String(year)), { recursive: true });
      for (const z of ZONES) {
        const lines: string[] = [HEAD];
        for (let i = 0; i < perFile; i++) {
          const house = rnd() < 0.2;
          const surface = house ? 80 + Math.floor(rnd() * 60) : 20 + Math.floor(rnd() * 80);
          const price = surface * Math.round(z.base * (0.85 + rnd() * 0.3));
          const mm = String(1 + Math.floor(rnd() * 12)).padStart(2, '0'); const dd = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
          lines.push(`${z.code}-${year}-${i},${year}-${mm}-${dd},Vente,${price},${z.code},P${i},1,${house ? 'Maison' : 'Appartement'},${surface},3,,`);
        }
        writeFileSync(path.join(dir, String(year), `${z.code}.csv`), lines.join('\n') + '\n');
        total += perFile;
      }
    }
    expect(total).toBeGreaterThanOrEqual(YEARS.length * 295_000);
    const cwd = path.join(__dirname, '..');
    const out = path.join(dir, 'dvf-marche.json');
    const run = (script: string, ...a: string[]) => execFileSync('npx', ['ts-node', script, ...a], { cwd, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 });
    const imp = run('scripts/immo-import-dvf.ts', '--dir', dir, '--out', out);         // SANS --check : c'est l'étape qui plantait
    expect(imp).not.toContain('Maximum call stack');
    expect(imp).toContain('Écrit :');
    const m = /(\d+) ventes retenues/.exec(imp)!;
    expect(Number(m[1])).toBeGreaterThan(1_450_000);
    expect(imp).toContain('Années présentes : 2021 à 2025. Années absentes : 2014 à 2020');
    expect(existsSync(out)).toBe(true);
    const json = JSON.parse(readFileSync(out, 'utf8'));
    expect(json.rows).toHaveLength(54 * 2 * 60);
    expect(json.range).toEqual({ from: '2021-01', to: '2025-12' });
    // Les deux autres commandes relisent ce fichier : mêmes grands volumes, aucun plantage.
    const load = run('scripts/immo-load-dvf.ts', '--file', out);
    expect(load).toContain('Simulation : rien n\'est écrit');
    expect(load).toMatch(/\d+ lignes avec prix/);
    const sim = run('scripts/immo-simulate-niveau.ts', '--file', out);
    expect(sim).toContain('VERDICT');
    expect(sim).toContain('2025-12');
  }, 600_000);
});
