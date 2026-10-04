// Téléchargement des années 2014-2020 : formats anciens (séparateur, encodage, virgule décimale, codes sur 3 chiffres), filtrage en continu, stratégie d'adresses et rapport.
// Tout est FABRIQUÉ : fichiers de test dans chaque format, et un petit serveur local (aucun accès à Internet).
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { gzipSync } from 'zlib';
import { Readable } from 'stream';
import { execFileSync } from 'child_process';
import { CsvStream, detectEncoding, detectSep } from '../src/data/realEstate/dvf/csv';
import { makeStandardizer, FormatError, canonHeader, code5 } from '../src/data/realEstate/dvf/format';
import { readDvfText, cleanRows } from '../src/data/realEstate/dvf/clean';
import { filterToFiles, openDvfStream } from '../src/data/realEstate/dvf/filter';
import { downloadYear, realFetcher, renderReport } from '../src/data/realEstate/dvf/download';
import { DvfSource } from '../src/data/realEstate/dvf/sources';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { yearCityStats } from '../src/data/realEstate/dvf/aggregate';

const ETALAB_HEAD = 'id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere,adresse_numero,adresse_nom_voie,code_postal,code_commune,nom_commune,code_departement,id_parcelle,nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales,longitude,latitude';
const etalab = (rows: { id: string; date: string; nature?: string; value: string; code: string; type?: string; surface?: string }[]) =>
  [ETALAB_HEAD, ...rows.map((r) => [r.id, r.date, '000001', r.nature ?? 'Vente', r.value, '1', 'Rue X', '33000', r.code, 'Ville', r.code.slice(0, 2), `${r.code}000AB0001`, '1', '2', r.type ?? 'Appartement', r.surface ?? '50', '2', '-0.57', '44.84'].join(','))].join('\n') + '\n';

const BRUT_HEAD = ['Identifiant de document', 'No disposition', 'Date mutation', 'Nature mutation', 'Valeur fonciere', 'Code postal', 'Commune', 'Code departement', 'Code commune', 'Prefixe de section', 'Section', 'No plan', 'Nombre de lots', 'Code type local', 'Type local', 'Surface reelle bati', 'Nombre pieces principales'].join('|');
const brut = (rows: { date: string; nature?: string; value: string; dep: string; commune: string; type?: string; surface?: string; plan?: string }[]) =>
  [BRUT_HEAD, ...rows.map((r) => ['', '1', r.date, r.nature ?? 'Vente', r.value, '75011', 'PARIS 11', r.dep, r.commune, '', 'AB', r.plan ?? '1', '1', '2', r.type ?? 'Appartement', r.surface ?? '50', '2'].join('|'))].join('\n') + '\n';

