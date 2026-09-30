import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { csrfTokenFor, cookieMaxAgeMs } from '../src/utils/session';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

describe('session : fonctions pures', () => {
  it('originAllowed : défense en profondeur sur l\'en-tête Origin', async () => {
    const { originAllowed } = await import('../src/utils/session');
    const { env } = await import('../src/config/env');
    const saved = env.corsOrigins;
    (env as any).corsOrigins = ['https://mon-site.fr'];
    try {
      const req = (origin?: string, host = 'api.mon-site.fr') => ({ headers: { origin, host } }) as any;
      expect(originAllowed(req(undefined))).toBe(true);                 // pas d'Origin (clients non navigateur)
      expect(originAllowed(req('https://mon-site.fr'))).toBe(true);
      expect(originAllowed(req('https://evil.example'))).toBe(false);
      expect(originAllowed(req('https://api.mon-site.fr'))).toBe(true); // même hôte que l'API
      expect(originAllowed(req('pas une url'))).toBe(false);
    } finally { (env as any).corsOrigins = saved; }
  });

  it('le jeton CSRF est dérivé de la session (déterministe, propre à chaque session)', () => {
    const a = generateToken('u1', 'a@x.fr');
    const b = generateToken('u2', 'b@x.fr');
    expect(csrfTokenFor(a)).toBe(csrfTokenFor(a));
    expect(csrfTokenFor(a)).not.toBe(csrfTokenFor(b));
    expect(csrfTokenFor(a)).toMatch(/^[0-9a-f]{64}$/);
  });
  it('durée du cookie alignée sur JWT_EXPIRES_IN', () => {
    expect(cookieMaxAgeMs('7d')).toBe(7 * 86400_000);
    expect(cookieMaxAgeMs('12h')).toBe(12 * 3600_000);
    expect(cookieMaxAgeMs('30m')).toBe(30 * 60_000);
    expect(cookieMaxAgeMs('3600')).toBe(3600_000);
    expect(cookieMaxAgeMs('n’importe quoi')).toBe(7 * 86400_000);
  });
});

const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat((res.headers['set-cookie'] as unknown as string[]) ?? []);
const find = (cookies: string[], name: string) => cookies.find((c) => c.startsWith(`${name}=`));
const value = (cookie: string | undefined) => (cookie ? decodeURIComponent(cookie.split(';')[0].split('=').slice(1).join('=')) : '');

