// Taxe foncière RÉELLE (DGFiP, REI) : lecture stricte du fichier, aucun futur, base cadastrale estimée et signalée, garde « le moteur ne le lit pas », scripts, base. Les valeurs ci-dessous sont des VALEURS FABRIQUÉES de test.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { parseReiCsv, TAX_COMMUNES, taxCommuneOf, normalizeColumn } from '../src/data/realEstate/taxes/rei';
import { parseTaxRateFile } from '../src/data/realEstate/taxes/rateFile';
import { taxRateAt, propertyTaxEstimate, rateUsableOn } from '../src/engine/immo/propertyTax';
import { propertyTaxService } from '../src/services/propertyTaxService';
import { PROPERTY_TAX_ENABLED, CADASTRAL_BASE_NET_EUR_PER_SQM, TAX_RATE_USABLE_FROM } from '../src/config/propertyTaxRules';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { listingDataSources, GAME_VALUE_FIELDS } from '../src/engine/immo/dataSources';

// Fichier fabriqué : 12 communes × 2022-2024, taux 20 + (rang de la commune) + 1 par année, virgule décimale.
const rateOf = (i: number, year: number): number => 20 + i + (year - 2022);
const csv = (opts: { sep?: string; skip?: string; header?: string; extra?: string[] } = {}): string => {
  const sep = opts.sep ?? ';';
  const lines = [opts.header ?? `Code commune${sep}Libellé${sep}Année${sep}Taux global TFB`];
  TAX_COMMUNES.forEach((c, i) => { if (c === opts.skip) return; for (const y of [2022, 2023, 2024]) lines.push(`${c}${sep}Ville ${i}${sep}${y}${sep}${String(rateOf(i, y)).replace('.', ',')} %`); });
  lines.push(`99999${sep}Hors jeu${sep}2022${sep}30`);        // commune hors des 12 villes : ignorée
  return [...lines, ...(opts.extra ?? [])].join('\n') + '\n';
};

describe('lecture du fichier de la DGFiP', () => {
  it('colonnes reconnues par leur nom (accents, casse, BOM), virgule décimale et « % » acceptés, communes hors jeu ignorées, résultat trié', () => {
    const r = parseReiCsv('﻿' + csv());
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(12 * 3);
    expect(r.rows[0]).toEqual({ commune: [...TAX_COMMUNES].sort()[0], year: 2022, ratePct: rateOf(TAX_COMMUNES.indexOf([...TAX_COMMUNES].sort()[0]), 2022) });
    expect(normalizeColumn(' Année ')).toBe('annee');
    expect(parseReiCsv(csv({ sep: ',' }).replace(/ %/g, '')).ok).toBe(true);
    expect(parseReiCsv('Code commune;Année;Taux global TFB\n' + TAX_COMMUNES.map((c) => `${c};2024;21,5 %`).join('\n')).rows[0].ratePct).toBe(21.5);
  });
  it('Paris, Lyon et Marseille : le taux est celui de la COMMUNE entière (pas de l\'arrondissement)', () => {
    expect(taxCommuneOf('paris')).toBe('75056'); expect(taxCommuneOf('lyon')).toBe('69123'); expect(taxCommuneOf('marseille')).toBe('13055');
    expect(taxCommuneOf('dijon')).toBe('21231');
    expect(TAX_COMMUNES).toHaveLength(DVF_CITIES.length);
  });
  it('refusé en entier, jamais deviné : colonne absente (les colonnes trouvées sont listées), commune absente, taux illisible, hors bornes, deux taux pour une même année', () => {
    const noRate = parseReiCsv(csv({ header: 'Code commune;Libellé;Année;Autre colonne' }));
    expect(noRate.ok).toBe(false); expect(noRate.rows).toEqual([]);
    expect(noRate.errors.join()).toMatch(/taux global de taxe foncière bâtie/); expect(noRate.errors.join()).toMatch(/Colonnes trouvées : code_commune \| libelle \| annee \| autre_colonne/);
    expect(parseReiCsv(csv({ skip: '21231' })).errors.join()).toMatch(/absente\(s\) du fichier : 21231/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2024;abc'] })).errors.join()).toMatch(/taux illisible/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2025;999'] })).errors.join()).toMatch(/hors bornes/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2024;77'] })).errors.join()).toMatch(/deux taux différents/);
    expect(parseReiCsv('').ok).toBe(false);
  });
  it('fichier JSON préparé : lecture stricte', () => {
    const rows = parseReiCsv(csv()).rows.map((r) => [r.commune, r.year, r.ratePct]);
    const good = { source: 'DGFiP : taux', rows };
    expect(parseTaxRateFile(good).ok).toBe(true);
    expect(parseTaxRateFile({ ...good, source: 'autre' }).ok).toBe(false);
    expect(parseTaxRateFile({ ...good, rows: [...rows, rows[0]] }).errors.join()).toMatch(/doublon/);
    expect(parseTaxRateFile({ ...good, rows: [['00000', 2022, 30]] }).errors.join()).toMatch(/commune inconnue/);
    expect(parseTaxRateFile({ ...good, rows: [[rows[0][0], 2022, 0]] }).errors.join()).toMatch(/taux invalide/);
    expect(parseTaxRateFile({ source: 'DGFiP', rows: [] }).ok).toBe(false);
  });
});