describe('formats des fichiers', () => {
  it('séparateur et encodage détectés', () => {
    expect(detectSep('a,b,c')).toBe(',');
    expect(detectSep('a;b;c')).toBe(';');
    expect(detectSep('"a;x",b,c')).toBe(',');
    expect(detectSep('a|b|c|d')).toBe('|');
    expect(detectEncoding(Buffer.from('Dépendance', 'utf8'))).toBe('utf8');
    expect(detectEncoding(Buffer.from('Dépendance', 'latin1'))).toBe('latin1');
    expect(detectEncoding(Buffer.from('abé', 'utf8').subarray(0, 3))).toBe('utf8');      // caractère coupé en fin d'échantillon
  });
  it('format Etalab (virgule, dates ISO, code sur 5 caractères)', () => {
    const { rows, format } = readDvfText(etalab([{ id: 'A', date: '2019-05-04', value: '250000.5', code: '33063' }]));
    expect(format).toBe('etalab');
    expect(rows[0]).toMatchObject({ id_mutation: 'A', date_mutation: '2019-05-04', code_commune: '33063', valeur_fonciere: '250000.5', type_local: 'Appartement' });
    expect(cleanRows(rows).sales[0].price).toBe(250001);
  });
  it('format brut de la DGFiP : « | », JJ/MM/AAAA, virgule décimale, code commune sur 3 chiffres (arrondissements de Paris compris), en latin1', () => {
    const text = brut([
      { date: '14/03/2016', value: '312000,00', dep: '75', commune: '111', surface: '48,5' },
      { date: '02/11/2016', value: '98000,00', dep: '75', commune: '101', type: 'Dépendance', surface: '' },
      { date: '09/01/2016', value: '189000,50', dep: '33', commune: '63', type: 'Maison', surface: '92' },
    ]);
    const buf = Buffer.from(text, 'latin1');
    expect(detectEncoding(buf)).toBe('latin1');
    const dec = buf.toString('latin1');
    const { rows, format } = readDvfText(dec);
    expect(format).toBe('brut');
    expect(rows[0]).toMatchObject({ date_mutation: '2016-03-14', code_commune: '75111', valeur_fonciere: '312000,00', type_local: 'Appartement', surface_reelle_bati: '48,5' });
    expect(rows[1].type_local).toBe('Dépendance');
    expect(rows[2].code_commune).toBe('33063');
    const r = cleanRows(rows);
    expect(r.sales.map((s) => [s.code, s.price, s.surface])).toEqual([['75111', 312000, 48.5], ['33063', 189001, 92]]);
  });
  it('code commune au zéro perdu (6088 → 06088) ; variantes de noms de colonnes', () => {
    expect(code5('6088', undefined, 'etalab')).toBe('06088');
    expect(code5('75111', '75', 'etalab')).toBe('75111');
    expect(code5('5', '6', 'brut')).toBe('06005');
    expect(canonHeader('Nombre pièces principales')).toBe('nombre_pieces_principales');
    expect(canonHeader(' Valeur fonciere ')).toBe('valeur_fonciere');
  });
  it('séparateur « ; » : même résultat', () => {
    const text = etalab([{ id: 'A', date: '2018-02-01', value: '200000', code: '31555' }]).replace(/,/g, ';');
    expect(readDvfText(text).rows[0].code_commune).toBe('31555');
  });
  it('colonne indispensable absente : erreur claire qui liste les colonnes trouvées, rien n\'est deviné', () => {
    const bad = 'a,b,c\n1,2,3\n';
    expect(() => readDvfText(bad)).toThrow(FormatError);
    try { readDvfText(bad); } catch (e: any) { expect(e.message).toContain('valeur_fonciere'); expect(e.columns).toEqual(['a', 'b', 'c']); }
    expect(() => makeStandardizer(['date_mutation', 'nature_mutation'])).toThrow(/Colonnes indispensables absentes/);
  });
  it('lecture par petits morceaux (7 octets) identique à la lecture complète, guillemets et CRLF coupés compris', () => {
    const text = 'a,b,c\r\n1,"x, ""y"" é",3\r\n"4\r\nz",5,6\r\n7,8,9';
    const whole = new CsvStream(); const a = [...whole.push(text), ...whole.end()];
    const buf = Buffer.from(text, 'utf8');
    const { StringDecoder } = require('string_decoder'); const dec = new StringDecoder('utf8');
    const parts = new CsvStream(); const b: string[][] = [];
    for (let i = 0; i < buf.length; i += 7) b.push(...parts.push(dec.write(buf.subarray(i, i + 7))));
    b.push(...parts.push(dec.end()), ...parts.end());
    expect(b).toEqual(a);
    expect(a[1]).toEqual(['1', 'x, "y" é', '3']);
    expect(a[2]).toEqual(['4\nz'.replace('\n', '\r\n'), '5', '6']);
  });
});

const tmp = () => mkdtempSync(path.join(tmpdir(), 'dvfh-'));
const WANTED = new Set(['75111', '33063', '69381']);

