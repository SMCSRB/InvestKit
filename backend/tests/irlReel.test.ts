// IRL réel (Insee) : lecture stricte du fichier, publication (aucun futur), recalage d'un loyer, garde « le moteur ne le lit pas », scripts. Les valeurs ci-dessous sont des VALEURS FABRIQUÉES de test.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { parseInseeIrl } from '../src/data/realEstate/irl/insee';
import { parseIrlFile } from '../src/data/realEstate/irl/irlFile';
import { publishedOn, latestPublished, valueOf, annualChangePct, recalibrate, changePct, IrlPoint } from '../src/engine/immo/irl';
import { IRL_ENABLED, IRL_PUBLICATION_DAY } from '../src/config/irlRules';
import { rentApproximationText, rentRecalibrationText } from '../src/config/rentMarketRules';

// Série fabriquée : 2021-T1 à 2023-T4, +0,8 par trimestre à partir de 130.
const fab = (): IrlPoint[] => Array.from({ length: 12 }, (_, i) => ({ year: 2021 + Math.floor(i / 4), quarter: ((i % 4) + 1) as 1 | 2 | 3 | 4, value: Math.round((130 + 0.8 * i) * 100) / 100 }));
const csv = (points: IrlPoint[], sep = ';', decimal = ','): string => [
  `Libellé${sep}Indice de référence des loyers (série fabriquée)`, `idBank${sep}000000000`, `Dernière mise à jour${sep}01/01/2024`, '',
  `Période${sep}Valeur${sep}Codes`,
  ...[...points].reverse().map((p) => `${p.year}-T${p.quarter}${sep}${String(p.value).replace('.', decimal)}${sep}A`),    // l'Insee liste le plus récent d'abord
].join('\n') + '\n';

describe('lecture du fichier de l\'Insee', () => {
  it('lignes d\'en-tête ignorées, période « AAAA-Tn », virgule décimale, ordre quelconque ; le résultat est trié', () => {
    const r = parseInseeIrl(csv(fab()));
    expect(r.ok).toBe(true);
    expect(r.points).toHaveLength(12);
    expect(r.points[0]).toEqual({ year: 2021, quarter: 1, value: 130 });
    expect(r.points[11]).toEqual({ year: 2023, quarter: 4, value: 138.8 });
  });
  it('séparateur « , » et point décimal ; formats de période « 2022 T3 », « T3 2022 »', () => {
    expect(parseInseeIrl(csv(fab(), ',', '.')).ok).toBe(true);
    const alt = fab().map((p, i) => `${i % 2 ? `${p.year} T${p.quarter}` : `T${p.quarter} ${p.year}`};${String(p.value).replace('.', ',')}`).join('\n');
    expect(parseInseeIrl(alt).points).toHaveLength(12);
  });
  it('refusé en entier, jamais corrigé : trimestre manquant, saut suspect, valeur hors bornes, valeur illisible, deux valeurs pour un trimestre, trop peu de trimestres', () => {
    const gap = fab().filter((p) => !(p.year === 2022 && p.quarter === 2));
    expect(parseInseeIrl(csv(gap)).errors.join()).toMatch(/trimestre manquant entre 2022-T1 et 2022-T3/);
    const jump = fab().map((p) => (p.year === 2023 ? { ...p, value: p.value * 1.2 } : p));
    expect(parseInseeIrl(csv(jump)).errors.join()).toMatch(/valeur suspecte/);
    expect(parseInseeIrl(csv(fab().map((p, i) => (i === 3 ? { ...p, value: 9 } : p)))).errors.join()).toMatch(/hors bornes/);
    expect(parseInseeIrl(csv(fab()).replace('130,8;A', 'abc;A')).errors.join()).toMatch(/sans valeur lisible/);
    expect(parseInseeIrl(csv(fab()) + '2021-T1;131;A\n').errors.join()).toMatch(/deux valeurs différentes/);
    const few = parseInseeIrl(csv(fab().slice(0, 5)));
    expect(few.ok).toBe(false); expect(few.errors.join()).toMatch(/format du fichier/);
    expect(parseInseeIrl(csv(gap)).points).toEqual([]);                            // un fichier refusé ne laisse aucune ligne
  });
});