describe('taux en vigueur à une date de jeu (aucun futur, constant entre deux années)', () => {
  const series = [{ year: 2022, ratePct: 40 }, { year: 2023, ratePct: 42 }, { year: 2024, ratePct: 44 }];
  it('avant la première année : null (on n\'invente rien) ; ensuite le dernier taux dont la date d\'usage est atteinte', () => {
    expect(TAX_RATE_USABLE_FROM).toBe('10-01');
    expect(taxRateAt(series, '2022-09-30')).toBeNull();
    expect(taxRateAt(series, '2022-10-01')).toEqual({ year: 2022, ratePct: 40 });
    expect(taxRateAt(series, '2023-06-15')).toEqual({ year: 2022, ratePct: 40 });
    expect(taxRateAt(series, '2023-10-01')?.ratePct).toBe(42);
    expect(taxRateAt(series, '2026-10-04')?.year).toBe(2024);           // pas de valeur future : on garde la dernière connue
    expect(rateUsableOn(2025)).toBe('2025-10-01');
  });
});

describe('estimation de la taxe d\'un bien', () => {
  it('base nette estimée × taux ; la base est TOUJOURS signalée comme estimée', () => {
    const e = propertyTaxEstimate(50, { year: 2024, ratePct: 40 });
    expect(e.baseNetEur).toBe(50 * CADASTRAL_BASE_NET_EUR_PER_SQM);
    expect(e.annualEur).toBe(Math.round(e.baseNetEur * 0.4));
    expect(e).toMatchObject({ ratePct: 40, rateYear: 2024, baseEstimated: true });
    expect(propertyTaxEstimate(50, { year: 2024, ratePct: 40 }, 20).annualEur).toBe(400);
  });
});

