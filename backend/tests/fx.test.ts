import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { hasDb, setupDb, teardownDb } from './helpers';
import { query } from '../src/utils/db';
import { pickRate, parseEcbCsv, toCoins, fromCoins, isDay, dayOf } from '../src/engine/fx';
import { fxService, FxUnavailableError } from '../src/services/fxService';
import { FX_MAX_STALE_DAYS, FX_DEMO_USD_PER_EUR } from '../src/config/economy';

const R = [{ day: '2020-03-05', perEur: 1.1 }, { day: '2020-03-06', perEur: 1.12 }, { day: '2020-03-09', perEur: 1.14 }];   // vendredi 6, lundi 9

describe('taux de change : moteur pur', () => {
  it('jour publié : son propre taux ; week-end : dernier jour ouvré ; jamais un taux du futur', () => {
    expect(pickRate(R, '2020-03-06', 7)).toEqual({ perEur: 1.12, day: '2020-03-06', staleDays: 0 });
    expect(pickRate(R, '2020-03-07', 7)).toEqual({ perEur: 1.12, day: '2020-03-06', staleDays: 1 });   // samedi
    expect(pickRate(R, '2020-03-08', 7)).toEqual({ perEur: 1.12, day: '2020-03-06', staleDays: 2 });   // dimanche
    expect(pickRate(R, '2020-03-09', 7)).toMatchObject({ perEur: 1.14, staleDays: 0 });
    expect(pickRate(R, '2020-03-04', 7)).toBeNull();                                                   // avant le premier taux : aucun taux (pas celui du lendemain)
  });

  it('un taux trop ancien est indisponible (7 jours) ; entrées invalides ignorées', () => {
    expect(pickRate(R, '2020-03-16', 7)).toMatchObject({ staleDays: 7 });
    expect(pickRate(R, '2020-03-17', 7)).toBeNull();
    expect(pickRate([{ day: '2020-03-06', perEur: 0 }, { day: '2020-03-07', perEur: NaN }, { day: 'n\'importe quoi', perEur: 1.1 }], '2020-03-08', 7)).toBeNull();
    expect(pickRate(R, '2020-02-30', 7)).toBeNull();                                                   // date impossible
    expect(isDay('2020-02-30')).toBe(false);
    expect(dayOf(Date.parse('2020-03-06T23:59:59Z'))).toBe('2020-03-06');
  });

  it('conversion : dollars ↔ InvestCoins, sans perte aller-retour', () => {
    expect(toCoins(1100, 1.1)).toBeCloseTo(1000, 9);
    expect(fromCoins(1000, 1.1)).toBeCloseTo(1100, 9);
    for (const v of [0.01, 1, 123.45, 99999.99]) expect(fromCoins(toCoins(v, 1.0831), 1.0831)).toBeCloseTo(v, 9);
  });

  it('lecture du format de l\'API de données de la BCE : jours vides ou invalides ignorés et comptés', () => {
    const csv = [
      'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2014-01-02,1.3631,A',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2014-01-03,1.3640,A',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2014-01-06,,A',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2014-01-07,.,A',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2014-01-08,-1,A',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,pas-une-date,1.3,A',
      'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2014-01-03,1.3650,A',
    ].join('\n');
    const p = parseEcbCsv(csv);
    expect(p.rates).toEqual([{ day: '2014-01-02', perEur: 1.3631 }, { day: '2014-01-03', perEur: 1.365 }]);   // doublon : dernière ligne
    expect(p.rejected).toBe(4);
  });

  it('lecture du fichier historique « eurofxref-hist.csv » (une colonne par devise, N/A)', () => {
    const csv = 'Date,USD,JPY,GBP\r\n2014-01-03,1.3640,140.6,0.8280\r\n2014-01-02,1.3631,142.0,N/A\r\n2014-01-01,N/A,N/A,N/A\r\n';
    expect(parseEcbCsv(csv, 'USD')).toEqual({ rates: [{ day: '2014-01-02', perEur: 1.3631 }, { day: '2014-01-03', perEur: 1.364 }], rejected: 1 });
    expect(parseEcbCsv(csv, 'GBP').rates).toEqual([{ day: '2014-01-03', perEur: 0.828 }]);
  });

  it('format inconnu : erreur claire, rien n\'est deviné', () => {
    expect(() => parseEcbCsv('a,b\n1,2')).toThrow(/Format de fichier BCE non reconnu/);
    expect(parseEcbCsv('')).toEqual({ rates: [], rejected: 0 });
  });

  it('valeurs de jeu : repli de 7 jours, taux de démonstration fictif', () => {
    expect(FX_MAX_STALE_DAYS).toBe(7);
    expect(FX_DEMO_USD_PER_EUR).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasDb)('taux de change : service (base réelle)', () => {
  beforeAll(async () => { await setupDb(); await query('DELETE FROM fx_rates'); });
  afterAll(teardownDb);

  it('import idempotent ; un taux réel remplace le taux de démonstration du même jour, jamais l\'inverse', async () => {
    await fxService.seedDemoRates('2020-03-02', '2020-03-13');
    expect((await query(`SELECT COUNT(*)::int AS n FROM fx_rates WHERE demo`)).rows[0].n).toBe(10);          // 10 jours ouvrés
    await fxService.importRates([{ day: '2020-03-05', perEur: 1.1234 }, { day: '2020-03-06', perEur: 1.1345 }]);
    await fxService.importRates([{ day: '2020-03-05', perEur: 1.1234 }, { day: '2020-03-06', perEur: 1.1345 }]);   // rejoué : rien de plus
    expect((await query(`SELECT COUNT(*)::int AS n FROM fx_rates`)).rows[0].n).toBe(10);
    const r = (await query(`SELECT per_eur::float8 AS p, demo, source FROM fx_rates WHERE day = '2020-03-05'`)).rows[0];
    expect(r).toMatchObject({ p: 1.1234, demo: false });
    expect(r.source).toContain('BCE');
    await fxService.seedDemoRates('2020-03-02', '2020-03-13');                                              // la démo ne réécrit jamais du réel
    expect((await query(`SELECT per_eur::float8 AS p, demo FROM fx_rates WHERE day = '2020-03-05'`)).rows[0]).toMatchObject({ p: 1.1234, demo: false });
  });

  it('taux d\'un instant de jeu : dernier taux publié AVANT son jour ; week-end ; indisponible hors couverture', async () => {
    await query('DELETE FROM fx_rates');
    await fxService.importRates([{ day: '2020-03-05', perEur: 1.1 }, { day: '2020-03-06', perEur: 1.12 }, { day: '2020-03-09', perEur: 1.14 }]);
    const at = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
    expect(await fxService.rateAt(at('2020-03-07'))).toMatchObject({ perEur: 1.12, day: '2020-03-06', demo: false });   // samedi 00:00 : taux du vendredi
    expect(await fxService.rateAt(at('2020-03-06'))).toMatchObject({ perEur: 1.1, day: '2020-03-05' });                // pas le taux publié ce jour-là
    expect(await fxService.rateAt(at('2020-03-10'))).toMatchObject({ perEur: 1.14, day: '2020-03-09' });
    expect(await fxService.rateAt(at('2020-03-05'))).toBeNull();                                                       // rien avant le 5
    expect(await fxService.rateAt(at('2020-03-20'))).toBeNull();                                                       // trop ancien
    await expect(fxService.requireRateAt(at('2020-03-20'))).rejects.toBeInstanceOf(FxUnavailableError);
    await expect(fxService.requireRateAt(at('2020-03-20'))).rejects.toMatchObject({ code: 'FX_UNAVAILABLE' });
  });

  it('série de bougies : un taux par jour, repli week-end, null hors couverture', async () => {
    const rater = await fxService.dayRater(Date.parse('2020-03-05T00:00:00Z'), Date.parse('2020-03-12T00:00:00Z'));
    expect(rater(Date.parse('2020-03-06T13:00:00Z'))).toBe(1.12);
    expect(rater(Date.parse('2020-03-08T03:00:00Z'))).toBe(1.12);
    expect(rater(Date.parse('2020-03-09T23:00:00Z'))).toBe(1.14);
    expect(rater(Date.parse('2020-03-04T00:00:00Z'))).toBeNull();
  });

  it('état : couverture et part de taux de démonstration', async () => {
    expect(await fxService.status()).toMatchObject({ available: true, firstDay: '2020-03-05', lastDay: '2020-03-09', real: 3, demo: 0 });
    await query('DELETE FROM fx_rates');
    expect(await fxService.status()).toMatchObject({ available: false, lastDay: null, real: 0, demo: 0 });
  });
});

describe('fx:import : vérification d\'un fichier sans rien écrire', () => {
  it('--check lit un fichier de la BCE et résume ; format invalide = erreur', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fx-'));
    const ok = join(dir, 'ok.csv'), ko = join(dir, 'ko.csv');
    writeFileSync(ok, 'Date,USD\n2014-01-02,1.3631\n2014-01-03,N/A\n2014-01-06,1.3600\n');
    writeFileSync(ko, 'x,y\n1,2\n');
    const run = (f: string) => spawnSync('npx', ['ts-node', 'scripts/fx-import.ts', '--check', '--file', f], { cwd: join(__dirname, '..'), encoding: 'utf8', timeout: 90000 });
    const a = run(ok);
    expect(a.status, a.stdout + a.stderr).toBe(0);
    expect(a.stdout).toContain('2 taux valides du 2014-01-02 au 2014-01-06 (1 ligne(s) ignorée(s)');
    expect(a.stdout).toContain('rien n\'est écrit');
    const b = run(ko);
    expect(b.status).toBe(1);
    expect(b.stderr).toContain('Format de fichier BCE non reconnu');
  }, 120000);
});
