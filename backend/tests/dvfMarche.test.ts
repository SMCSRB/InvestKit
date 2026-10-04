// Étape 3 (préparation) : médianes DVF en base, source « dvf », NON activée pour les joueurs ; aucun futur, aucune adresse.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { zoneLabel, DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { STANDARD_COLUMNS } from '../src/data/realEstate/dvf/format';
import { dvfMarketService, DVF_VIEW_KEYS } from '../src/services/dvfMarketService';
import { DVF_MARKET_ENABLED } from '../src/config/dvfMarketRules';

const NOW = new Date('2026-10-04T00:00:00Z');
const file = (rows: unknown[][], over: Record<string, unknown> = {}) => ({
  source: 'DVF géolocalisées (DGFiP, via data.gouv.fr), Licence Ouverte 2.0', windowMonths: 12, minSales: 10, range: { from: '2021-01', to: '2021-12' },
  columns: ['zone', 'mois', 'type', 'ventes', 'médiane €/m²', 'quartier 1', 'quartier 3', 'repli'], rows, ...over,
});
const OK_ROWS = [
  ['75111', '2021-03', 'a', 40, 9000, 8500, 9600, null],
  ['75111', '2021-04', 'a', 42, 9200, 8600, 9800, null],
  ['75101', '2021-04', 'a', 12, 11000, 10000, 12000, 'ville'],
  ['33000', '2021-01', 'm', 3, null, null, null, 'aucun'],
];

describe('activation', () => {
  it('les prix DVF ne sont PAS activés pour les joueurs, et rien dans le jeu ne les lit', () => {
    expect(DVF_MARKET_ENABLED).toBe(false);
    const src = path.join(__dirname, '..', 'src');
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(src);
    const users = files.filter((f) => /dvfMarketService|dvfMarketRules|marketFile/.test(readFileSync(f, 'utf8')) && !/dvfMarketService\.ts$|dvfMarketRules\.ts$|marketFile\.ts$|realListingService\.ts$|realEstate[\\/]dvfSource\.ts$/.test(f));   // realListingService : branchement 3/6 ; dvfSource : branchement 6/6, refusé hors base « _test » (voir branchementActivation.test.ts)
    expect(users, 'aucun moteur ni route ne doit importer le service DVF tant que le point 2 n\'est pas validé').toEqual([]);
  });
});

