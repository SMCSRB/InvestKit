import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

describe.skipIf(!hasDb)('retours utilisateurs et annonces (HTTP, base réelle)', () => {
  let adminId: string, userId: string, adminTok: string, userTok: string;
  const as = (t: string, method: 'get' | 'post' | 'put' | 'delete', path: string, body?: object) => {
    const r = request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${t}`);
    return body ? r.send(body) : r;
  };

  beforeAll(async () => {
    await setupDb();
    adminId = await createUser({ balance: 0 }); userId = await createUser({ balance: 0 });
    await query(`UPDATE users SET role = 'admin', enable_2fa = TRUE WHERE id = $1`, [adminId]);
    adminTok = generateToken(adminId, `${adminId}@test.local`); userTok = generateToken(userId, `${userId}@test.local`);
  });
  afterAll(teardownDb);

  it('retour : authentification requise, validation stricte, texte stocké brut', async () => {
    expect((await request(app).post('/api/v1/feedback').send({ kind: 'bug', message: 'hello world' })).status).toBe(401);
    for (const body of [{}, { kind: 'autre', message: 'hello' }, { kind: 'bug' }, { kind: 'bug', message: 'abc' }, { kind: 'bug', message: 'x'.repeat(2001) },
      { kind: 'thumb', rating: 5 }, { kind: 'thumb' }, { kind: 'bug', message: 'hello world', page: 'http://evil' }, { kind: 'bug', message: 12345 }]) {
      expect((await as(userTok, 'post', '/feedback', body)).status, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
    const xss = '<script>alert(1)</script> le bouton ne répond plus';
    const ok = await as(userTok, 'post', '/feedback', { kind: 'bug', message: xss, page: '/dashboard' });
    expect(ok.status).toBe(200);
    expect((await query('SELECT message, page FROM feedback WHERE id = $1', [ok.body.id])).rows[0]).toEqual({ message: xss, page: '/dashboard' });
    expect((await as(userTok, 'post', '/feedback', { kind: 'thumb', rating: 1, page: '/banque' })).status).toBe(200);
    expect((await as(userTok, 'post', '/feedback', { kind: 'idea', message: 'Ajouter un mode sombre' })).status).toBe(200);
  });

  it('retours : limités à 10 par heure et par IP', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await as(userTok, 'post', '/feedback', { kind: 'thumb', rating: -1 })).status;
    expect(last).toBe(429);
  });

  it('administration des retours : réservée aux admins, filtres, changement de statut tracé', async () => {
    expect((await as(userTok, 'get', '/admin/feedback')).status).toBe(403);
    const all = await as(adminTok, 'get', '/admin/feedback');
    expect(all.status).toBe(200);
    expect(all.body.total).toBeGreaterThan(2);
    expect(all.body.thumbs.up).toBeGreaterThan(0);
    const bugs = await as(adminTok, 'get', '/admin/feedback?kind=bug&status=new');
    expect(bugs.body.feedback.length).toBeGreaterThan(0);
    expect(bugs.body.feedback.every((f: any) => f.kind === 'bug' && f.status === 'new')).toBe(true);
    const id = bugs.body.feedback[0].id;
    expect((await as(adminTok, 'post', `/admin/feedback/${id}`, { status: 'inconnu' })).status).toBe(400);
    expect((await as(adminTok, 'post', `/admin/feedback/${id}`, { status: 'done', note: 'corrigé dans la prochaine version' })).status).toBe(200);
    expect((await as(adminTok, 'post', `/admin/feedback/11111111-1111-1111-1111-111111111111`, { status: 'done' })).status).toBe(404);
    expect((await query('SELECT status, admin_note FROM feedback WHERE id = $1', [id])).rows[0]).toEqual({ status: 'done', admin_note: 'corrigé dans la prochaine version' });
    expect((await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'admin_update_feedback' AND entity_id = $1`, [id])).rows[0].n).toBe(1);
  });

  it('annonces : brouillon invisible, publication, dépublication, suppression ; publiques sans connexion ; validation ; tracé', async () => {
    expect((await as(userTok, 'post', '/admin/announcements', { title: 'x', published: true })).status).toBe(403);
    for (const body of [{ title: 'ab', published: true }, { title: 'Titre valide', published: 'oui' }, { title: 'Titre valide', kind: 'danger', published: true }, { title: 'Titre valide', body: 'x'.repeat(2001), published: true }, {}]) {
      expect((await as(adminTok, 'post', '/admin/announcements', body)).status, JSON.stringify(body).slice(0, 50)).toBe(400);
    }
    const draft = await as(adminTok, 'post', '/admin/announcements', { kind: 'maintenance', title: 'Maintenance samedi', body: 'Le site sera coupé 1 h.', published: false });
    expect(draft.status).toBe(200);
    const id = draft.body.id;
    let pub = await request(app).get('/api/v1/announcements');                  // sans connexion
    expect(pub.status).toBe(200);
    expect(pub.body.announcements.map((a: any) => a.id)).not.toContain(id);      // brouillon : invisible
    expect((await as(adminTok, 'put', `/admin/announcements/${id}`, { kind: 'maintenance', title: 'Maintenance samedi', body: 'Le site sera coupé 1 h.', published: true })).status).toBe(200);
    pub = await request(app).get('/api/v1/announcements');
    const a = pub.body.announcements.find((x: any) => x.id === id);
    expect(a).toMatchObject({ kind: 'maintenance', title: 'Maintenance samedi' });
    expect(a.published_at).toBeTruthy();
    expect(pub.headers['cache-control']).toMatch(/max-age=60/);
    await as(adminTok, 'put', `/admin/announcements/${id}`, { kind: 'maintenance', title: 'Maintenance samedi', published: false });
    expect((await request(app).get('/api/v1/announcements')).body.announcements.map((x: any) => x.id)).not.toContain(id);
    expect((await as(adminTok, 'put', `/admin/announcements/11111111-1111-1111-1111-111111111111`, { title: 'Titre valide', published: true })).status).toBe(404);
    expect((await as(adminTok, 'delete', `/admin/announcements/${id}`)).status).toBe(200);
    expect((await as(adminTok, 'delete', `/admin/announcements/${id}`)).status).toBe(404);
    const acts = (await query(`SELECT action FROM audit_logs WHERE entity_id = $1`, [id])).rows.map((r: any) => r.action);
    expect(acts).toEqual(expect.arrayContaining(['admin_create_announcement', 'admin_update_announcement', 'admin_delete_announcement']));
    expect((await as(adminTok, 'get', '/admin/announcements')).status).toBe(200);
  });
});
