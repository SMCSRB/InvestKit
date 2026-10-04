// Horloge de jeu unique (6c) : calculs de dates purs + coordinateur (Bourse, Crypto, Immobilier suivent UNE date décidée par le serveur).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser, setFlatFx, calmUserId } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { importDemo } from '../src/services/crypto/importer';
import { clockService as cryptoClock } from '../src/services/crypto/clockService';
import { simClockService, endDayMs, importantReason, ClockError } from '../src/services/simClockService';
import { realEstateService as re } from '../src/services/realEstateService';
import { addMonthsMs, addStepMs, chunkEnds, parseDay, dayString, lastPlayableDay, monthIndex, DAY_MS } from '../src/engine/clock';

const d = (s: string) => Date.parse(`${s}T00:00:00Z`);
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;

describe('calculs de dates (purs)', () => {
  it('addMonths garde le quantième ou se ramène à la fin du mois', () => {
    expect(dayString(addMonthsMs(d('2017-01-31'), 1))).toBe('2017-02-28');
    expect(dayString(addMonthsMs(d('2020-01-31'), 1))).toBe('2020-02-29');
    expect(dayString(addMonthsMs(d('2017-11-15'), 3))).toBe('2018-02-15');
    expect(dayString(addMonthsMs(d('2020-02-29'), 12))).toBe('2021-02-28');
  });
  it('les cinq pas', () => {
    const t = d('2017-01-01');
    expect(dayString(addStepMs(t, 'day'))).toBe('2017-01-02');
    expect(dayString(addStepMs(t, 'week'))).toBe('2017-01-08');
    expect(dayString(addStepMs(t, 'month'))).toBe('2017-02-01');
    expect(dayString(addStepMs(t, 'quarter'))).toBe('2017-04-01');
    expect(dayString(addStepMs(t, 'year'))).toBe('2018-01-01');
  });
  it('parseDay est strict', () => {
    expect(parseDay('2017-01-01')).toBe(d('2017-01-01'));
    for (const bad of ['2017-02-30', '2017-1-1', '', null, undefined, 20170101, '2017-01-01T00:00:00Z']) expect(parseDay(bad)).toBeNull();
  });
  it('sous-pas : un par 1er du mois franchi, puis la cible', () => {
    expect(chunkEnds(d('2017-01-01'), d('2018-01-01')).map(dayString)).toEqual(['2017-02-01', '2017-03-01', '2017-04-01', '2017-05-01', '2017-06-01', '2017-07-01', '2017-08-01', '2017-09-01', '2017-10-01', '2017-11-01', '2017-12-01', '2018-01-01']);
    expect(chunkEnds(d('2017-01-15'), d('2017-01-22')).map(dayString)).toEqual(['2017-01-22']);
    expect(chunkEnds(d('2017-01-20'), d('2017-02-10')).map(dayString)).toEqual(['2017-02-01', '2017-02-10']);
    expect(chunkEnds(d('2017-01-01'), d('2017-01-01'))).toEqual([]);
    expect(chunkEnds(d('2017-02-01'), d('2017-01-01'))).toEqual([]);
  });
  it('dernier jour jouable = le plus petit plafond ; numéro de mois absolu', () => {
    expect(lastPlayableDay([d('2025-06-01'), d('2026-12-31'), null])).toBe(d('2025-06-01'));
    expect(lastPlayableDay([null, undefined])).toBeNull();
    expect(monthIndex(d('2018-02-10'))).toBe(2018 * 12 + 2);
  });
  it('arrêt automatique : seulement pour un vrai événement', () => {
    const base = { crypto: { events: [], marketEvents: [{ x: 1 }], loanEvents: [] }, bourse: [], immo: [] };
    expect(importantReason(base as any)).toBeNull();                                  // événement de marché informatif : pas d'arrêt
    expect(importantReason({ ...base, crypto: { ...base.crypto, events: [{}] } } as any)).toMatch(/ordre/i);
    expect(importantReason({ ...base, crypto: { ...base.crypto, loanEvents: [{}] } } as any)).toMatch(/prêt Crypto/i);
    expect(importantReason({ ...base, bourse: [{ year: 2018, domain: 'stocks', bankEvents: [{}] }] } as any)).toMatch(/portefeuille/i);
    expect(importantReason({ ...base, immo: [{ year: 2017, month: 3, warnings: [{}], propertyEvents: [] }] } as any)).toMatch(/immobiliers/i);
    expect(importantReason({ ...base, immo: [{ year: 2017, month: 3, warnings: [], propertyEvents: ['tenant_departed'] }] } as any)).toMatch(/immobiliers/i);
    expect(importantReason({ ...base, immo: [{ year: 2017, month: 3, warnings: [], propertyEvents: ['rent_indexed'] }] } as any)).toBeNull();
  });
});

