// Taxe foncière RÉELLE (Terralyse, data.gouv.fr) : lecture stricte du fichier, aucun futur, base cadastrale estimée et signalée, garde « le moteur ne le lit pas », scripts, base. Les valeurs ci-dessous sont des VALEURS FABRIQUÉES de test.
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

// Fichier fabriqué : 12 communes × 2022-2024. Taux communal 15 + rang + année − 2022 ; intercommunal 5 + rang ; TEOM 8 ; virgule décimale. Paris (rang 0) : taux intercommunal VIDE.
const communalOf = (i: number, year: number): number => 15 + i + (year - 2022);
const interOf = (i: number): number => 5 + i;
const csv = (opts: { sep?: string; skip?: string; header?: string; extra?: string[]; noTeom?: boolean } = {}): string => {
  const sep = opts.sep ?? ';';
  const lines = [opts.header ?? `Code commune${sep}Libellé${sep}Année${sep}Taux commune TFB${sep}Taux intercommunal TFB${sep}Taux TEOM`];
  TAX_COMMUNES.forEach((c, i) => { if (c === opts.skip) return; for (const y of [2022, 2023, 2024]) lines.push(`${c}${sep}Ville ${i}${sep}${y}${sep}${String(communalOf(i, y)).replace('.', ',')} %${sep}${i === 0 ? '' : String(interOf(i)).replace('.', ',')}${sep}${opts.noTeom ? '' : '8,5'}`); });
  lines.push(`99999${sep}Hors jeu${sep}2022${sep}30${sep}2${sep}1`);        // commune hors des 12 villes : ignorée
  return [...lines, ...(opts.extra ?? [])].join('\n') + '\n';
};
const sorted = [...TAX_COMMUNES].sort();

