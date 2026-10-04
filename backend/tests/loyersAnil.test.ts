// Loyers RÉELS (carte des loyers ANIL) : lecture stricte des fichiers, aucun futur, aucune rentabilité sans loyer, tables sans adresse, scripts d'import.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { parseAnilCsv, groupOfFileName, communeCode } from '../src/data/realEstate/rents/anil';
import { parseRentFile } from '../src/data/realEstate/rents/rentFile';
import { allCodes } from '../src/data/realEstate/dvf/cities';
import { rentMarketService, communeOfZone, RENT_VIEW_KEYS } from '../src/services/rentMarketService';
import { realGrossYield } from '../src/engine/immo/rentYield';
import { rentGroupOf, rentSnapshotDate, RENT_MARKET_ENABLED, RENT_ATTRIBUTION, RENT_LICENCE, RENT_DATASET_UPDATED } from '../src/config/rentMarketRules';
import { irlService } from '../src/services/irlService';
import { parseIrlFile } from '../src/data/realEstate/irl/irlFile';
import { recalibrate, changePct } from '../src/engine/immo/irl';

const WANTED = new Set(allCodes());
const HEAD = '"id_zone";"INSEE_C";"LIBGEO";"EPCI";"DEP";"REG";"loypredm2";"lwr.IPm2";"upr.IPm2";"TYPPRED";"nbobs_com";"nbobs_mail";"R2_adj"';
const line = (c: string, rent: string, lo: string, hi: string, kind = 'commune', nobs = '120') => `"1";"${c}";"Commune";"E";"33";"75";"${rent}";"${lo}";"${hi}";"${kind}";"${nobs}";"500";"0,6"`;
const file = (...rows: string[]) => [HEAD, ...rows].join('\n') + '\n';