describe('filtrage en continu', () => {
  it('garde seulement les codes voulus, les ventes, les types utiles ; fichier par code, en-tête même sans vente ; fichier gzip ; jamais d\'écrasement', async () => {
    const dir = tmp();
    const csv = etalab([
      { id: 'A', date: '2017-01-10', value: '300000', code: '75111' },
      { id: 'B', date: '2017-02-10', value: '300000', code: '75111', nature: 'Echange' },
      { id: 'C', date: '2017-03-10', value: '300000', code: '75111', nature: 'Vente en l\'état futur d\'achèvement' },
      { id: 'D', date: '2017-04-10', value: '300000', code: '99999' },
      { id: 'E', date: '2017-05-10', value: '150000', code: '33063', type: 'Maison', surface: '90' },
      { id: 'F', date: '2017-06-10', value: '20000', code: '33063', type: 'Dépendance', surface: '' },
      { id: 'G', date: '2017-07-10', value: '20000', code: '33063', type: '' },
    ]);
    writeFileSync(path.join(dir, '33063.csv'), 'DÉJÀ LÀ');                          // un fichier existant ne doit pas être touché
    const res = await filterToFiles(await openDvfStream(Readable.from([gzipSync(Buffer.from(csv))])), { dir, wanted: new Set(['75111', '69381']) });
    expect(res).toMatchObject({ rowsRead: 7, rowsKept: 1, format: 'etalab' });
    expect(readFileSync(path.join(dir, '75111.csv'), 'utf8').trim().split('\n')).toHaveLength(2);
    expect(readFileSync(path.join(dir, '69381.csv'), 'utf8').trim().split('\n')).toHaveLength(1);   // en-tête seul : « zéro vente », pas « fichier manquant »
    expect(readFileSync(path.join(dir, '33063.csv'), 'utf8')).toBe('DÉJÀ LÀ');
    const kept = readDvfText(readFileSync(path.join(dir, '75111.csv'), 'utf8'));
    expect(cleanRows(kept.rows).sales).toHaveLength(1);
    expect(readdirSync(dir).filter((f) => f.endsWith('.part'))).toEqual([]);
    const res2 = await filterToFiles(await openDvfStream(Readable.from([Buffer.from(csv)])), { dir, wanted: new Set(['33063']) });
    expect(res2.written).toEqual([]);                                                  // déjà là : pas réécrit
    expect(readFileSync(path.join(dir, '33063.csv'), 'utf8')).toBe('DÉJÀ LÀ');
  });
  it('fichier brut latin1 en « | » filtré en continu, découpé en morceaux de 10 octets', async () => {
    const dir = tmp();
    const text = brut([{ date: '14/03/2016', value: '312000,00', dep: '75', commune: '111' }, { date: '15/03/2016', value: '999,00', dep: '13', commune: '55' }, { date: '16/03/2016', value: '70000,00', dep: '75', commune: '111', type: 'Dépendance', surface: '' }]);
    const buf = Buffer.from(text, 'latin1');
    const chunks: Buffer[] = []; for (let i = 0; i < buf.length; i += 10) chunks.push(buf.subarray(i, i + 10));
    const res = await filterToFiles(await openDvfStream(Readable.from(chunks)), { dir, wanted: new Set(['75111']) });
    expect(res).toMatchObject({ format: 'brut', rowsRead: 3, rowsKept: 2 });
    const lines = readFileSync(path.join(dir, '75111.csv'), 'utf8').trim().split('\n');
    expect(lines[1]).toContain('2016-03-14');
    expect(lines[2]).toContain('Dépendance');
  });
  it('format inconnu : erreur, aucun fichier .part laissé derrière, aucun fichier final créé', async () => {
    const dir = tmp();
    await expect(filterToFiles(await openDvfStream(Readable.from([Buffer.from('x,y\n1,2\n')])), { dir, wanted: WANTED })).rejects.toThrow(FormatError);
    expect(readdirSync(dir)).toEqual([]);
    await expect(filterToFiles(await openDvfStream(Readable.from([])), { dir, wanted: WANTED })).rejects.toThrow(/vide/);
    expect(readdirSync(dir)).toEqual([]);
  });
});

// Petit serveur de test : chemin → réponse (fichier, ou 404).
let server: http.Server; let base = ''; const hits: string[] = []; const routes = new Map<string, Buffer>();
beforeAll(async () => {
  server = http.createServer((req, res) => { hits.push(req.url!); const b = routes.get(req.url!); if (!b) { res.statusCode = 404; res.end('nope'); return; } res.end(b); });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); });