describe.skipIf(!hasDb)('horloge unique : coordinateur', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); await setFlatFx(1.1); }, 120_000);
  afterAll(teardownDb);

  const player = async () => createUser({ id: calmUserId(d('2020-01-01'), 800), balance: 50_000, tier: 'pro', activeDays: 5 });
  const adv = (u: string, body: any) => request(app).post('/api/v1/clock/advance').set('Authorization', tok(u)).send(body);
  const date = async (u: string) => (await simClockService.get(u))!.currentDay;
  const cryptoDay = async (u: string) => dayString((await cryptoClock.get(u))!.simulatedAt);

  it('un nouveau joueur reçoit une horloge au départ par défaut (2020-01-01) dès sa première action', async () => {
    const u = await player();
    expect(await simClockService.get(u)).toBeNull();
    const r = await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    expect(r.status).toBe(200);
    expect(await simClockService.get(u)).toEqual({ startDay: '2020-01-01', currentDay: '2020-01-01' });
    const rows = (await query('SELECT domain, simulated_year FROM virtual_portfolios WHERE user_id = $1', [u])).rows;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(Number(row.simulated_year)).toBe(2020);            // la Bourse démarre à l'année de la partie, plus en 2010
  });

  it('les trois domaines suivent la même date', async () => {
    const u = await player();
    await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    await cryptoClock.createAt(u, d('2020-01-01'));
    await re.startGame(u, 'employee');
    const g0 = (await query('SELECT simulated_year, simulated_month FROM re_games WHERE user_id = $1', [u])).rows[0];
    expect([Number(g0.simulated_year), Number(g0.simulated_month)]).toEqual([2020, 1]);

    const r = await adv(u, { step: 'month' });
    expect(r.status).toBe(200);
    expect(r.body.currentDay).toBe('2020-02-01');
    expect(await cryptoDay(u)).toBe('2020-02-01');
    const g1 = (await query('SELECT simulated_year, simulated_month FROM re_games WHERE user_id = $1', [u])).rows[0];
    expect([Number(g1.simulated_year), Number(g1.simulated_month)]).toEqual([2020, 2]);

    const y = await adv(u, { step: 'year' });
    expect(y.body.currentDay).toBe('2021-02-01');
    expect(await cryptoDay(u)).toBe('2021-02-01');
    const g2 = (await query('SELECT simulated_year, simulated_month FROM re_games WHERE user_id = $1', [u])).rows[0];
    expect([Number(g2.simulated_year), Number(g2.simulated_month)]).toEqual([2021, 2]);
    const b = (await query('SELECT simulated_year FROM virtual_portfolios WHERE user_id = $1', [u])).rows;
    for (const row of b) expect(Number(row.simulated_year)).toBe(2021);
  });

  it('le navigateur ne choisit jamais la date : un champ « date » est ignoré, un pas inconnu est refusé', async () => {
    const u = await player();
    const r = await adv(u, { step: 'day', date: '1999-01-01', currentDay: '2030-01-01', to: '2030-01-01' });
    expect(r.status).toBe(200);
    expect(r.body.currentDay).toBe('2020-01-02');
    for (const bad of [{}, { step: 'decade' }, { step: 5 }, { months: 0 }, { months: 13 }, { months: 1.5 }, { step: 'day', from: 'hier' }]) expect((await adv(u, bad)).status).toBe(400);
    expect(await date(u)).toBe('2020-01-02');
  });

  it('authentification obligatoire ; la date « from » doit être la bonne (deux onglets)', async () => {
    expect((await request(app).post('/api/v1/clock/advance').send({ step: 'day' })).status).toBe(401);
    expect((await request(app).get('/api/v1/clock')).status).toBe(401);
    const u = await player();
    const ok = await adv(u, { step: 'day', from: '2020-01-01' });
    expect(ok.status).toBe(200);
    const stale = await adv(u, { step: 'day', from: '2020-01-01' });
    expect(stale.status).toBe(409); expect(stale.body.code).toBe('STALE'); expect(stale.body.currentDay).toBe('2020-01-02');
  });

  it('fin des données : refus clair, et « next_event » s\'arrête à la fin', async () => {
    const u = await player();
    await simClockService.ensure(u);
    const end = (await endDayMs())!;
    await query(`UPDATE sim_clocks SET current_day = $2::date WHERE user_id = $1`, [u, dayString(end - 3 * DAY_MS)]);
    const over = await adv(u, { step: 'week' });
    expect(over.status).toBe(400); expect(over.body.code).toBe('END');
    const ne = await adv(u, { step: 'next_event' });
    expect(ne.status).toBe(200); expect(ne.body.currentDay).toBe(dayString(end));
    expect((await adv(u, { step: 'day' })).body.code).toBe('END');
  });

  it('une partie d\'avant l\'horloge unique est refusée avec un message clair (migration)', async () => {
    const u = await player();
    await cryptoClock.createAt(u, d('2020-01-01'));
    await query('DELETE FROM sim_clocks WHERE user_id = $1', [u]);
    const r = await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    expect(r.status).toBe(409); expect(r.body.code).toBe('MIGRATION_REQUIRED');
    expect(await simClockService.get(u)).toBeNull();
  });

  it('un domaine en retard (panne en cours d\'avance) est rattrapé à la prochaine action, sans double traitement', async () => {
    const u = await player();
    await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    await cryptoClock.createAt(u, d('2020-01-01'));
    await adv(u, { step: 'month' });
    await query(`UPDATE sim_clocks SET current_day = '2020-03-01' WHERE user_id = $1`, [u]);        // l'horloge a avancé, la Crypto est restée au 1er février
    const r = await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    expect(r.status).toBe(200);
    expect(await cryptoDay(u)).toBe('2020-03-01');
  });

  it('deux demandes en même temps : jamais deux avances de suite à partir de la même date', async () => {
    const u = await player();
    await cryptoClock.createAt(u, d('2020-01-01'));
    await simClockService.ensure(u);
    const [a, b] = await Promise.all([adv(u, { step: 'month', from: '2020-01-01' }), adv(u, { step: 'month', from: '2020-01-01' })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await date(u)).toBe('2020-02-01');
    expect(await cryptoDay(u)).toBe('2020-02-01');
  });

  it('les anciens boutons d\'avance passent par l\'horloge unique (même réponse qu\'avant pour les pages)', async () => {
    const u = await player();
    await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    await cryptoClock.createAt(u, d('2020-01-01'));
    await re.startGame(u, 'employee');
    const c = await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'week' });
    expect(c.status).toBe(200); expect(c.body.simulatedAt).toBe(d('2020-01-08')); expect(Array.isArray(c.body.events)).toBe(true);
    expect(await date(u)).toBe('2020-01-08');
    const m = await request(app).post('/api/v1/realestate/time/advance').set('Authorization', tok(u)).send({ months: 1 });
    expect(m.status).toBe(200); expect(m.body.year).toBe(2020); expect(m.body.month).toBe(2); expect(Array.isArray(m.body.settled)).toBe(true);
    expect(await date(u)).toBe('2020-02-08');
    const y = await request(app).post('/api/v1/trading/advance-year').set('Authorization', tok(u)).send({ domain: 'stocks' });
    expect(y.status).toBe(200); expect(y.body.simulatedYear).toBe(2021);
    expect(await date(u)).toBe('2021-02-08');
    expect(await cryptoDay(u)).toBe('2021-02-08');
    expect((await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'year' })).status).toBe(400);   // l'ancien bouton Crypto n'accepte que jour, semaine, mois
  });

  it('le choix de la date de départ se fait une seule fois pour tout le jeu (via la Crypto)', async () => {
    const u = await player();
    const s1 = await request(app).get('/api/v1/crypto/state').set('Authorization', tok(u));
    expect(s1.body.starts.length).toBeGreaterThan(1);
    const c = await request(app).post('/api/v1/crypto/account').set('Authorization', tok(u)).send({ start: 'y2021' });
    expect(c.status).toBe(200);
    expect(await simClockService.get(u)).toEqual({ startDay: '2021-01-01', currentDay: '2021-01-01' });
    const p = await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    expect(p.status).toBe(200);
    for (const row of (await query('SELECT simulated_year FROM virtual_portfolios WHERE user_id = $1', [u])).rows) expect(Number(row.simulated_year)).toBe(2021);
    // un joueur dont la partie existe déjà ne peut plus choisir une autre date
    const v = await createUser({ id: calmUserId(d('2020-01-01'), 800), balance: 1000 });
    await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(v));
    const s2 = await request(app).get('/api/v1/crypto/state').set('Authorization', tok(v));
    expect(s2.body.startLocked).toBe(true); expect(s2.body.starts).toHaveLength(1);
    await request(app).post('/api/v1/crypto/account').set('Authorization', tok(v)).send({ start: 'y2022' });
    expect(await simClockService.get(v)).toEqual({ startDay: '2020-01-01', currentDay: '2020-01-01' });
  });

  it('départ inconnu refusé ; suppression du compte efface l\'horloge', async () => {
    const u = await player();
    await expect(simClockService.ensure(u, 'y1999')).rejects.toBeInstanceOf(ClockError);
    await simClockService.ensure(u);
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM sim_clocks WHERE user_id = $1', [u])).rows[0].n)).toBe(0);
  });
});
