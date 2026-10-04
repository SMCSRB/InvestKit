// Étape 2 « prix réels » : nettoyage des DVF, médianes glissantes par mois, aucune fuite du futur. Données de test FABRIQUÉES (le réseau n'est pas disponible ici).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { parseCsv, cleanRows, trimOutliers, DvfSale } from '../src/data/realEstate/dvf/clean';
import { monthlyMarket, qualityReport, MIN_SALES } from '../src/data/realEstate/dvf/aggregate';
import { DVF_CITIES, allCodes, dvfUrl } from '../src/data/realEstate/dvf/cities';

const HEAD = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_nom_voie,code_postal,code_commune,nom_commune,code_departement,id_parcelle,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,code_nature_culture,surface_terrain,longitude,latitude';
const line = (o: Partial<Record<string, string | number>>) => {
  const d: Record<string, string | number> = { id_mutation: 'M1', date_mutation: '2020-03-10', numero_disposition: '000001', nature_mutation: 'Vente', valeur_fonciere: 300000, code_commune: '75111', nom_commune: 'Paris 11e', code_departement: '75', id_parcelle: '75111000AB0001', nombre_lots: 1, code_type_local: 2, type_local: 'Appartement', surface_reelle_bati: 50, nombre_pieces_principales: 2, longitude: 2.38, latitude: 48.86, ...o };
  return HEAD.split(',').map((h) => { const v = d[h] ?? ''; return String(v).includes(',') ? `"${v}"` : String(v); }).join(',');
};
const csv = (...lines: string[]) => [HEAD, ...lines].join('\n');
const clean = (...lines: string[]) => cleanRows(parseCsv(csv(...lines)));

describe('lecture CSV', () => {
  it('guillemets, virgules internes, CRLF, BOM, lignes vides', () => {
    const r = parseCsv('﻿a,b,c\r\n1,"x, y",3\r\n\r\n"4 ""q""",5,6\r\n');
    expect(r).toEqual([{ a: '1', b: 'x, y', c: '3' }, { a: '4 "q"', b: '5', c: '6' }]);
    expect(parseCsv('')).toEqual([]);
  });
});

describe('nettoyage des ventes', () => {
  it('garde une vente simple et calcule le prix au m²', () => {
    const r = clean(line({}));
    expect(r.sales).toHaveLength(1);
    expect(r.sales[0]).toMatchObject({ type: 'appartement', price: 300000, surface: 50, pricePerM2: 6000, code: '75111', date: '2020-03-10' });
  });
  it('une dépendance (cave, parking) ne rend pas la vente « multiple » ; la valeur répétée sur chaque ligne n\'est comptée qu\'une fois', () => {
    const r = clean(line({}), line({ type_local: 'Dépendance', surface_reelle_bati: '', code_type_local: 3 }));
    expect(r.sales).toHaveLength(1);
    expect(r.sales[0].price).toBe(300000);
  });
  it('rejette : autre nature, VEFA, plusieurs logements, aucun logement', () => {
    expect(clean(line({ nature_mutation: 'Echange' })).rejected.pas_une_vente).toBe(1);
    expect(clean(line({ nature_mutation: 'Vente en l\'état futur d\'achèvement' })).rejected.vefa).toBe(1);
    expect(clean(line({}), line({ id_parcelle: 'B2', type_local: 'Maison' })).rejected.plusieurs_logements).toBe(1);
    expect(clean(line({ type_local: 'Local industriel. commercial ou assimilé' })).rejected.sans_logement).toBe(1);
  });
  it('rejette surface, prix et prix au m² impossibles, et une date invalide', () => {
    expect(clean(line({ surface_reelle_bati: 3 })).rejected.surface_invalide).toBe(1);
    expect(clean(line({ surface_reelle_bati: 900 })).rejected.surface_invalide).toBe(1);
    expect(clean(line({ valeur_fonciere: 100 })).rejected.prix_invalide).toBe(1);
    expect(clean(line({ valeur_fonciere: '' })).rejected.prix_invalide).toBe(1);
    expect(clean(line({ valeur_fonciere: 20000, surface_reelle_bati: 100 })).rejected.prix_m2_hors_bornes).toBe(1);
    expect(clean(line({ date_mutation: '2020-02-30' })).rejected.date_invalide).toBe(1);
  });
  it('accepte la virgule décimale ; un même acte lu deux fois compte une fois', () => {
    expect(clean(line({ valeur_fonciere: '250000,5' })).sales[0].price).toBe(250001);
    expect(clean(line({}), line({})).sales).toHaveLength(1);
  });
  it('écarte une valeur aberrante seulement quand la médiane du groupe est fiable', () => {
    const mk = (n: number, p: number): DvfSale => ({ id: `s${n}${p}`, date: '2020-05-01', code: '75111', type: 'appartement', surface: 50, price: p * 50, pricePerM2: p, rooms: 2, lon: null, lat: null });
    const many = [...Array.from({ length: 25 }, (_, i) => mk(i, 6000 + i * 10)), mk(99, 60000 / 2 * 1.5), mk(98, 1000)];
    expect(trimOutliers(many).removed).toBe(2);
    const few = [mk(1, 6000), mk(2, 1000)];
    expect(trimOutliers(few).removed).toBe(0);
  });
});

