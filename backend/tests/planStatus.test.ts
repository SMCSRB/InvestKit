import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { planService } from '../src/services/planService';

const me = async (id: string) => (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${generateToken(id, `${id}@test.local`)}`)).body.user;
const addSub = (userId: string, o: { status?: string; end?: string; canceled?: string | null } = {}) => query(
  `INSERT INTO subscriptions (user_id, tier, status, payment_provider, external_subscription_id, current_period_end, canceled_at) VALUES ($1,'pro',$2,'stripe',$3,$4,$5)`,
  [userId, o.status ?? 'active', `sub_${userId}`, o.end ?? '2027-03-15T00:00:00Z', o.canceled ?? null]);

describe.skipIf(!hasDb)('statut Pro : vient du serveur (abonnement ou passage manuel)', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });

  it('compte gratuit : pas Pro, aucune date', async () => {
    const u = await createUser({ tier: 'free' });
    const user = await me(u);
    expect(user.plan).toEqual({ isPro: false, source: 'none', renewsAt: null, endsAt: null });
    expect(user.hasProAccess).toBe(false);
  });

  it('abonnement Pro actif (Stripe) : Pro, avec la date de renouvellement', async () => {
    const u = await createUser({ tier: 'pro' });
    await addSub(u);
    const user = await me(u);
    expect(user.plan).toMatchObject({ isPro: true, source: 'subscription', endsAt: null });
    expect(user.plan.renewsAt).toBe('2027-03-15T00:00:00.000Z');
    expect(user.hasProAccess).toBe(true);
  });

  it('abonnement résilié mais encore payé : Pro, avec une date de FIN (pas de renouvellement)', async () => {
    const u = await createUser({ tier: 'pro' });
    await addSub(u, { canceled: '2026-09-20T00:00:00Z', end: '2026-12-01T00:00:00Z' });
    expect((await me(u)).plan).toEqual({ isPro: true, source: 'subscription', renewsAt: null, endsAt: '2026-12-01T00:00:00.000Z' });
  });

  it('Pro accordé à la main (pro_override) : Pro « manuel », sans date', async () => {
    const u = await createUser({ tier: 'free', proOverride: true });
    expect((await me(u)).plan).toEqual({ isPro: true, source: 'manual', renewsAt: null, endsAt: null });
  });

  it('un abonnement terminé (statut non actif) ne rend pas Pro', async () => {
    const u = await createUser({ tier: 'free' });
    await addSub(u, { status: 'canceled' });
    expect((await me(u)).plan.isPro).toBe(false);
  });

  it('le serveur ne tient compte d\'aucune donnée envoyée par le navigateur (en-têtes, paramètres)', async () => {
    const u = await createUser({ tier: 'free' });
    const token = generateToken(u, `${u}@test.local`);
    const r = await request(app).get('/api/v1/auth/me?plan=pro&tier=pro&isPro=true').set('Authorization', `Bearer ${token}`).set('X-Plan', 'pro').set('X-Subscription-Tier', 'pro');
    expect(r.body.user.plan.isPro).toBe(false);
    expect(r.body.user.hasProAccess).toBe(false);
  });

  it('planOf : même résultat qu\'en HTTP', async () => {
    const u = await createUser({ tier: 'free', proOverride: true });
    expect(await planService.planOf({ id: u, subscription_tier: 'free', pro_override: true })).toMatchObject({ isPro: true, source: 'manual' });
  });
});
