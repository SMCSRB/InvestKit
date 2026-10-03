import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { hasDb, setupDb, teardownDb, createUser, setFlatFx } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { addStep } from '../src/services/crypto/clockService';

const D = 86_400_000;
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;

describe('horloge : pas de temps', () => {
  it('jour, semaine, mois civil', () => {
    const t = Date.parse('2020-01-31T00:00:00Z');
    expect(addStep(t, 'day')).toBe(t + D);
    expect(addStep(t, 'week')).toBe(t + 7 * D);
    expect(new Date(addStep(t, 'month')).toISOString()).toBe('2020-02-29T00:00:00.000Z');   // fin de mois : ramené au dernier jour
    expect(new Date(addStep(Date.parse('2020-12-15T00:00:00Z'), 'month')).toISOString()).toBe('2021-01-15T00:00:00.000Z');
  });
});

describe.skipIf(!hasDb)('API Crypto : horloge serveur, pas de fuite du futur (HTTP)', () => {
  let u: string, other: string;

  beforeAll(async () => {
    await setupDb();
    await importDemo(); await setFlatFx(1);
    u = await createUser({ balance: 1000, tier: 'pro' });
    other = await createUser({ balance: 1000, tier: 'pro' });
  }, 120_000);
  afterAll(teardownDb);

  it('authentification obligatoire', async () => {
    for (const p of ['/state', '/assets', '/candles?symbol=DEMO1', '/assets/DEMO1', '/compare?symbols=DEMO1,DEMO2']) {
      expect((await request(app).get(`/api/v1/crypto${p}`)).status, p).toBe(401);
    }
    expect((await request(app).post('/api/v1/crypto/account').send({})).status).toBe(401);
    expect((await request(app).post('/api/v1/crypto/time/advance').send({ step: 'day' })).status).toBe(401);
  });

  it('sans compte : état proposant les dates de départ, le reste refusé (404)', async () => {
    const s = await request(app).get('/api/v1/crypto/state').set('Authorization', tok(u));
    expect(s.status).toBe(200);
    expect(s.body.hasAccount).toBe(false);
    expect(s.body.starts.length).toBeGreaterThan(0);
    expect(s.body.disclaimer).toContain('pas un conseil');
    expect((await request(app).get('/api/v1/crypto/assets').set('Authorization', tok(u))).status).toBe(404);
    expect((await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'day' })).status).toBe(404);
  });

  it('création : date de départ validée, unique, jamais libre', async () => {
    const bad = await request(app).post('/api/v1/crypto/account').set('Authorization', tok(u)).send({ start: '2030-01-01' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/v1/crypto/account').set('Authorization', tok(u)).send({ start: 'y2020' });
    expect(ok.status).toBe(200);
    expect(new Date(ok.body.account.simulatedAt).toISOString ? ok.body.account.simulatedAt : 0).toBe(Date.parse('2020-01-01T00:00:00Z'));
    // rejouer ne change pas la date
    await request(app).post('/api/v1/crypto/account').set('Authorization', tok(u)).send({ start: 'y2017' });
    const s = await request(app).get('/api/v1/crypto/state').set('Authorization', tok(u));
    expect(s.body.account.simulatedAt).toBe(Date.parse('2020-01-01T00:00:00Z'));
  });

  it('les actifs et bougies s\'arrêtent à la date simulée ; les paramètres de date du client sont ignorés', async () => {
    const now = Date.parse('2020-01-01T00:00:00Z');
    const a = await request(app).get('/api/v1/crypto/assets?asOf=2024-01-01&now=2024-01-01&date=2024-01-01').set('Authorization', tok(u));
    expect(a.status).toBe(200);
    expect(a.body.simulatedAt).toBe(now);
    const syms = a.body.assets.map((x: any) => x.symbol);
    expect(syms).toContain('DEMO1');
    expect(syms).not.toContain('DEMOM');   // lancé en juin 2020
    for (const tf of ['1d', '1h', '1w', '1M', '4h']) {
      const c = await request(app).get(`/api/v1/crypto/candles?symbol=DEMO1&tf=${tf}&limit=1000&asOf=2024-01-01&to=2024-01-01&before=${Date.parse('2024-01-01')}`).set('Authorization', tok(u));
      expect(c.status, tf).toBe(200);
      expect(c.body.candles.length, tf).toBeGreaterThan(0);
      for (const k of c.body.candles) expect(k.ts, tf).toBeLessThan(now);
    }
    expect((await request(app).get('/api/v1/crypto/assets/DEMOM').set('Authorization', tok(u))).status).toBe(404);
  });

  it('validation stricte : symbole, unité de temps, curseur, comparaison', async () => {
    const g = (p: string) => request(app).get(`/api/v1/crypto${p}`).set('Authorization', tok(u));
    expect((await g('/candles?symbol=DEMO1;DROP&tf=1d')).status).toBe(400);
    expect((await g('/candles?symbol=DEMO1&tf=2d')).status).toBe(400);
    expect((await g('/candles?symbol=DEMO1&tf=1d&before=abc')).status).toBe(400);
    expect((await g('/candles?symbol=DEMO1&tf=1d&limit=-3')).status).toBe(400);
    expect((await g('/compare?symbols=DEMO1')).status).toBe(400);
    expect((await g('/compare?symbols=DEMO1,DEMO1')).status).toBe(400);
    const cmp = await g('/compare?symbols=DEMO1,DEMO2&tf=1d');
    expect(cmp.status).toBe(200);
    const big = await g('/candles?symbol=DEMO1&tf=1d&limit=999999');
    expect(big.status).toBe(200);
    expect(big.body.candles.length).toBeLessThanOrEqual(1000);
  });

  it('avance du temps : serveur décide, jamais en arrière, le futur se dévoile au fur et à mesure', async () => {
    const before = await request(app).get('/api/v1/crypto/assets').set('Authorization', tok(u));
    expect(before.body.assets.map((x: any) => x.symbol)).not.toContain('DEMOM');
    const bad = await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'year', date: '2024-01-01' });
    expect(bad.status).toBe(400);
    const r1 = await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'week', simulatedAt: 1e13 });
    expect(r1.status).toBe(200);
    expect(r1.body.simulatedAt).toBe(Date.parse('2020-01-08T00:00:00Z'));
    const r2 = await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'month' });
    expect(r2.body.simulatedAt).toBe(Date.parse('2020-02-08T00:00:00Z'));
    // Jusqu'au 8 mai : DEMOM (lancé le 1er juin 2020) reste invisible ; au 8 juin il apparaît, et seulement alors.
    for (let i = 0; i < 3; i++) await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'month' });
    const mid = await request(app).get('/api/v1/crypto/assets').set('Authorization', tok(u));
    expect(mid.body.simulatedAt).toBe(Date.parse('2020-05-08T00:00:00Z'));
    expect(mid.body.assets.map((x: any) => x.symbol)).not.toContain('DEMOM');
    await request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step: 'month' });
    const later = await request(app).get('/api/v1/crypto/assets').set('Authorization', tok(u));
    expect(later.body.assets.map((x: any) => x.symbol)).toContain('DEMOM');
  });

  it('simultanéité : deux clics en parallèle n\'avancent pas deux fois d\'une étape de trop', async () => {
    const p = await createUser({ balance: 10, tier: 'pro' });
    await request(app).post('/api/v1/crypto/account').set('Authorization', tok(p)).send({ start: 'y2020' });
    const res = await Promise.all([1, 2, 3, 4].map(() => request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(p)).send({ step: 'day' })));
    const okCount = res.filter((r) => r.status === 200).length;
    const row = (await query('SELECT simulated_at FROM crypto_accounts WHERE user_id = $1', [p])).rows[0];
    expect(new Date(row.simulated_at).getTime()).toBe(Date.parse('2020-01-01T00:00:00Z') + okCount * D);
    expect(okCount).toBeGreaterThanOrEqual(1);
  });

  it('isolation : l\'horloge d\'un joueur n\'affecte pas celle d\'un autre', async () => {
    const s = await request(app).get('/api/v1/crypto/state').set('Authorization', tok(other));
    expect(s.body.hasAccount).toBe(false);
  });
});