const sale = (code: string, date: string, p: number, type: 'appartement' | 'maison' = 'appartement'): DvfSale => ({ id: `${code}${date}${p}${Math.random()}`, date, code, type, surface: 50, price: p * 50, pricePerM2: p, rooms: 2, lon: null, lat: null });
const many = (code: string, ym: string, n: number, p: number) => Array.from({ length: n }, (_, i) => sale(code, `${ym}-${String(1 + (i % 27)).padStart(2, '0')}`, p + i));
const get = (rows: ReturnType<typeof monthlyMarket>, key: string, month: string) => rows.find((r) => r.key === key && r.month === month && r.type === 'appartement')!;

describe('médianes glissantes', () => {
  it('fenêtre de 12 mois : une vente de plus de 12 mois n\'entre plus', () => {
    const s = [...many('33063', '2020-01', MIN_SALES, 4000), ...many('33063', '2021-02', MIN_SALES, 5000)];
    const rows = monthlyMarket(s, { from: '2020-01', to: '2021-03' });
    expect(get(rows, '33063', '2020-12').median).toBeLessThan(4100);
    expect(get(rows, '33063', '2021-01')).toMatchObject({ n: 0, median: null, fallback: 'aucun' });   // la fenêtre de janvier 2021 (févr. 2020 à janv. 2021) n'a plus la vente de janvier 2020 : « aucun », pas un chiffre inventé
    expect(get(rows, '33063', '2021-02').median).toBeGreaterThan(4900);
  });
  it('AUCUNE FUITE DU FUTUR : ajouter des ventes plus tard ne change aucun mois antérieur', () => {
    const base = [...many('33063', '2019-03', 15, 4000), ...many('33063', '2019-09', 15, 4200), ...many('75111', '2019-06', 12, 9000)];
    const future = [...many('33063', '2020-02', 40, 9999), ...many('75111', '2020-03', 40, 1500)];
    const a = monthlyMarket(base, { from: '2019-01', to: '2020-01' });
    const b = monthlyMarket([...base, ...future], { from: '2019-01', to: '2020-01' });
    expect(b).toEqual(a);
    const c = monthlyMarket([...base, ...future], { from: '2019-01', to: '2020-03' });
    expect(c.filter((r) => r.month <= '2020-01')).toEqual(a);
  });
  it('trop peu de ventes dans un arrondissement : repli sur la ville, sinon « aucun » (jamais un chiffre inventé)', () => {
    const s = [...many('75101', '2020-01', 3, 12000), ...many('75111', '2020-01', 15, 9000), ...many('75112', '2020-01', 15, 8000)];
    const rows = monthlyMarket(s, { from: '2020-02', to: '2020-02' });
    expect(get(rows, '75111', '2020-02').fallback).toBeNull();
    expect(get(rows, '75101', '2020-02')).toMatchObject({ fallback: 'ville' });
    expect(get(rows, '75101', '2020-02').n).toBeGreaterThanOrEqual(MIN_SALES);
    const none = monthlyMarket(many('33063', '2020-01', 3, 4000), { from: '2020-02', to: '2020-02' });
    expect(get(none, '33063', '2020-02')).toMatchObject({ fallback: 'aucun', median: null, p25: null });
  });
  it('une ligne par zone, type et mois', () => {
    const rows = monthlyMarket([], { from: '2020-01', to: '2020-03' });
    const zones = DVF_CITIES.reduce((n, c) => n + (c.districts ? c.codes.length : 1), 0);
    expect(rows).toHaveLength(zones * 2 * 3);
    expect(rows.every((r) => r.fallback === 'aucun' && r.median === null)).toBe(true);
  });
  it('le rapport signale les villes sans vente et les sauts de plus de 15 %', () => {
    const s = [...many('33063', '2020-01', 12, 4000), ...many('33063', '2020-06', 30, 6500)];
    const rows = monthlyMarket(s, { from: '2020-01', to: '2020-08' });
    const rep = qualityReport(s, rows);
    expect(rep.warnings.some((w) => w.startsWith('Toulouse : aucune vente'))).toBe(true);
    expect(rep.perCity.find((c) => c.id === 'bordeaux')!.sales).toBe(42);
    expect(rep.startYears[0].cities.find((c) => c.id === 'bordeaux')!.ok).toBe(true);
    expect(rep.startYears[0].cities.find((c) => c.id === 'paris')!.ok).toBe(false);
  });
});