describe('lecture de la carte des loyers', () => {
  it('séparateur « ; », guillemets, virgule décimale ; ne garde que les communes des 12 villes ; code à 4 chiffres complété', () => {
    const r = parseAnilCsv(file(line('33063', '13,9', '10,2', '17,5'), line('6088', '15,1', '12,0', '18,2', 'maille', '8'), line('75111', '27,3', '22,0', '32,1'), line('99999', '9,0', '7,0', '11,0')), 'all', WANTED);
    expect(r.ok).toBe(true);
    expect(r.outsideScope).toBe(1);                                                    // 99999 : hors des 12 villes, ignorée sans erreur
    expect(r.rows.map((x) => [x.commune, x.rent, x.low, x.high, x.kind, x.observations])).toEqual([['33063', 13.9, 10.2, 17.5, 'commune', 120], ['06088', 15.1, 12, 18.2, 'maille', 8], ['75111', 27.3, 22, 32.1, 'commune', 120]]);
    expect(communeCode('6088')).toBe('06088');
  });
  it('séparateur « , » et point décimal, BOM et latin1 acceptés', () => {
    const csv = '﻿INSEE_C,loypredm2,lwr.IPm2,upr.IPm2,TYPPRED\n33063,13.9,10.2,17.5,commune\n';
    expect(parseAnilCsv(csv, 't3', WANTED).rows).toHaveLength(1);
    const lat = Buffer.from('INSEE_C;LIBGEO;loypredm2;lwr.IPm2;upr.IPm2;TYPPRED\n33063;Bordeaux é;13,9;10,2;17,5;commune\n', 'latin1');
    expect(parseAnilCsv(lat, 'house', WANTED).ok).toBe(true);
  });
  it('colonne indispensable absente : refusé en entier, avec les colonnes trouvées', () => {
    const r = parseAnilCsv('INSEE_C;prix\n33063;1\n', 'all', WANTED);
    expect(r.ok).toBe(false); expect(r.rows).toEqual([]);
    expect(r.errors[0]).toMatch(/loypredm2.*lwr_ipm2.*upr_ipm2.*typpred.*Colonnes trouvées : insee_c, prix/);
  });
  it('valeurs refusées, jamais corrigées : loyer hors bornes, fourchette incohérente, estimation inconnue, doublon, illisible', () => {
    const bad = (row: string) => parseAnilCsv(file(row), 'all', WANTED);
    expect(bad(line('33063', '2,0', '1,0', '3,0')).errors[0]).toMatch(/hors bornes/);
    expect(bad(line('33063', '13,9', '15,0', '17,0')).errors[0]).toMatch(/fourchette incohérente/);
    expect(bad(line('33063', '13,9', '10,0', '17,0', 'inconnu')).errors[0]).toMatch(/type d'estimation inconnu/);
    expect(bad(line('33063', 'NA', '10,0', '17,0')).errors[0]).toMatch(/illisible/);
    expect(parseAnilCsv(file(line('33063', '13,9', '10,0', '17,0'), line('33063', '14,0', '10,0', '17,0')), 'all', WANTED).errors[0]).toMatch(/en double/);
    expect(bad(line('33063', '2,0', '1,0', '3,0')).rows).toEqual([]);                  // un fichier refusé ne laisse AUCUNE ligne
  });
  it('série d\'après le nom du fichier (ambigu : null, jamais deviné)', () => {
    expect(groupOfFileName('pred-app12-mef-dhup.csv')).toBe('t12');
    expect(groupOfFileName('pred-app3-mef-dhup.csv')).toBe('t3');
    expect(groupOfFileName('pred-mai-mef-dhup.csv')).toBe('house');
    expect(groupOfFileName('pred-app-mef-dhup.csv')).toBe('all');
    expect(groupOfFileName('loyers.csv')).toBeNull();
  });
  it('type de bien du jeu → série ; le parking n\'a aucune série (valeur de jeu)', () => {
    expect([rentGroupOf('studio'), rentGroupOf('t2'), rentGroupOf('t3'), rentGroupOf('house'), rentGroupOf('apartment'), rentGroupOf('parking')]).toEqual(['t12', 't12', 't3', 'house', 'all', null]);
  });
});

describe('activation', () => {
  it('les loyers ANIL ne sont PAS activés pour les joueurs : aucun moteur ni route ne les lit', () => {
    expect(RENT_MARKET_ENABLED).toBe(false);
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const own = /rentMarketService\.ts$|rentMarketRules\.ts$|rents[\\/]rentFile\.ts$|rents[\\/]anil\.ts$/;
    const users = files.filter((f) => /rentMarketService|rentMarketRules|rents\/rentFile|rents\/anil/.test(readFileSync(f, 'utf8')) && !own.test(f));
    expect(users, 'aucun moteur ni route ne doit importer les loyers tant qu\'ils ne sont pas branchés').toEqual([]);
  });
});

describe('fichier de loyers préparé', () => {
  const NOW = new Date('2026-10-04T00:00:00Z');
  const ok = (rows: unknown[][], over: Record<string, unknown> = {}) => ({ source: 'ANIL — Carte des loyers', vintage: 2025, snapshotDate: '2025-09-30', rows, ...over });
  it('accepte un fichier cohérent ; refuse commune inconnue, série inconnue, date de photo fausse, millésime futur, doublon', () => {
    const row = ['33063', 'all', 13.9, 10.2, 17.5, 'commune', 120];
    expect(parseRentFile(ok([row]), NOW)).toMatchObject({ ok: true, vintage: 2025 });
    expect(parseRentFile(ok([['99999', 'all', 13.9, 10.2, 17.5, 'commune', 1]]), NOW).ok).toBe(false);
    expect(parseRentFile(ok([['33063', 'studio', 13.9, 10.2, 17.5, 'commune', 1]]), NOW).ok).toBe(false);
    expect(parseRentFile(ok([row], { snapshotDate: '2025-12-31' }), NOW).ok).toBe(false);          // la photo est celle du 3e trimestre : 30 septembre
    expect(parseRentFile(ok([row], { vintage: 2031, snapshotDate: '2031-09-30' }), NOW).ok).toBe(false);
    expect(parseRentFile(ok([row, row]), NOW).errors.join()).toMatch(/doublon/);
    expect(parseRentFile(ok([row], { source: 'autre' }), NOW).ok).toBe(false);
  });
  it('pas de rentabilité sans loyer, jamais de chiffre inventé', () => {
    expect(realGrossYield({ pricePerM2: 4000, rentPerM2: 14 })).toEqual({ grossYieldPct: 4.2 });      // 14 × 12 ÷ 4 000
    expect(realGrossYield({ pricePerM2: 4000, rentPerM2: null })).toBeNull();
    expect(realGrossYield({ pricePerM2: undefined, rentPerM2: 14 })).toBeNull();
    expect(realGrossYield({ pricePerM2: 0, rentPerM2: 14 })).toBeNull();
    expect(realGrossYield({ pricePerM2: 4000, rentPerM2: NaN })).toBeNull();
  });
  it('commune d\'une zone : arrondissement tel quel, codes postaux d\'une ville = sa commune ; règles du millésime', () => {
    expect(communeOfZone('75111')).toBe('75111');
    expect(communeOfZone('33100')).toBe('33063');
    expect(communeOfZone('99999')).toBeNull();
    expect(rentSnapshotDate(2025)).toBe('2025-09-30');
    expect(RENT_MARKET_ENABLED).toBe(false);                      // aucun joueur ne voit ces loyers tant que ce n'est pas décidé
    expect(RENT_ATTRIBUTION).toBe('Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin');
    expect(RENT_LICENCE).toBe('Licence Ouverte 2.0'); expect(RENT_DATASET_UPDATED).toBe('2025-12-11');
  });
});

describe.skipIf(!hasDb)('en base (source « anil »)', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_rent_market, immo_rent_imports, immo_irl, immo_irl_imports CASCADE'); }, 60_000);   // sans IRL : pas de recalage
  afterAll(teardownDb);
  const NOW = new Date('2026-10-04T00:00:00Z');
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
  const f = (vintage: number, rent: number) => ({ source: 'ANIL — Carte des loyers', vintage, snapshotDate: `${vintage}-09-30`, rows: [['33063', 'all', rent, rent - 3, rent + 3, 'commune', 100], ['33063', 't12', rent + 2, rent - 1, rent + 5, 'maille', 9]] });

  it('les tables n\'ont aucune colonne d\'adresse ni de coordonnées', async () => {
    const cols = (await query(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('immo_rent_market', 'immo_rent_imports')`)).rows.map((r) => r.column_name as string);
    expect(cols.length).toBeGreaterThan(8);
    expect(cols.filter((c) => /adresse|voie|rue|numero|lat|lon|geo|parcel|postal/i.test(c))).toEqual([]);
  });
  it('import rejouable ; un fichier refusé n\'importe rien ; source « anil »', async () => {
    const a = await rentMarketService.importRents(parseRentFile(f(2024, 12), NOW), sum(f(2024, 12)));
    expect(a).toMatchObject({ imported: true, rows: 2 });
    expect(await rentMarketService.importRents(parseRentFile(f(2024, 12), NOW), sum(f(2024, 12)))).toMatchObject({ imported: false, importId: a.importId });
    await rentMarketService.importRents(parseRentFile(f(2025, 14), NOW), sum(f(2025, 14)));
    await expect(rentMarketService.importRents(parseRentFile({ ...f(2025, 14), vintage: 1999 }, NOW), 'zzz')).rejects.toThrow(/non validé/);
    expect((await query('SELECT DISTINCT source FROM immo_rent_imports')).rows).toEqual([{ source: 'anil' }]);
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM immo_rent_market')).rows[0].n)).toBe(4);
  });
  it('loyer constant entre deux millésimes (un seul changement par an) ; le premier millésime est utilisable dès janvier de son année, avec la mention d\'approximation ; avant, aucun loyer', async () => {
    const at = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
    expect(await rentMarketService.rentAt('33063', 'all', at('2023-12-31'))).toBeNull();            // avant janvier du premier millésime : rien, donc aucune rentabilité
    const early = (await rentMarketService.rentAt('33063', 'all', at('2024-01-01')))!;              // dès janvier : le millésime 2024, marqué approximation
    expect(early).toMatchObject({ vintage: 2024, rentEurM2: 12, approximation: 'Estimation ANIL 2024, 3e trimestre (approximation avant cette date)' });
    expect((await rentMarketService.rentAt('33063', 'all', at('2024-09-29')))!.approximation).toMatch(/approximation avant cette date/);
    const ok = (await rentMarketService.rentAt('33063', 'all', at('2024-09-30')))!;                  // le 30 septembre : la mention disparaît
    expect(ok.vintage).toBe(2024); expect(ok.approximation).toBeNull();
    expect((await rentMarketService.rentAt('33063', 'all', at('2025-09-29')))!.rentEurM2).toBe(12);  // encore le millésime 2024
    expect((await rentMarketService.rentAt('33063', 'all', at('2025-09-30')))!.rentEurM2).toBe(14);
    expect((await rentMarketService.rentAt('33063', 'all', at('2026-06-01')))!.vintage).toBe(2025);
  });
  it('vue du loyer : commune lisible, fourchette, nature de l\'estimation, attribution ; sans loyer = null ; jamais d\'adresse', async () => {
    const v = (await rentMarketService.rentAt('33063', 't12', Date.parse('2026-01-01T00:00:00Z')))!;
    expect(Object.keys(v).sort()).toEqual([...RENT_VIEW_KEYS].sort());
    expect(v).toMatchObject({ source: 'anil', communeLabel: 'Bordeaux', cityId: 'bordeaux', group: 't12', estimate: 'maille', observations: 9, rentEurM2: 16, lowEurM2: 13, highEurM2: 19 });
    expect(v.attribution).toBe(RENT_ATTRIBUTION);
    expect(await rentMarketService.rentAt('33063', 'house', Date.parse('2026-01-01T00:00:00Z'))).toBeNull();     // série non importée : pas de loyer
    expect(await rentMarketService.rentAt('31555', 'all', Date.parse('2026-01-01T00:00:00Z'))).toBeNull();      // commune sans loyer
    expect(JSON.stringify(v)).not.toMatch(/rue|avenue|latitude|longitude/i);
  });
  it('script immo:load-loyers : simulation sans base ; --apply refusé hors base « _test »', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'loy-')); const fp = path.join(dir, 'l.json');
    writeFileSync(fp, JSON.stringify(f(2025, 14)));
    const run = (env: Record<string, string>, ...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-load-loyers.ts', '--file', fp, ...a], { cwd: path.join(__dirname, '..'), encoding: 'utf8', env: { ...process.env, ...env }, stdio: 'pipe' });
    expect(run({ DATABASE_URL: '' })).toContain('Simulation : rien n\'est écrit');
    let refused = ''; try { run({ DATABASE_URL: 'postgresql://x:y@localhost:5432/investkit' }, '--apply'); } catch (e: any) { refused = String(e.stderr); }
    expect(refused).toMatch(/_test/);
  }, 90_000);
});

describe('script immo:import-loyers (fichiers fabriqués)', () => {
  it('lit un dossier de séries, rapporte la couverture, écrit le JSON ; --check n\'écrit rien ; série non fournie signalée ; fichier refusé = rien d\'écrit', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'loy-')); const cwd = path.join(__dirname, '..');
    writeFileSync(path.join(dir, 'pred-app-mef-dhup.csv'), file(line('33063', '13,9', '10,2', '17,5'), line('75111', '27,3', '22,0', '32,1')));
    writeFileSync(path.join(dir, 'pred-mai-mef-dhup.csv'), file(line('33063', '12,0', '9,0', '15,0', 'maille', '7')));
    const out = path.join(dir, 'loyers.json');
    const run = (...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-import-loyers.ts', '--vintage', '2025', '--dir', dir, ...a], { cwd, encoding: 'utf8', stdio: 'pipe' });
    const check = run('--check', '--out', out);
    expect(check).toContain('Séries non fournies : appartements T1-T2, appartements T3 et plus');
    expect(check).toMatch(/Bordeaux\s+all 1\/1 · house 1\/1 \(1 maille\)/);
    expect(check).toMatch(/Paris\s+all 1\/20/);
    expect(check).toContain('Sans loyer pour au moins une série');
    expect(existsSync(out)).toBe(false);
    expect(run('--out', out)).toContain('Écrit :');
    const j = JSON.parse(readFileSync(out, 'utf8'));
    expect(j).toMatchObject({ vintage: 2025, snapshotDate: '2025-09-30' });
    expect(j.rows).toHaveLength(3);
    expect(parseRentFile(j).ok).toBe(true);
    writeFileSync(path.join(dir, 'pred-app3-mef-dhup.csv'), file(line('33063', '2,0', '1,0', '3,0')));          // loyer hors bornes
    const out2 = path.join(dir, 'refuse.json');
    let failed = false; try { run('--out', out2); } catch { failed = true; }
    expect(failed).toBe(true); expect(existsSync(out2)).toBe(false);
  }, 90_000);
});

// Loyer d'avant le 3e trimestre du premier millésime recalé sur l'IRL RÉEL (valeurs fabriquées de test). Même fichier que les loyers : ils partagent la base de test (aucune course entre fichiers).
describe.skipIf(!hasDb)('recalage du loyer sur l\'IRL réel', () => {
  beforeAll(async () => { await setupDb(); await query('TRUNCATE immo_rent_market, immo_rent_imports, immo_irl, immo_irl_imports CASCADE'); }, 60_000);
  afterAll(teardownDb);
  const NOW = new Date('2026-10-04T00:00:00Z');
  const sum = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
  const at = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const rentFile = { source: 'ANIL — Carte des loyers', vintage: 2024, snapshotDate: '2024-09-30', rows: [['33063', 'all', 12, 9, 15, 'commune', 100]] };
  const irlRows = Array.from({ length: 12 }, (_, i) => [2022 + Math.floor(i / 4), (i % 4) + 1, Math.round((130 + 0.8 * i) * 100) / 100]);   // 2022-T1 (130) à 2024-T4 (138,8)
  const irlFile = { source: 'Insee : IRL', rows: irlRows };

  it('sans IRL importé : mention d\'approximation seule, loyer tel quel ; la table de l\'IRL n\'a aucune donnée personnelle', async () => {
    await rentMarketService.importRents(parseRentFile(rentFile, NOW), sum(rentFile));
    const v = (await rentMarketService.rentAt('33063', 'all', at('2024-03-01')))!;
    expect(v).toMatchObject({ rentEurM2: 12, irlAdjustmentPct: null, approximation: 'Estimation ANIL 2024, 3e trimestre (approximation avant cette date)' });
    const cols = (await query(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('immo_irl', 'immo_irl_imports')`)).rows.map((r) => r.column_name as string);
    expect(cols.filter((c) => /user|mail|adresse|nom|ip/i.test(c))).toEqual([]);
  });
  it('import de l\'IRL rejouable ; un fichier refusé n\'importe rien', async () => {
    const parsed = parseIrlFile(irlFile);
    const a = await irlService.importIrl(parsed, sum(irlFile));
    expect(a).toMatchObject({ imported: true, rows: 12 });
    expect(await irlService.importIrl(parsed, sum(irlFile))).toMatchObject({ imported: false, importId: a.importId });
    await expect(irlService.importIrl(parseIrlFile({ source: 'x', rows: [] }), 'zzz')).rejects.toThrow(/non validé/);
    expect((await irlService.irlAt('2024-03-01'))).toMatchObject({ year: 2023, quarter: 4, value: 135.6 });   // T4 2023 publié le 16 janvier 2024
    expect(await irlService.irlAt('2022-03-01')).toBeNull();                                                  // rien avant la première publication de la série fabriquée
  });
  it('avant le 3e trimestre du premier millésime : loyer et fourchette recalés sur l\'évolution réelle de l\'IRL entre la date de jeu et ce trimestre, la mention le dit', async () => {
    const v = (await rentMarketService.rentAt('33063', 'all', at('2024-03-01')))!;
    const irlDate = 135.6; const irlRef = 138.0;                                  // T4 2023 (publié) et T3 2024 : valeurs fabriquées de la série ci-dessus
    expect(v.rentEurM2).toBe(recalibrate(12, irlDate, irlRef));
    expect(v.lowEurM2).toBe(recalibrate(9, irlDate, irlRef));
    expect(v.highEurM2).toBe(recalibrate(15, irlDate, irlRef));
    expect(v.irlAdjustmentPct).toBe(changePct(irlDate, irlRef));
    expect(v.rentEurM2).toBeLessThan(12);                                         // l'IRL du jeu est plus bas que celui du 3e trimestre : le loyer d'avant est plus bas
    expect(v.approximation).toContain('Estimation ANIL 2024, 3e trimestre (approximation avant cette date)');
    expect(v.approximation).toContain('Loyer recalé sur l\'évolution réelle de l\'IRL entre la date de jeu et le 3e trimestre 2024');
    expect(v.approximation).toContain('−1,74 %');
  });
  it('à partir du 30 septembre du millésime : loyer du millésime tel quel, plus de mention ; entre deux millésimes : loyer constant', async () => {
    const after = (await rentMarketService.rentAt('33063', 'all', at('2024-09-30')))!;
    expect(after).toMatchObject({ rentEurM2: 12, approximation: null, irlAdjustmentPct: null });
    expect((await rentMarketService.rentAt('33063', 'all', at('2025-06-01')))!.rentEurM2).toBe(12);   // un seul changement par an : pas d'interpolation, pas de dérive avec l'IRL
    expect(await rentMarketService.rentAt('33063', 'all', at('2023-12-31'))).toBeNull();               // avant janvier du premier millésime : rien
  });
});