const src = (id: string, scope: 'commune' | 'departement' | 'national', pathOf: (p: { year: number; dep: string; code: string }) => string): DvfSource => ({ id, scope, label: id, confirmed: false, url: (p) => `${base}${pathOf(p)}` });
const SOURCES = [
  src('commune', 'commune', ({ year, dep, code }) => `/c/${year}/${dep}/${code}.csv`),
  src('dep', 'departement', ({ year, dep }) => `/d/${year}/${dep}.csv.gz`),
  src('nat', 'national', ({ year }) => `/n/${year}.csv.gz`),
];
const CODES = [{ code: '75111', dep: '75' }, { code: '33063', dep: '33' }];
const reset = () => { hits.length = 0; routes.clear(); };
const nat = (year: number) => gzipSync(Buffer.from(etalab([
  { id: 'A', date: `${year}-03-01`, value: '300000', code: '75111' }, { id: 'B', date: `${year}-04-01`, value: '200000', code: '33063' }, { id: 'C', date: `${year}-05-01`, value: '200000', code: '13201' }])));

describe('téléchargement d\'une année', () => {
  it('par commune introuvable (sonde unique), départemental introuvable, puis fichier national : filtré, et chaque adresse essayée est dans le rapport avec son code HTTP', async () => {
    reset(); routes.set('/n/2019.csv.gz', nat(2019));
    const dir = path.join(tmp(), '2019');
    const rep = await downloadYear({ year: 2019, dir, codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep).toMatchObject({ state: 'telecharge', method: 'nat', written: 2, rowsRead: 3, rowsKept: 2 });
    expect(hits.filter((h) => h.startsWith('/c/'))).toHaveLength(1);                   // une seule sonde, pas 54 essais
    expect(rep.attempts.filter((a) => !a.ok).map((a) => a.outcome)).toEqual(['HTTP 404', 'HTTP 404']);   // commune, puis le premier département
    expect(rep.attempts[0].url).toBe(`${base}/c/2019/75/75111.csv`);
    expect(existsSync(path.join(dir, '75111.csv')) && existsSync(path.join(dir, '33063.csv'))).toBe(true);
    expect(readdirSync(dir).some((f) => f.includes('full') || f.endsWith('.gz'))).toBe(false);   // le gros fichier n'est jamais enregistré
  });
  it('départemental disponible : utilisé, le fichier national n\'est même pas demandé', async () => {
    reset();
    routes.set('/d/2018/75.csv.gz', gzipSync(Buffer.from(etalab([{ id: 'A', date: '2018-03-01', value: '300000', code: '75111' }]))));
    routes.set('/d/2018/33.csv.gz', gzipSync(Buffer.from(etalab([{ id: 'B', date: '2018-03-01', value: '210000', code: '33063' }]))));
    routes.set('/n/2018.csv.gz', nat(2018));
    const rep = await downloadYear({ year: 2018, dir: path.join(tmp(), '2018'), codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep).toMatchObject({ state: 'telecharge', method: 'dep', written: 2 });
    expect(hits.some((h) => h.startsWith('/n/'))).toBe(false);
  });
  it('années récentes : un fichier par commune', async () => {
    reset();
    for (const c of CODES) routes.set(`/c/2021/${c.dep}/${c.code}.csv`, Buffer.from(etalab([{ id: 'X', date: '2021-01-05', value: '250000', code: c.code }])));
    const rep = await downloadYear({ year: 2021, dir: path.join(tmp(), '2021'), codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep).toMatchObject({ state: 'telecharge', method: 'commune', written: 2 });
    expect(hits.some((h) => h.startsWith('/d/') || h.startsWith('/n/'))).toBe(false);
  });
  it('année déjà complète : aucune requête ; fichier existant jamais réécrit ni retéléchargé', async () => {
    reset();
    const dir = path.join(tmp(), '2022'); mkdirSync(dir, { recursive: true });
    for (const c of CODES) writeFileSync(path.join(dir, `${c.code}.csv`), 'GARDÉ');
    const rep = await downloadYear({ year: 2022, dir, codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep.state).toBe('deja-present');
    expect(hits).toEqual([]);
    // Un seul fichier manque : seul celui-là est écrit, l'autre reste intact.
    const dir2 = path.join(tmp(), '2020'); mkdirSync(dir2, { recursive: true });
    writeFileSync(path.join(dir2, '75111.csv'), 'GARDÉ');
    routes.set('/n/2020.csv.gz', nat(2020));
    const rep2 = await downloadYear({ year: 2020, dir: dir2, codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep2).toMatchObject({ state: 'telecharge', written: 1, alreadyThere: 1 });
    expect(readFileSync(path.join(dir2, '75111.csv'), 'utf8')).toBe('GARDÉ');
    expect(readFileSync(path.join(dir2, '33063.csv'), 'utf8')).toContain('33063');
  });
  it('rien ne répond : pas d\'exception, l\'année est en échec, chaque adresse essayée et son code sont dans le rapport, et la liste « à vérifier » apparaît', async () => {
    reset();
    const rep = await downloadYear({ year: 2015, dir: path.join(tmp(), '2015'), codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep).toMatchObject({ state: 'echec', method: null, written: 0 });
    expect(rep.missingCodes).toEqual(['75111', '33063']);
    const text = renderReport([rep, { ...rep, year: 2021, state: 'deja-present', attempts: [], missingCodes: [] }], '2026-10-04 14:00');
    expect(text).toContain('2015 : ÉCHEC');
    expect(text).toContain(`${base}/n/2015.csv.gz`);
    expect(text).toContain('HTTP 404');
    expect(text).toContain('ADRESSES À VÉRIFIER');
    expect(text).toContain('--url');
    expect(text).toContain('--file');
    expect(text).toContain('2021 : déjà présent');
  });
  it('erreur réseau : le message et la cause sont écrits, la suite continue', async () => {
    reset();
    const closed = http.createServer(); await new Promise<void>((r) => closed.listen(0, '127.0.0.1', () => r()));
    const port = (closed.address() as AddressInfo).port; await new Promise<void>((r) => closed.close(() => r()));
    const dead: DvfSource = { id: 'mort', scope: 'national', label: 'x', confirmed: false, url: () => `http://127.0.0.1:${port}/n.csv.gz` };
    routes.set('/n/2016.csv.gz', nat(2016));
    const rep = await downloadYear({ year: 2016, dir: path.join(tmp(), '2016'), codes: CODES, sources: [dead, ...SOURCES], fetcher: realFetcher });
    const net = rep.attempts.find((a) => a.outcome.startsWith('erreur réseau'))!;
    expect(net.outcome).toMatch(/ECONNREFUSED/);
    expect(rep).toMatchObject({ state: 'telecharge', method: 'nat' });
  });
  it('fichier au format inconnu : l\'adresse est signalée avec les colonnes trouvées, rien n\'est écrit', async () => {
    reset(); routes.set('/n/2014.csv.gz', gzipSync(Buffer.from('foo,bar\n1,2\n')));
    const dir = path.join(tmp(), '2014');
    const rep = await downloadYear({ year: 2014, dir, codes: CODES, sources: SOURCES, fetcher: realFetcher });
    expect(rep.state).toBe('echec');
    expect(rep.attempts.find((a) => a.url.endsWith('/n/2014.csv.gz'))!.outcome).toContain('format non reconnu');
    expect(rep.notes.join(' ')).toContain('foo, bar');
    expect(existsSync(path.join(dir, '75111.csv'))).toBe(false);
  });
  it('les adresses par défaut : la seule confirmée est « par commune » ; les autres sont marquées à vérifier', async () => {
    const { DEFAULT_SOURCES, customSource } = await import('../src/data/realEstate/dvf/sources');
    expect(DEFAULT_SOURCES.filter((s) => s.confirmed).map((s) => s.id)).toEqual(['geo-commune']);
    expect(DEFAULT_SOURCES.filter((s) => !s.confirmed).every((s) => s.label.includes('[à vérifier]'))).toBe(true);
    expect(DEFAULT_SOURCES[0].url({ year: 2021, dep: '75', code: '75111' })).toBe('https://files.data.gouv.fr/geo-dvf/latest/csv/2021/communes/75/75111.csv');
    expect(customSource('https://x.test/{year}/{dep}.csv.gz').scope).toBe('departement');
    expect(customSource('https://x.test/{year}/full.csv.gz').url({ year: 2017, dep: '', code: '' })).toBe('https://x.test/2017/full.csv.gz');
  });
});

describe('qualité par année et par ville', () => {
  it('compte les ventes, les quartiers sous le seuil, marque l\'année maigre', () => {
    const mk = (code: string, date: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${code}${date}${i}`, date, code, type: 'appartement' as const, surface: 50, price: 250000, pricePerM2: 5000, rooms: 2, lon: null, lat: null }));
    const sales = [...mk('33063', '2019-03-01', 40), ...mk('75101', '2019-05-01', 12), ...mk('75102', '2019-05-01', 3), ...mk('75103', '2020-05-01', 50)];
    const st = yearCityStats(sales, [2019, 2020]);
    const bx19 = st.find((s) => s.cityId === 'bordeaux' && s.year === 2019)!;
    expect(bx19).toMatchObject({ sales: 40, zones: 1, zonesBelowMin: 0, thin: false });
    const pa19 = st.find((s) => s.cityId === 'paris' && s.year === 2019)!;
    expect(pa19).toMatchObject({ sales: 15, zones: 20, zonesBelowMin: 19, thin: true });
    expect(st.find((s) => s.cityId === 'bordeaux' && s.year === 2020)).toMatchObject({ sales: 0, zonesBelowMin: 1, thin: true });
    expect(DVF_CITIES).toHaveLength(12);
  });
});

describe('import de bout en bout avec un fichier brut latin1', () => {
  it('l\'import lit un fichier brut (« | », latin1, virgule décimale) et affiche le tableau par année et par ville', () => {
    const dir = tmp(); mkdirSync(path.join(dir, '2016'), { recursive: true }); mkdirSync(path.join(dir, '2021'), { recursive: true });
    const rows = Array.from({ length: 30 }, (_, i) => ({ date: `${String(10 + (i % 9)).padStart(2, '0')}/0${1 + (i % 6)}/2016`, value: `${200000 + i * 1000},00`, dep: '33', commune: '63', plan: String(i + 1) }));
    writeFileSync(path.join(dir, '2016', '33063.csv'), Buffer.from(brut(rows), 'latin1'));
    const rows21 = Array.from({ length: 30 }, (_, i) => ({ id: `Z${i}`, date: `2021-0${1 + (i % 6)}-1${i % 9}`, value: String(260000 + i * 1000), code: '33063' }));
    writeFileSync(path.join(dir, '2021', '33063.csv'), etalab(rows21));
    const out = execFileSync('npx', ['ts-node', 'scripts/immo-import-dvf.ts', '--dir', dir, '--check'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    expect(out).toContain('60 ventes retenues');
    expect(out).toMatch(/Bordeaux\s+30\s+30\s*$/m);
    expect(out).toContain('Ventes retenues par année et par ville');
    expect(out).toContain('Années SANS aucune vente lue : 2014, 2015, 2017, 2018, 2019, 2020');
  }, 90_000);
});

describe('encodage adaptatif', () => {
  it('un fichier latin1 dont les premiers morceaux sont en ASCII pur est quand même lu correctement ; l\'UTF-8 coupé en deux octets aussi', async () => {
    const { AdaptiveDecoder } = await import('../src/data/realEstate/dvf/csv');
    const d = new AdaptiveDecoder();
    const lat = Buffer.from('abcdefgh Dépendance ÉÈ', 'latin1');
    expect(d.write(lat.subarray(0, 8)) + d.write(lat.subarray(8)) + d.end()).toBe('abcdefgh Dépendance ÉÈ');
    expect(d.encoding).toBe('latin1');
    const u = new AdaptiveDecoder(); const bytes = Buffer.from('Dépôt € ok', 'utf8');
    let out = ''; for (let i = 0; i < bytes.length; i += 2) out += u.write(bytes.subarray(i, i + 2));
    expect(out + u.end()).toBe('Dépôt € ok');
    expect(u.encoding).toBe('utf8');
  });
});

describe('adresse imposée', () => {
  it('une adresse donnée avec --url est essayée AVANT les adresses par défaut', async () => {
    reset(); routes.set('/mien/2017.csv.gz', nat(2017));
    const { customSource } = await import('../src/data/realEstate/dvf/sources');
    const rep = await downloadYear({ year: 2017, dir: path.join(tmp(), '2017'), codes: CODES, sources: [customSource(`${base}/mien/{year}.csv.gz`), ...SOURCES], fetcher: realFetcher });
    expect(rep).toMatchObject({ state: 'telecharge', method: 'url-imposee' });
    expect(hits).toEqual(['/mien/2017.csv.gz']);
  });
});