describe('les 12 villes', () => {
  it('douze villes, codes uniques, arrondissements de Paris, Lyon, Marseille, jamais d\'Alsace-Moselle', () => {
    expect(DVF_CITIES).toHaveLength(12);
    expect(new Set(allCodes()).size).toBe(allCodes().length);
    const by = (id: string) => DVF_CITIES.find((c) => c.id === id)!;
    expect([by('paris').codes.length, by('lyon').codes.length, by('marseille').codes.length]).toEqual([20, 9, 16]);
    expect(by('paris').codes[0]).toBe('75101');
    expect(by('paris').codes[19]).toBe('75120');
    expect(DVF_CITIES.every((c) => !['67', '68', '57'].includes(c.department))).toBe(true);
    expect(DVF_CITIES.every((c) => c.codes.every((code) => code.startsWith(c.department)))).toBe(true);
    expect(DVF_CITIES.map((c) => c.id)).toEqual(['paris', 'lyon', 'marseille', 'bordeaux', 'toulouse', 'nantes', 'lille', 'montpellier', 'nice', 'rennes', 'dijon', 'saint-etienne']);
  });
  it('adresse de téléchargement : data.gouv.fr seulement, un fichier par commune et par année', () => {
    expect(dvfUrl(2020, '75111')).toBe('https://files.data.gouv.fr/geo-dvf/latest/csv/2020/communes/75/75111.csv');
    expect(dvfUrl(2019, '06088')).toContain('/communes/06/06088.csv');
  });
});

describe('script d\'import (de bout en bout, fichiers fabriqués)', () => {
  it('lit les fichiers, écrit le JSON compact et le rapport ; --check n\'écrit rien ; dossier absent = erreur claire', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dvf-'));
    mkdirSync(path.join(dir, '2020'), { recursive: true });
    const lines: string[] = [];
    for (let i = 0; i < 30; i++) lines.push(line({ id_mutation: `B${i}`, date_mutation: `2020-0${1 + (i % 6)}-1${i % 9}`, code_commune: '33063', nom_commune: 'Bordeaux', valeur_fonciere: 200000 + i * 1000, surface_reelle_bati: 50, id_parcelle: `P${i}` }));
    writeFileSync(path.join(dir, '2020', '33063.csv'), csv(...lines));
    const out = path.join(dir, 'marche.json');
    const run = (...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-import-dvf.ts', '--dir', dir, ...a], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    const check = run('--check', '--out', out);
    expect(check).toContain('30 ventes retenues');
    expect(check).toContain('Bordeaux');
    expect(existsSync(out)).toBe(false);
    const full = run('--out', out, '--from', '2020-01', '--to', '2020-12');
    expect(full).toContain('Écrit :');
    const j = JSON.parse(readFileSync(out, 'utf8'));
    expect(j.source).toContain('Licence Ouverte 2.0');
    expect(j.rows.length).toBe((20 + 9 + 16 + 9) * 2 * 12);
    const r = j.rows.find((x: any[]) => x[0] === '33063' && x[1] === '2020-06' && x[2] === 'a');
    expect(r[3]).toBeGreaterThanOrEqual(10);
    expect(r[4]).toBeGreaterThan(3900);
    expect(() => execFileSync('npx', ['ts-node', 'scripts/immo-import-dvf.ts', '--dir', path.join(dir, 'absent')], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe' })).toThrow();
  }, 90_000);
});