describe('publication et recalage', () => {
  it('une valeur n\'est utilisable qu\'à partir du jour de publication du mois suivant son trimestre (aucun futur)', () => {
    expect(IRL_PUBLICATION_DAY).toBe(16);
    expect(['2022-T1', '2022-T2', '2022-T3', '2022-T4'].map((q, i) => publishedOn({ year: 2022, quarter: i + 1 }))).toEqual(['2022-04-16', '2022-07-16', '2022-10-16', '2023-01-16']);
    const s = fab();
    expect(latestPublished(s, '2022-10-15')).toMatchObject({ year: 2022, quarter: 2 });          // T3 pas encore publié
    expect(latestPublished(s, '2022-10-16')).toMatchObject({ year: 2022, quarter: 3 });
    expect(latestPublished(s, '2021-04-15')).toBeNull();                                           // rien avant la première publication de la série
    expect(latestPublished(s, '2030-01-01')).toMatchObject({ year: 2023, quarter: 4 });
  });
  it('variation annuelle et recalage : un rapport de deux valeurs publiées', () => {
    const s = fab();
    expect(valueOf(s, 2022, 3)).toBe(134.8);
    expect(annualChangePct(s, 2022, 3)).toBe(Math.round((134.8 / 131.6 - 1) * 10000) / 100);     // même trimestre un an plus tôt
    expect(annualChangePct(s, 2021, 3)).toBeNull();                                                // pas de valeur un an plus tôt : pas de variation
    expect(recalibrate(12, 133.2, 134.8)).toBe(Math.round(12 * (133.2 / 134.8) * 100) / 100);
    expect(changePct(133.2, 134.8)).toBe(Math.round((133.2 / 134.8 - 1) * 10000) / 100);
    expect(changePct(134.8, 134.8)).toBe(0);
  });
  it('mention : « Estimation ANIL 2022, 3e trimestre (approximation avant cette date) » ; avec l\'IRL, la mention indique le recalage et son sens', () => {
    expect(rentApproximationText(2022)).toBe('Estimation ANIL 2022, 3e trimestre (approximation avant cette date)');
    expect(rentRecalibrationText(2022, -1.8)).toBe('Estimation ANIL 2022, 3e trimestre (approximation avant cette date). Loyer recalé sur l\'évolution réelle de l\'IRL entre la date de jeu et le 3e trimestre 2022 (−1,80 %).');
    expect(rentRecalibrationText(2022, 0)).toContain('(0,00 %)');
    expect(rentRecalibrationText(2022, 2.5)).toContain('(+2,50 %)');
  });
});

describe('fichier préparé et activation', () => {
  it('lecture stricte du JSON : source Insee, 3 colonnes, pas de doublon ni de trimestre manquant', () => {
    const rows = fab().map((p) => [p.year, p.quarter, p.value]);
    const ok = { source: 'Insee : IRL', rows };
    expect(parseIrlFile(ok)).toMatchObject({ ok: true });
    expect(parseIrlFile({ ...ok, source: 'autre' }).ok).toBe(false);
    expect(parseIrlFile({ ...ok, rows: [...rows, rows[0]] }).ok).toBe(false);
    expect(parseIrlFile({ ...ok, rows: rows.filter((_, i) => i !== 5) }).ok).toBe(false);
    expect(parseIrlFile({ ...ok, rows: rows.map((r, i) => (i === 0 ? [r[0], 7, r[2]] : r)) }).ok).toBe(false);
  });
  it('l\'IRL réel n\'est PAS lu par le moteur actuel : seuls le service de loyers et lui-même l\'importent', () => {
    expect(IRL_ENABLED).toBe(false);
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const own = /irlService\.ts$|irlRules\.ts$|engine[\\/]immo[\\/]irl\.ts$|irl[\\/]insee\.ts$|irl[\\/]irlFile\.ts$|rentMarketService\.ts$|rentMarketRules\.ts$/;
    const users = files.filter((f) => /irlService|irlRules|immo\/irl'|irl\/insee|irl\/irlFile/.test(readFileSync(f, 'utf8')) && !own.test(f));
    expect(users, 'aucun moteur ni route ne doit lire l\'IRL réel tant que ce n\'est pas décidé').toEqual([]);
  });
});

describe('scripts immo:import-irl (fichier fabriqué)', () => {
  it('rapport lisible ; --check n\'écrit rien ; écrit le JSON ; fichier refusé = rien d\'écrit ; immo:load-irl simule sans base et refuse hors base _test', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'irl-')); const cwd = path.join(__dirname, '..');
    const f = path.join(dir, 'irl.csv'); writeFileSync(f, csv(fab()));
    const out = path.join(dir, 'irl.json');
    const run = (...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-import-irl.ts', '--file', f, ...a], { cwd, encoding: 'utf8', stdio: 'pipe' });
    const check = run('--check', '--out', out);
    expect(check).toContain('12 trimestres retenus');
    expect(check).toContain('de 2021-T1 (130) à 2023-T4 (138.8)');
    expect(check).toContain('3e trimestres récents');
    expect(existsSync(out)).toBe(false);
    expect(run('--out', out)).toContain('Écrit :');
    const j = JSON.parse(readFileSync(out, 'utf8'));
    expect(j.rows).toHaveLength(12);
    expect(parseIrlFile(j).ok).toBe(true);
    const load = (env: Record<string, string>, ...a: string[]) => execFileSync('npx', ['ts-node', 'scripts/immo-load-irl.ts', '--file', out, ...a], { cwd, encoding: 'utf8', env: { ...process.env, ...env }, stdio: 'pipe' });
    expect(load({ DATABASE_URL: '' })).toContain('Simulation : rien n\'est écrit');
    let refused = ''; try { load({ DATABASE_URL: 'postgresql://x:y@localhost:5432/investkit' }, '--apply'); } catch (e: any) { refused = String(e.stderr); }
    expect(refused).toMatch(/_test/);
    writeFileSync(f, csv(fab().filter((p) => !(p.year === 2022 && p.quarter === 2))));
    const out2 = path.join(dir, 'refuse.json'); let failed = false; try { run('--out', out2); } catch { failed = true; }
    expect(failed).toBe(true); expect(existsSync(out2)).toBe(false);
  }, 120_000);
});
