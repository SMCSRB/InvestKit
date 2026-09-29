import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

// Tests « bout en bout » au niveau HTTP : on appelle l'application Express
// comme le ferait le navigateur (sans ouvrir de port).

describe('HTTP - sans base de données', () => {
  it('GET /health répond ok', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });

  it('une route inconnue répond 404 en JSON', async () => {
    const r = await request(app).get('/api/v1/nimportequoi');
    expect(r.status).toBe(404);
    expect(r.body.error).toBeTruthy();
  });

  it('les en-têtes de sécurité (helmet) sont présents', async () => {
    const r = await request(app).get('/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it.each([
    '/api/v1/auth/me',
    '/api/v1/auth/me/export',
    '/api/v1/economy/balance',
    '/api/v1/bank/overview',
    '/api/v1/realestate/state',
    '/api/v1/trading/portfolio',
  ])('%s refuse sans jeton (401)', async (path) => {
    const r = await request(app).get(path);
    expect(r.status).toBe(401);
  });

  it('un jeton invalide est refusé', async () => {
    const r = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer pasunjeton');
    expect(r.status).toBe(401);
  });
});

describe.skipIf(!hasDb)('HTTP - avec base de données', () => {
  let userId: string;
  let token: string;

  beforeAll(async () => {
    await setupDb();
    userId = await createUser({ balance: 500 });
    token = generateToken(userId, `${userId}@test.local`);
  });
  afterAll(teardownDb);

  it('GET /api/v1/auth/me renvoie le profil sans secret', async () => {
    const r = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toMatch(/password_hash|totp_secret/);
  });

  it("l'ancien préfixe /api/auth reste un alias de /api/v1/auth", async () => {
    const a = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    const b = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });

  it('GET /api/v1/economy/balance renvoie le solde', async () => {
    const r = await request(app).get('/api/v1/economy/balance').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).toContain('500');
  });

  it('un compte non-admin ne voit pas les routes admin', async () => {
    const r = await request(app).get('/api/v1/economy/admin/coins-by-domain').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it("l'export RGPD est un fichier JSON téléchargeable", async () => {
    const r = await request(app).get('/api/v1/auth/me/export').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toMatch(/attachment/);
  });

  it("l'inscription avec un corps vide est refusée (400)", async () => {
    const r = await request(app).post('/api/v1/auth/register').send({});
    expect(r.status).toBe(400);
  });
});