describe('fichier de médianes : lecture stricte', () => {
  it('accepte un fichier cohérent, ne stocke pas les mois « aucun », marque le repli sur la ville', () => {
    const r = parseMarketFile(file(OK_ROWS), NOW);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(3);
    expect(r.skippedNoPrice).toBe(1);
    expect(r.rows.find((x) => x.zone === '75101')).toMatchObject({ scope: 'city', type: 'apartment', month: '2021-04' });
    expect(r.rows.find((x) => x.zone === '75111')).toMatchObject({ scope: 'zone', median: 9000 });
    expect(r.meta).toEqual({ from: '2021-01', to: '2021-12', windowMonths: 12, minSales: 10 });
  });
  it.each([
    ['quartier inconnu', [['99999', '2021-03', 'a', 40, 9000, 8500, 9600, null]]],
    ['mois invalide', [['75111', '2021-13', 'a', 40, 9000, 8500, 9600, null]]],
    ['mois hors période', [['75111', '2020-12', 'a', 40, 9000, 8500, 9600, null]]],
    ['type inconnu', [['75111', '2021-03', 'x', 40, 9000, 8500, 9600, null]]],
    ['prix incohérents (quartile 1 au-dessus de la médiane)', [['75111', '2021-03', 'a', 40, 9000, 9500, 9600, null]]],
    ['prix hors bornes', [['75111', '2021-03', 'a', 40, 90, 80, 100, null]]],
    ['sous le seuil de ventes', [['75111', '2021-03', 'a', 3, 9000, 8500, 9600, null]]],
    ['« aucun » avec un prix', [['75111', '2021-03', 'a', 3, 9000, 8500, 9600, 'aucun']]],
    ['doublon', [OK_ROWS[0], OK_ROWS[0]]],
    ['mauvaise forme', [['75111', '2021-03']]],
    ['repli inconnu', [['75111', '2021-03', 'a', 40, 9000, 8500, 9600, 'devine']]],
  ] as const)('refuse tout le fichier : %s', (_n, rows) => {
    const r = parseMarketFile(file(rows as unknown as unknown[][]), NOW);
    expect(r.ok).toBe(false);
    expect(r.rows).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it('refuse un mois dans le futur, une source qui n\'est pas DVF, une période invalide, un JSON qui n\'est pas un objet', () => {
    expect(parseMarketFile(file([['75111', '2021-03', 'a', 40, 9000, 8500, 9600, null]], { range: { from: '2021-01', to: '2030-01' } }), new Date('2021-02-10T00:00:00Z')).ok).toBe(false);
    expect(parseMarketFile(file(OK_ROWS, { source: 'Autre chose' }), NOW).ok).toBe(false);
    expect(parseMarketFile(file(OK_ROWS, { range: { from: '2021-12', to: '2021-01' } }), NOW).ok).toBe(false);
    expect(parseMarketFile(null, NOW).ok).toBe(false);
    expect(parseMarketFile('texte', NOW).ok).toBe(false);
  });
});

describe('aucune adresse nulle part', () => {
  it('noms de quartier lisibles, sans rue ni numéro', () => {
    expect(zoneLabel('75111')).toBe('Paris 11e');
    expect(zoneLabel('75101')).toBe('Paris 1er');
    expect(zoneLabel('69383')).toBe('Lyon 3e');
    expect(zoneLabel('13208')).toBe('Marseille 8e');
    expect(zoneLabel('33063')).toBe('Bordeaux');            // code commune : la ville entière
    expect(zoneLabel('33000')).toBe('Bordeaux 33000');      // zone = code postal
    expect(zoneLabel('06100')).toBe('Nice 06100');
    expect(zoneLabel('99999')).toBeNull();
    expect(DVF_CITIES.every((c) => c.zones.every((z) => !/\d+ (rue|avenue|boulevard)/i.test(zoneLabel(z)!)))).toBe(true);
  });
  it('le code du pipeline ne lit ni n\'écrit aucune colonne d\'adresse', () => {
    expect(STANDARD_COLUMNS.filter((c) => /adresse|voie|numero_voie|no_voie/.test(c))).toEqual([]);   // le code postal est gardé : il donne la zone lisible (« Bordeaux 33000 »), jamais la rue
    const dir = path.join(__dirname, '..', 'src', 'data', 'realEstate', 'dvf');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
      const code = readFileSync(path.join(dir, f), 'utf8').replace(/\/\/.*$/gm, '');
      expect(code, f).not.toMatch(/adresse_|nom_voie|code_voie|no_voie|numero_voie|\bvoie\b/);
    }
  });
});

describe.skipIf(!hasDb)('en base (source « dvf »)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_dvf_market, immo_dvf_imports CASCADE'); }, 60_000);
  afterAll(teardownDb);
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');

  it('les tables n\'ont aucune colonne d\'adresse ni de coordonnées', async () => {
    const cols = (await query(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('immo_dvf_market', 'immo_dvf_imports')`)).rows.map((r) => r.column_name as string);
    expect(cols.length).toBeGreaterThan(8);
    expect(cols.filter((c) => /adresse|voie|rue|numero|lat|lon|geo|parcel|postal/i.test(c))).toEqual([]);
  });

  it('import : écrit les lignes avec prix, rejouable (même fichier = rien de plus), source marquée « dvf »', async () => {
    const parsed = parseMarketFile(file(OK_ROWS), NOW);
    const a = await dvfMarketService.importMarket(parsed, sum(OK_ROWS));
    expect(a).toMatchObject({ imported: true, rows: 3 });
    const b = await dvfMarketService.importMarket(parsed, sum(OK_ROWS));
    expect(b).toMatchObject({ imported: false, importId: a.importId });
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM immo_dvf_market')).rows[0].n)).toBe(3);
    expect((await query('SELECT source FROM immo_dvf_imports')).rows).toEqual([{ source: 'dvf' }]);
    expect(await dvfMarketService.lastMonth()).toBe('2021-04');
  });

  it('un fichier refusé n\'importe rien', async () => {
    const bad = parseMarketFile(file([['99999', '2021-03', 'a', 40, 9000, 8500, 9600, null]]), NOW);
    await expect(dvfMarketService.importMarket(bad, 'zzz')).rejects.toThrow(/non validé/);
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM immo_dvf_imports')).rows[0].n)).toBe(1);
  });

  it('AUCUN FUTUR : à la date D, seul un mois ENTIÈREMENT passé est utilisé (jamais le mois de D)', async () => {
    const d = (s: string) => Date.parse(`${s}T00:00:00Z`);
    expect((await dvfMarketService.priceAt('75111', 'apartment', d('2021-04-15')))!.asOfMonth).toBe('2021-03');     // le mois d'avril contient des ventes après le 15
    expect((await dvfMarketService.priceAt('75111', 'apartment', d('2021-04-01')))!.asOfMonth).toBe('2021-03');
    expect((await dvfMarketService.priceAt('75111', 'apartment', d('2021-05-01')))!.asOfMonth).toBe('2021-04');
    expect(await dvfMarketService.priceAt('75111', 'apartment', d('2021-03-31'))).toBeNull();                         // février n'existe pas : pas de prix, pas de chiffre pris dans le futur
    expect(await dvfMarketService.priceAt('75111', 'apartment', d('2021-03-01'))).toBeNull();
    expect(await dvfMarketService.priceAt('75111', 'house', d('2021-06-01'))).toBeNull();
    expect(await dvfMarketService.priceAt('99999', 'apartment', d('2021-06-01'))).toBeNull();
  });

  it('le prix exposé ne contient QUE quartier, type, mois, nombre de ventes et prix (liste fermée de champs)', async () => {
    const v = (await dvfMarketService.priceAt('75101', 'apartment', Date.parse('2021-06-10T00:00:00Z')))!;
    expect(Object.keys(v).sort()).toEqual([...DVF_VIEW_KEYS].sort());
    expect(v).toMatchObject({ source: 'dvf', zoneLabel: 'Paris 1er', cityId: 'paris', scope: 'city', medianEurM2: 11000, p25EurM2: 10000, p75EurM2: 12000, asOfMonth: '2021-04' });
    expect(JSON.stringify(v)).not.toMatch(/rue|avenue|boulevard|latitude|longitude/i);
  });

  it('la base refuse les données incohérentes (contraintes)', async () => {
    const ins = (z: string, m: string, med: number, p25: number, p75: number) => query(
      `INSERT INTO immo_dvf_market (zone_code, month, property_type, sales_count, median_eur_m2, p25_eur_m2, p75_eur_m2, scope, import_id)
       VALUES ($1, $2::date, 'apartment', 20, $3, $4, $5, 'zone', (SELECT MIN(id) FROM immo_dvf_imports))`, [z, m, med, p25, p75]);
    await expect(ins('75111', '2021-05-15', 5000, 4000, 6000)).rejects.toThrow();     // pas un début de mois
    await expect(ins('75111', '2021-05-01', -1, -2, 3)).rejects.toThrow();
    await expect(ins('75111', '2021-05-01', 5000, 6000, 7000)).rejects.toThrow();     // quartile 1 au-dessus de la médiane
    await expect(ins('ABC', '2021-05-01', 5000, 4000, 6000)).rejects.toThrow();       // code qui n'est pas sur 5 chiffres
  });

  it('script : simulation sans base, refus hors base « _test », puis écriture sur une base de test', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dvfm-'));
    const f = path.join(dir, 'marche.json');
    writeFileSync(f, JSON.stringify(file([...OK_ROWS, ['33000', '2021-05', 'a', 30, 4000, 3800, 4300, null]])));
    const run = (env: Record<string, string>, ...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-load-dvf.ts', '--file', f, ...a], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env } });
    const dry = run({ DATABASE_URL: '' });
    expect(dry).toContain('Simulation : rien n\'est écrit');
    expect(dry).toContain('4 lignes avec prix');
    let refused = ''; try { run({ DATABASE_URL: 'postgresql://x:y@localhost:5432/investkit' }, '--apply'); } catch (e: any) { refused = String(e.stderr); }
    expect(refused).toContain('ne finit pas par « _test »');
    const ok = run({ DATABASE_URL: process.env.TEST_DATABASE_URL! }, '--apply');
    expect(ok).toContain('Base visée : investkit_test');
    expect(ok).toContain('Importé : 4 lignes');
    expect(ok).toContain('NON activée');
    expect(run({ DATABASE_URL: process.env.TEST_DATABASE_URL! }, '--apply')).toContain('Déjà importé');
  }, 120_000);
});
