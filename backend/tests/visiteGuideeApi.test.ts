// Visite guidée : l'avancement est gardé côté serveur, par compte, avec des listes fermées (rien d'autre n'entre jamais en base).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { normalize } from '../src/services/guideService';
import { GUIDE_STEP_IDS, GUIDE_SECTIONS } from '../src/config/guideRules';

const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;

describe('lecture défensive de l\'état', () => {
  it('ignore tout ce qui sort des listes fermées', () => {
    const s = normalize({ tours: { main: { status: 'hack', step: 'x' }, bourse: { status: 'done', step: 'nope' }, inconnue: { status: 'done' } }, seen: ['bourse', '<script>', 3] });
    expect(s.tours.main).toEqual({ status: 'new', step: null });
    expect(s.tours.bourse).toEqual({ status: 'done', step: null });
    expect(Object.keys(s.tours)).not.toContain('inconnue');
    expect(s.seen).toEqual(['bourse']);
    expect(normalize(null).tours.main.status).toBe('new');
    expect(normalize('texte').seen).toEqual([]);
  });
});

describe.skipIf(!hasDb)('API /guide', () => {
  beforeAll(async () => { await setupDb(); }, 60_000);
  afterAll(teardownDb);
  const player = () => createUser({ balance: 1000, tier: 'free', activeDays: 1 });
  const put = (u: string, body: any) => request(app).put('/api/v1/guide').set('Authorization', tok(u)).send(body);

  it('exige une connexion', async () => {
    expect((await request(app).get('/api/v1/guide')).status).toBe(401);
    expect((await request(app).put('/api/v1/guide').send({ tour: 'main', status: 'done' })).status).toBe(401);
  });

  it('un nouveau joueur a toutes les visites « new », sans cache', async () => {
    const u = await player();
    const r = await request(app).get('/api/v1/guide').set('Authorization', tok(u));
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(Object.values(r.body.tours).every((t: any) => t.status === 'new' && t.step === null)).toBe(true);
    expect(r.body.seen).toEqual([]);
  });

  it('enregistre l\'étape, la pause, la fin ; une visite finie n\'a plus d\'étape ; les rubriques vues s\'additionnent', async () => {
    const u = await player();
    let r = await put(u, { tour: 'main', status: 'running', step: 'go-crypto', seen: ['dashboard', 'bourse'] });
    expect(r.body.tours.main).toEqual({ status: 'running', step: 'go-crypto' });
    r = await put(u, { tour: 'main', status: 'paused', seen: ['crypto'] });
    expect(r.body.tours.main).toEqual({ status: 'paused', step: 'go-crypto' });
    expect(r.body.seen).toEqual(['dashboard', 'bourse', 'crypto']);
    r = await put(u, { tour: 'main', status: 'done' });
    expect(r.body.tours.main).toEqual({ status: 'done', step: null });
    const g = await request(app).get('/api/v1/guide').set('Authorization', tok(u));
    expect(g.body.tours.main.status).toBe('done');
    expect(g.body.seen).toEqual(['dashboard', 'bourse', 'crypto']);
  });

  it('refuse tout ce qui n\'est pas dans les listes fermées (400) sans rien écrire', async () => {
    const u = await player();
    for (const b of [
      { tour: 'autre', status: 'done' }, { tour: 'main', status: 'cheat' }, { tour: 'main', step: 'inventée' }, { tour: 'main', step: 42 },
      { seen: ['<img src=x>'] }, { seen: 'bourse' }, { seen: new Array(13).fill('bourse') }, { status: 'done' }, {}, 'texte', [],
    ]) expect((await put(u, b as any)).status, JSON.stringify(b)).toBe(400);
    expect((await query('SELECT COUNT(*)::int AS n FROM guide_progress WHERE user_id = $1', [u])).rows[0].n).toBe(0);
  });

  it('chaque joueur ne voit et ne change que SON état (l\'identité vient du jeton)', async () => {
    const a = await player(); const b = await player();
    await put(a, { tour: 'bourse', status: 'done' });
    await request(app).put('/api/v1/guide').set('Authorization', tok(b)).send({ tour: 'main', status: 'done', userId: a });
    const ga = await request(app).get('/api/v1/guide').set('Authorization', tok(a));
    const gb = await request(app).get('/api/v1/guide').set('Authorization', tok(b));
    expect(ga.body.tours.main.status).toBe('new');
    expect(ga.body.tours.bourse.status).toBe('done');
    expect(gb.body.tours.bourse.status).toBe('new');
    expect(gb.body.tours.main.status).toBe('done');
  });

  it('remise à zéro : une visite ou tout, portée inconnue refusée', async () => {
    const u = await player();
    await put(u, { tour: 'main', status: 'done', seen: ['dashboard'] });
    await put(u, { tour: 'crypto', status: 'done' });
    let r = await request(app).post('/api/v1/guide/reset').set('Authorization', tok(u)).send({ scope: 'crypto' });
    expect(r.body.tours.crypto.status).toBe('new');
    expect(r.body.tours.main.status).toBe('done');
    expect((await request(app).post('/api/v1/guide/reset').set('Authorization', tok(u)).send({ scope: 'x' })).status).toBe(400);
    r = await request(app).post('/api/v1/guide/reset').set('Authorization', tok(u)).send({ scope: 'all' });
    expect(Object.values(r.body.tours).every((t: any) => t.status === 'new')).toBe(true);
    expect(r.body.seen).toEqual([]);
  });

  it('chaque étape et chaque rubrique des listes sont acceptées', async () => {
    const u = await player();
    for (const s of GUIDE_STEP_IDS) expect((await put(u, { tour: 'main', status: 'running', step: s })).status, s).toBe(200);
    expect((await put(u, { seen: [...GUIDE_SECTIONS] })).status).toBe(200);
  });

  it('l\'état part avec l\'export des données du compte et disparaît avec le compte', async () => {
    const u = await player();
    await put(u, { tour: 'main', status: 'paused', step: 'go-banque' });
    expect((await query('SELECT COUNT(*)::int AS n FROM guide_progress WHERE user_id = $1', [u])).rows[0].n).toBe(1);
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect((await query('SELECT COUNT(*)::int AS n FROM guide_progress WHERE user_id = $1', [u])).rows[0].n).toBe(0);
  });
});