describe.skipIf(!hasDb)('session par cookie httpOnly + CSRF (base réelle)', () => {
  let email: string;
  let userId: string;
  let sessionCookie: string;
  let csrf: string;

  beforeAll(async () => {
    await setupDb();
    userId = await createUser({ balance: 300 });
    email = `${userId}@test.local`;
    await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, await bcrypt.hash('Motdepasse!42', 4)]);
  });
  afterAll(teardownDb);

  it('la connexion pose un cookie de session httpOnly SameSite=Lax et un cookie CSRF lisible', async () => {
    const r = await request(app).post('/api/v1/auth/login').send({ email, password: 'Motdepasse!42' });
    expect(r.status).toBe(200);
    const cookies = cookiesOf(r);
    const s = find(cookies, 'ik_session')!;
    const c = find(cookies, 'ik_csrf')!;
    expect(s).toMatch(/HttpOnly/i);
    expect(s).toMatch(/SameSite=Lax/i);
    expect(c).not.toMatch(/HttpOnly/i);
    expect(value(c)).toBe(csrfTokenFor(value(s)));
    sessionCookie = value(s);
    csrf = value(c);
    expect(r.body.token).toBeTruthy(); // compatibilité : encore renvoyé tant que SESSION_TOKEN_IN_BODY n'est pas false
  });

  it('les lectures (GET) fonctionnent avec le seul cookie', async () => {
    const r = await request(app).get('/api/v1/economy/balance').set('Cookie', `ik_session=${sessionCookie}`);
    expect(r.status).toBe(200);
    expect(r.body.balance).toBe(300);
  });

  it('une écriture (POST) avec le cookie mais SANS jeton CSRF est refusée (403)', async () => {
    const r = await request(app).post('/api/v1/economy/daily-reward').set('Cookie', `ik_session=${sessionCookie}`);
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('CSRF_INVALID');
  });

  it('un jeton CSRF d\'une autre session est refusé', async () => {
    const other = csrfTokenFor(generateToken('autre', 'autre@x.fr'));
    const r = await request(app).post('/api/v1/economy/daily-reward').set('Cookie', `ik_session=${sessionCookie}`).set('X-CSRF-Token', other);
    expect(r.status).toBe(403);
  });

  it('un attaquant qui dépose son propre cookie CSRF ne peut rien : seul le jeton dérivé de la session compte', async () => {
    const r = await request(app).post('/api/v1/economy/daily-reward')
      .set('Cookie', `ik_session=${sessionCookie}; ik_csrf=forge`).set('X-CSRF-Token', 'forge');
    expect(r.status).toBe(403);
  });

  it('une écriture avec cookie + bon jeton CSRF passe', async () => {
    const r = await request(app).post('/api/v1/economy/daily-reward').set('Cookie', `ik_session=${sessionCookie}; ik_csrf=${csrf}`).set('X-CSRF-Token', csrf);
    expect(r.status).not.toBe(403);
    expect(r.status).not.toBe(401);
  });

  it('une Origin étrangère est refusée (403) quand CORS_ORIGIN est restreint, même avec cookie et bon jeton', async () => {
    const { env } = await import('../src/config/env');
    const saved = env.corsOrigins;
    (env as any).corsOrigins = ['https://mon-site.fr'];
    try {
      const bad = await request(app).post('/api/v1/economy/daily-reward')
        .set('Cookie', `ik_session=${sessionCookie}`).set('X-CSRF-Token', csrf).set('Origin', 'https://evil.example');
      expect(bad.status).toBe(403);
      const good = await request(app).post('/api/v1/economy/daily-reward')
        .set('Cookie', `ik_session=${sessionCookie}`).set('X-CSRF-Token', csrf).set('Origin', 'https://mon-site.fr');
      expect(good.status).not.toBe(403);
    } finally {
      (env as any).corsOrigins = saved;
    }
  });

  it('l\'en-tête Bearer reste accepté sans CSRF (clients mobiles / scripts)', async () => {
    const token = generateToken(userId, email);
    const r = await request(app).post('/api/v1/economy/daily-reward').set('Authorization', `Bearer ${token}`);
    expect(r.status).not.toBe(403);
    expect(r.status).not.toBe(401);
  });

  it('un Bearer invalide est refusé même si un cookie valide est présent (pas de repli silencieux)', async () => {
    const r = await request(app).get('/api/v1/economy/balance').set('Authorization', 'Bearer nimportequoi').set('Cookie', `ik_session=${sessionCookie}`);
    expect(r.status).toBe(401);
  });

  it('un cookie de session falsifié ou expiré est refusé', async () => {
    const r = await request(app).get('/api/v1/economy/balance').set('Cookie', 'ik_session=abc.def.ghi');
    expect(r.status).toBe(401);
  });

  it('le cookie CSRF perdu est ré-émis sur une lecture authentifiée', async () => {
    const r = await request(app).get('/api/v1/economy/balance').set('Cookie', `ik_session=${sessionCookie}`);
    expect(value(find(cookiesOf(r), 'ik_csrf'))).toBe(csrf);
  });

  it('migration : un ancien jeton (Bearer) s\'échange contre des cookies httpOnly', async () => {
    const token = generateToken(userId, email);
    const r = await request(app).post('/api/v1/auth/session/upgrade').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    const s = find(cookiesOf(r), 'ik_session')!;
    expect(s).toMatch(/HttpOnly/i);
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', `ik_session=${value(s)}`);
    expect(me.status).toBe(200);
  });

  it('la déconnexion efface les deux cookies', async () => {
    const r = await request(app).post('/api/v1/auth/logout');
    expect(r.status).toBe(200);
    const s = find(cookiesOf(r), 'ik_session')!;
    expect(s).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(find(cookiesOf(r), 'ik_csrf')).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('SESSION_TOKEN_IN_BODY=false : plus de jeton dans la réponse, le cookie suffit', async () => {
    process.env.SESSION_TOKEN_IN_BODY = 'false';
    try {
      const r = await request(app).post('/api/v1/auth/login').send({ email, password: 'Motdepasse!42' });
      expect(r.status).toBe(200);
      expect(r.body.token).toBeUndefined();
      expect(find(cookiesOf(r), 'ik_session')).toBeTruthy();
    } finally {
      delete process.env.SESSION_TOKEN_IN_BODY;
    }
  });
});
