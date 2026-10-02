import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { csrfTokenFor } from '../src/utils/session';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

// Faille corrigée ici : /auth/save-preferences ouvrait une session pour N'IMPORTE QUELLE adresse e-mail donnée dans le corps de la
// requête (sans mot de passe, sans code, sans 2FA, même pour un compte jamais vérifié). La session n'est maintenant ouverte que
// par la preuve du code reçu par e-mail (verify-email), et save-preferences exige cette session.
const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat((res.headers['set-cookie'] as unknown as string[]) ?? []);
const sessionOf = (res: request.Response): string | null => {
  const c = cookiesOf(res).find((x) => x.startsWith('ik_session='));
  return c ? decodeURIComponent(c.split(';')[0].split('=').slice(1).join('=')) : null;
};
const asBrowser = (jwt: string) => {
  const csrf = csrfTokenFor(jwt);
  return { Cookie: `ik_session=${jwt}; ik_csrf=${csrf}`, 'X-CSRF-Token': csrf };
};
const prefs = { accountType: 'beginner', interests: [], language: 'fr' };

describe.skipIf(!hasDb)('session ouverte seulement sur preuve (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('FAILLE : save-preferences sans session ne donne aucune connexion, même avec l\'adresse d\'un compte vérifié', async () => {
    const victim = await createUser({ verified: true });
    const r = await request(app).post('/api/v1/auth/save-preferences').send({ email: `${victim}@test.local`, username: 'Intrus', ...prefs });
    expect(r.status).toBe(401);
    expect(sessionOf(r)).toBeNull();
    expect(r.body.token).toBeUndefined();
    const row = await query('SELECT username FROM users WHERE id = $1', [victim]);
    expect(row.rows[0].username).not.toBe('Intrus');
  });

  it('FAILLE : idem pour un compte jamais vérifié (aucune connexion sans le code)', async () => {
    const id = await createUser({ verified: false, code: '123456' });
    const r = await request(app).post('/api/v1/auth/save-preferences').send({ email: `${id}@test.local`, username: 'Intrus2', ...prefs });
    expect(r.status).toBe(401);
    expect(sessionOf(r)).toBeNull();
  });

  it('un mauvais code n\'ouvre aucune session', async () => {
    const id = await createUser({ verified: false, code: '654321' });
    const r = await request(app).post('/api/v1/auth/verify-email').send({ email: `${id}@test.local`, code: '000000' });
    expect(r.status).toBe(400);
    expect(sessionOf(r)).toBeNull();
    expect((await query('SELECT verified FROM users WHERE id = $1', [id])).rows[0].verified).toBe(false);
  });

  it('le bon code vérifie le compte ET ouvre la session de CE compte (cookie httpOnly)', async () => {
    const id = await createUser({ verified: false, code: '111222' });
    await query(`UPDATE users SET verification_code_expires_at = NOW() + interval '10 minutes' WHERE id = $1`, [id]);
    const r = await request(app).post('/api/v1/auth/verify-email').send({ email: `${id}@test.local`, code: '111222' });
    expect(r.status).toBe(200);
    const jwt = sessionOf(r);
    expect(jwt).toBeTruthy();
    expect(cookiesOf(r).find((c) => c.startsWith('ik_session='))).toMatch(/HttpOnly/i);
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', `ik_session=${jwt}`);
    expect(me.status).toBe(200);
    expect(me.body.user?.id ?? me.body.id).toBe(id);
    // le code ne sert qu'une fois : rejouer ne donne rien
    const again = await request(app).post('/api/v1/auth/verify-email').send({ email: `${id}@test.local`, code: '111222' });
    expect(again.status).toBe(400);
    expect(sessionOf(again)).toBeNull();
  });

  it('un code expiré n\'ouvre aucune session', async () => {
    const id = await createUser({ verified: false, code: '999888' });
    await query(`UPDATE users SET verification_code_expires_at = NOW() - interval '1 minute' WHERE id = $1`, [id]);
    const r = await request(app).post('/api/v1/auth/verify-email').send({ email: `${id}@test.local`, code: '999888' });
    expect(r.status).toBe(400);
    expect(sessionOf(r)).toBeNull();
  });

  it('save-preferences : l\'identité vient de la session, l\'e-mail du corps est ignoré', async () => {
    const me = await createUser({ verified: true });
    const other = await createUser({ verified: true });
    const jwt = generateToken(me, `${me}@test.local`);
    const r = await request(app).post('/api/v1/auth/save-preferences').set(asBrowser(jwt))
      .send({ email: `${other}@test.local`, username: 'Camille42', ...prefs });
    expect(r.status).toBe(200);
    expect((await query('SELECT username FROM users WHERE id = $1', [me])).rows[0].username).toBe('Camille42');
    expect((await query('SELECT username FROM users WHERE id = $1', [other])).rows[0].username).not.toBe('Camille42');
    expect(r.body.user.id).toBe(me);
  });

  it('save-preferences : refusé pour un compte non vérifié, pseudo déjà pris (409), pseudo invalide (400)', async () => {
    const unverified = await createUser({ verified: false, code: '222333' });
    const r1 = await request(app).post('/api/v1/auth/save-preferences').set(asBrowser(generateToken(unverified, `${unverified}@test.local`)))
      .send({ username: 'Pasvalide', ...prefs });
    expect(r1.status).toBe(403);

    const a = await createUser({ verified: true });
    const b = await createUser({ verified: true });
    await request(app).post('/api/v1/auth/save-preferences').set(asBrowser(generateToken(a, `${a}@test.local`))).send({ username: 'Doublon', ...prefs });
    const r2 = await request(app).post('/api/v1/auth/save-preferences').set(asBrowser(generateToken(b, `${b}@test.local`))).send({ username: 'Doublon', ...prefs });
    expect(r2.status).toBe(409);
    for (const bad of ['', 'a', 'x'.repeat(31), 42, { $ne: 1 }]) {
      const r3 = await request(app).post('/api/v1/auth/save-preferences').set(asBrowser(generateToken(b, `${b}@test.local`))).send({ username: bad, ...prefs });
      expect(r3.status).toBe(400);
    }
  });

  it('save-preferences : un cookie sans jeton anti-CSRF est refusé', async () => {
    const id = await createUser({ verified: true });
    const jwt = generateToken(id, `${id}@test.local`);
    const r = await request(app).post('/api/v1/auth/save-preferences').set('Cookie', `ik_session=${jwt}`).send({ username: 'SansCsrf', ...prefs });
    expect(r.status).toBe(403);
  });

  it('l\'ouverture de session par verify-email et l\'enregistrement du profil sont tracés dans le journal d\'audit', async () => {
    const id = await createUser({ verified: false, code: '444555' });
    await query(`UPDATE users SET verification_code_expires_at = NOW() + interval '10 minutes' WHERE id = $1`, [id]);
    const v = await request(app).post('/api/v1/auth/verify-email').send({ email: `${id}@test.local`, code: '444555' });
    const jwt = sessionOf(v)!;
    await request(app).post('/api/v1/auth/save-preferences').set(asBrowser(jwt)).send({ username: 'Tracee', ...prefs });
    const rows = await query(`SELECT action FROM audit_logs WHERE user_id = $1 ORDER BY created_at`, [id]);
    const actions = rows.rows.map((x: any) => x.action);
    expect(actions).toContain('email_verified');
    expect(actions).toContain('profile_setup');
  });

  it('force brute : après trop d\'essais, même le BON code est refusé (verrou par compte, 429)', async () => {
    const id = await createUser({ verified: false, code: '135790' });
    await query(`UPDATE users SET verification_code_expires_at = NOW() + interval '10 minutes' WHERE id = $1`, [id]);
    const email = `${id}@test.local`;
    for (let i = 0; i < 8; i += 1) {
      const r = await request(app).post('/api/v1/auth/verify-email').send({ email, code: String(100000 + i) });
      expect([400, 429]).toContain(r.status);
    }
    const good = await request(app).post('/api/v1/auth/verify-email').send({ email, code: '135790' });
    expect(good.status).toBe(429);
    expect(sessionOf(good)).toBeNull();
  });
});