describe('lecture du fichier (Terralyse)', () => {
  it('colonnes reconnues par leur nom (accents, casse, BOM), virgule décimale et « % » acceptés, communes hors jeu ignorées, résultat trié ; taux global = communal + intercommunal, TEOM à part', () => {
    const r = parseReiCsv('\ufeff' + csv());
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(12 * 3);
    const i = TAX_COMMUNES.indexOf(sorted[0]);
    expect(r.rows[0]).toEqual({ commune: sorted[0], year: 2022, communalPct: communalOf(i, 2022), intercommunalPct: i === 0 ? 0 : interOf(i), ratePct: communalOf(i, 2022) + (i === 0 ? 0 : interOf(i)), teomPct: 8.5 });
    expect(r.rows.every((x) => x.ratePct === Math.round((x.communalPct + x.intercommunalPct) * 10000) / 10000)).toBe(true);
    expect(r.rows.every((x) => x.ratePct !== x.communalPct + x.intercommunalPct + (x.teomPct ?? 0) || x.teomPct === 0)).toBe(true);   // la TEOM n'entre jamais dans le global
    expect(r.communesInFile).toBe(13);
    expect(normalizeColumn(' Année ')).toBe('annee');
    expect(parseReiCsv(csv({ sep: ',' }).replace(/ %/g, '')).ok).toBe(true);
    expect(parseReiCsv(csv({ noTeom: true })).rows[0].teomPct).toBeNull();
  });
  it('taux intercommunal vide (ex. Paris) : compté 0 ET signalé', () => {
    const r = parseReiCsv(csv());
    expect(r.emptyIntercommunal).toEqual(TAX_COMMUNES.slice(0, 1).flatMap((c) => [2022, 2023, 2024].map((y) => `${c}|${y}`)).sort());
    expect(r.rows.find((x) => x.commune === TAX_COMMUNES[0])?.intercommunalPct).toBe(0);
  });
  it('Paris, Lyon et Marseille : le taux est celui de la COMMUNE entière (pas de l\'arrondissement)', () => {
    expect(taxCommuneOf('paris')).toBe('75056'); expect(taxCommuneOf('lyon')).toBe('69123'); expect(taxCommuneOf('marseille')).toBe('13055');
    expect(taxCommuneOf('dijon')).toBe('21231');
    expect(TAX_COMMUNES).toHaveLength(DVF_CITIES.length);
  });
  it('refusé en entier, jamais deviné : colonne absente (les colonnes trouvées sont listées), commune absente, taux illisible, hors bornes, deux taux pour une même année', () => {
    const noRate = parseReiCsv(csv({ header: 'Code commune;Libellé;Année;Taux commune TFB;Autre;Taux TEOM' }));
    expect(noRate.ok).toBe(false); expect(noRate.rows).toEqual([]);
    expect(noRate.errors.join()).toMatch(/taux intercommunal/); expect(noRate.errors.join()).toMatch(/Colonnes trouvées : code_commune \| libelle \| annee \| taux_commune_tfb \| autre \| taux_teom/);
    expect(parseReiCsv(csv({ skip: '21231' })).errors.join()).toMatch(/absente\(s\) du fichier : 21231/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2024;abc;3;8'] })).errors.join()).toMatch(/taux communal illisible/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2024;20;xyz;8'] })).errors.join()).toMatch(/taux intercommunal illisible/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2025;999;3;8'] })).errors.join()).toMatch(/hors bornes/);
    expect(parseReiCsv(csv({ extra: ['21231;Dijon;2024;77;3;8'] })).errors.join()).toMatch(/deux taux différents/);
    expect(parseReiCsv('').ok).toBe(false);
  });
  it('fichier JSON préparé : lecture stricte', () => {
    const rows = parseReiCsv(csv()).rows.map((r) => [r.commune, r.year, r.ratePct, r.communalPct, r.intercommunalPct, r.teomPct]);
    const good = { source: 'Terralyse : taux', rows };
    expect(parseTaxRateFile(good).ok).toBe(true);
    expect(parseTaxRateFile({ ...good, source: 'autre' }).ok).toBe(false);
    expect(parseTaxRateFile({ ...good, rows: [...rows, rows[0]] }).errors.join()).toMatch(/doublon/);
    expect(parseTaxRateFile({ ...good, rows: [['00000', 2022, 30, 20, 10, null]] }).errors.join()).toMatch(/commune inconnue/);
    expect(parseTaxRateFile({ ...good, rows: [[rows[0][0], 2022, 0, 0, 0, null]] }).errors.join()).toMatch(/taux invalide/);
    expect(parseTaxRateFile({ ...good, rows: [[rows[0][0], 2022, 30, 20, 5, null]] }).errors.join()).toMatch(/communal \+ intercommunal/);
    expect(parseTaxRateFile({ ...good, rows: [[rows[0][0], 2022, 30, 20, 10, 99]] }).errors.join()).toMatch(/TEOM invalide/);
    expect(parseTaxRateFile({ source: 'Terralyse', rows: [] }).ok).toBe(false);
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
    expect(check).toContain('36 taux retenus'); expect(check).toContain('13 communes dans le fichier'); expect(check).toContain('base ESTIMÉE'); expect(check).toContain('Dijon'); expect(check).toContain('TEOM 8.5 %'); expect(check).toMatch(/taux intercommunal VIDE.*75056\|2022/);
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

describe.skipIf(!hasDb)('en base (source « terralyse »)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_property_tax_rates, immo_property_tax_imports CASCADE'); }, 60_000);
  afterAll(teardownDb);
  const rows = parseReiCsv(csv()).rows; const file = { source: 'Terralyse : taux', rows: rows.map((r) => [r.commune, r.year, r.ratePct, r.communalPct, r.intercommunalPct, r.teomPct]) };
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
    expect(cols.sort()).toEqual(['checksum', 'commune_code', 'communal_pct', 'first_year', 'id', 'imported_at', 'import_id', 'intercommunal_pct', 'last_year', 'rate_pct', 'row_count', 'source', 'teom_pct', 'year'].sort());
    const dijon = (await query("SELECT rate_pct, communal_pct, intercommunal_pct, teom_pct FROM immo_property_tax_rates WHERE commune_code = '21231' AND year = 2023")).rows[0];
    expect([Number(dijon.communal_pct) + Number(dijon.intercommunal_pct), Number(dijon.rate_pct), Number(dijon.teom_pct)]).toEqual([Number(dijon.rate_pct), Number(dijon.rate_pct), 8.5]);   // global = communal + intercommunal, TEOM à part
    expect((await query('SELECT source FROM immo_property_tax_imports LIMIT 1')).rows[0].source).toBe('terralyse');
  });
  it('un fichier refusé n\'importe rien', async () => {
    await expect(propertyTaxService.importRates(parseTaxRateFile({ source: 'autre', rows: [] }), 'x')).rejects.toThrow(/non validé/);
  });
});