describe('garde : le moteur actuel ne lit pas la taxe foncière réelle', () => {
  it('PROPERTY_TAX_ENABLED est faux, aucune route ni moteur n\'importe ces modules, la taxe reste une valeur de jeu marquée à l\'écran', () => {
    expect(PROPERTY_TAX_ENABLED).toBe(false);
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const own = /propertyTaxService\.ts$|propertyTaxRules\.ts$|engine[\\/]immo[\\/]propertyTax\.ts$|taxes[\\/]rei\.ts$|taxes[\\/]rateFile\.ts$/;
    const users = files.filter((f) => /propertyTaxService|propertyTaxRules|immo\/propertyTax'|taxes\/rei|taxes\/rateFile/.test(readFileSync(f, 'utf8')) && !own.test(f));
    expect(users, 'aucun moteur ni route ne doit lire la taxe foncière réelle tant que ce n\'est pas décidé').toEqual([]);
    expect(GAME_VALUE_FIELDS).toContain('propertyTax');
    expect(listingDataSources().gameValues).toContain('propertyTax');
  });
});

describe('scripts immo:import-taxe-fonciere (fichier fabriqué)', () => {
  it('rapport lisible ; --check n\'écrit rien ; écrit le JSON ; fichier refusé = rien d\'écrit ; load simule sans base et refuse hors base _test', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tf-')); const cwd = path.join(__dirname, '..');
    const f = path.join(dir, 'taux.csv'); writeFileSync(f, csv());
    const out = path.join(dir, 'taux.json');
    const run = (...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-import-taxe-fonciere.ts', '--file', f, ...a], { cwd, encoding: 'utf8', stdio: 'pipe' });
    const check = run('--check', '--out', out);
    expect(check).toContain('36 taux retenus'); expect(check).toContain('base ESTIMÉE'); expect(check).toContain('Dijon');
    expect(existsSync(out)).toBe(false);
    expect(run('--out', out)).toContain('Écrit :');
    const j = JSON.parse(readFileSync(out, 'utf8'));
    expect(j.rows).toHaveLength(36); expect(parseTaxRateFile(j).ok).toBe(true);
    const load = (env: Record<string, string>, ...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-load-taxe-fonciere.ts', '--file', out, ...a], { cwd, encoding: 'utf8', env: { ...process.env, ...env }, stdio: 'pipe' });
    expect(load({ DATABASE_URL: '' })).toContain('Simulation : rien n\'est écrit');
    let refused = ''; try { load({ DATABASE_URL: 'postgresql://x:y@localhost:5432/investkit' }, '--apply'); } catch (e: any) { refused = String(e.stderr); }
    expect(refused).toMatch(/_test/);
    writeFileSync(f, csv({ skip: '21231' }));
    const out2 = path.join(dir, 'refuse.json'); let failed = false; try { run('--out', out2); } catch { failed = true; }
    expect(failed).toBe(true); expect(existsSync(out2)).toBe(false);
  }, 120_000);
});

describe.skipIf(!hasDb)('en base (source « dgfip-rei »)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_property_tax_rates, immo_property_tax_imports CASCADE'); }, 60_000);
  afterAll(teardownDb);
  const rows = parseReiCsv(csv()).rows; const file = { source: 'DGFiP : taux', rows: rows.map((r) => [r.commune, r.year, r.ratePct]) };
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
  it('import rejouable, aucun futur, aucune donnée personnelle dans les tables', async () => {
    const parsed = parseTaxRateFile(file);
    const a = await propertyTaxService.importRates(parsed, sum(file));
    expect(a).toMatchObject({ imported: true, rows: 36 });
    expect(await propertyTaxService.importRates(parsed, sum(file))).toMatchObject({ imported: false, importId: a.importId });
    expect(await propertyTaxService.rateAt('21231', '2022-09-30')).toBeNull();
    expect((await propertyTaxService.rateAt('21231', '2023-12-01'))?.year).toBe(2023);
    expect((await propertyTaxService.series('21231')).map((p) => p.year)).toEqual([2022, 2023, 2024]);
    const cols = (await query(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('immo_property_tax_rates', 'immo_property_tax_imports')`)).rows.map((r) => r.column_name as string);
    expect(cols.sort()).toEqual(['checksum', 'commune_code', 'first_year', 'id', 'imported_at', 'import_id', 'last_year', 'rate_pct', 'row_count', 'source', 'year'].sort());
  });
  it('un fichier refusé n\'importe rien', async () => {
    await expect(propertyTaxService.importRates(parseTaxRateFile({ source: 'autre', rows: [] }), 'x')).rejects.toThrow(/non validé/);
  });
});
