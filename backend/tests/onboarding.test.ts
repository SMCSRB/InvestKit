import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { onboardingService, suggestPath, CHECKLIST_REWARD_COINS, PROFILE_OPTIONS } from '../src/services/onboardingService';
import { tradingService } from '../src/services/tradingService';
import { realEstateService as svc } from '../src/services/realEstateService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, legacyCoins } from './helpers';

describe('conseil de départ selon le profil', () => {
  it('débutant : éducation d\'abord ; prudent : liquidités ; risque élevé : tests de résistance ; immobilier : rendement et effort d\'épargne', () => {
    const a = suggestPath({ experience: 'beginner', riskTolerance: 'low', markets: ['real_estate', 'bonds'] });
    expect(a.headline).toContain('Immobilier');
    expect(a.steps.join(' ')).toMatch(/Éducation/);
    expect(a.steps.join(' ')).toMatch(/liquidités/);
    expect(a.steps.join(' ')).toMatch(/effort d'épargne/);
    const b = suggestPath({ experience: 'expert', riskTolerance: 'high', markets: ['crypto'] });
    expect(b.headline).toContain('Crypto');
    expect(b.steps.join(' ')).not.toMatch(/Commence par l'Éducation/);
    expect(b.steps.join(' ')).toMatch(/tests de résistance/);
  });
});

describe.skipIf(!hasDb)('checklist d\'accueil gamifiée (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const tok = (id: string) => generateToken(id, `${id}@test.local`);
  const call = (t: string, method: 'get' | 'post', path: string, body?: object) => { const r = request(app)[method](`/api/v1/onboarding${path}`).set('Authorization', `Bearer ${t}`); return body ? r.send(body) : r; };
  const done = async (uid: string) => (await onboardingService.get(uid)).steps.filter((s) => s.done).map((s) => s.key);

  it('authentification requise ; nouveau compte : rien de fait, prochaine étape proposée', async () => {
    expect((await request(app).get('/api/v1/onboarding')).status).toBe(401);
    expect((await request(app).post('/api/v1/onboarding/claim')).status).toBe(401);
    const u = await createUser({ balance: 0 });
    const r = await call(tok(u), 'get', '');
    expect(r.status).toBe(200);
    expect(r.body.doneCount).toBe(0);
    expect(r.body.nextStep.key).toBe('profile');
    expect(r.body.claimableCoins).toBe(0);
    expect(r.body.steps.length).toBe(7);
  });

  it('étapes calculées sur l\'état réel : domaine gratuit, leçon, récompense quotidienne, 2FA, achat', async () => {
    const u = await createUser({ balance: 1000, freeDomain: 'stocks' });
    expect(await done(u)).toEqual(['free_domain']);
    await query(`INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned, coins_earned) VALUES ($1,'stocks','ch1',10,5)`, [u]);
    await query('UPDATE users SET last_daily_claim_at = NOW(), enable_2fa = TRUE WHERE id = $1', [u]);
    await tradingService.buy(u, 'stocks', 'TTE', 1);
    expect((await done(u)).sort()).toEqual(['daily_reward', 'first_lesson', 'first_trade', 'free_domain', 'two_factor']);
  });

  it('premier bien immobilier', async () => {
    const u = await createUser({ balance: legacyCoins(30000), freeDomain: 'real_estate' });
    await svc.startGame(u, 'executive');
    let listing: any;
    for (const l of await src.listListings(2010)) { if (l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 50000 && l.price < 90000) { listing = l; break; } }
    await svc.purchase(u, { listingId: listing.id, downPaymentCoins: legacyCoins(1500), months: 240 });
    expect(await done(u)).toContain('first_property');
  });

  it('profil : validation stricte, enregistrement, étape validée, conseil renvoyé', async () => {
    const u = await createUser({ balance: 0 });
    const t = tok(u);
    const good = { experience: 'beginner', riskTolerance: 'medium', goals: ['learn', 'save'], markets: ['stocks', 'real_estate'] };
    for (const bad of [{}, { ...good, experience: 'pro' }, { ...good, riskTolerance: 5 }, { ...good, goals: [] }, { ...good, goals: ['learn', 'hack'] }, { ...good, markets: 'stocks' },
      { ...good, markets: ['stocks', 'stocks', 'crypto', 'bonds', 'real_estate'] }, { ...good, goals: new Array(6).fill('learn') }, null]) {
      expect((await call(t, 'post', '/profile', bad as any)).status, JSON.stringify(bad)).toBe(400);
    }
    const r = await call(t, 'post', '/profile', good);
    expect(r.status).toBe(200);
    expect(r.body.suggestion.headline).toContain('Bourse');
    expect(await done(u)).toEqual(['profile']);
    const state = (await call(t, 'get', '')).body;
    expect(state.profile).toMatchObject({ experience: 'beginner', riskTolerance: 'medium', goals: ['learn', 'save'], markets: ['stocks', 'real_estate'] });
    expect(state.options).toEqual(PROFILE_OPTIONS);
    // mise à jour : écrase, sans doublon
    await call(t, 'post', '/profile', { ...good, riskTolerance: 'high' });
    expect((await call(t, 'get', '')).body.profile.riskTolerance).toBe('high');
    expect((await query('SELECT COUNT(*)::int AS n FROM investor_profiles WHERE user_id = $1', [u])).rows[0].n).toBe(1);
  });

  it('récompenses : une seule fois par étape, même avec 5 demandes simultanées ; registre, solde et notification cohérents', async () => {
    const u = await createUser({ balance: 100, freeDomain: 'stocks' });
    await call(tok(u), 'post', '/profile', { experience: 'expert', riskTolerance: 'low', goals: ['save'], markets: ['bonds'] });
    expect((await onboardingService.get(u)).claimableCoins).toBe(2 * CHECKLIST_REWARD_COINS);
    const results = await Promise.all(Array.from({ length: 5 }, () => onboardingService.claim(u)));
    expect(results.reduce((s, r) => s + r.coins, 0)).toBe(2 * CHECKLIST_REWARD_COINS);
    expect(await balanceOf(u)).toBe(100 + 2 * CHECKLIST_REWARD_COINS);
    const led = (await query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::int AS s, MIN(nature) AS nature FROM investcoins_transactions WHERE user_id = $1 AND reason = 'checklist_reward'`, [u])).rows[0];
    expect(led.s).toBe(2 * CHECKLIST_REWARD_COINS);
    expect(led.nature).toBe('creation');
    expect((await query(`SELECT COUNT(*)::int AS n FROM onboarding_rewards WHERE user_id = $1`, [u])).rows[0].n).toBe(2);
    expect((await onboardingService.claim(u)).coins).toBe(0);                     // déjà récupérées
    expect((await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND kind = 'onboarding_reward'`, [u])).rows[0].n).toBeGreaterThan(0);
    // une étape terminée plus tard se récupère à son tour
    await query('UPDATE users SET enable_2fa = TRUE WHERE id = $1', [u]);
    expect((await onboardingService.claim(u)).coins).toBe(CHECKLIST_REWARD_COINS);
  });

  it('impossible de se faire récompenser une étape non accomplie (le client ne déclare rien)', async () => {
    const u = await createUser({ balance: 0 });
    const r = await call(tok(u), 'post', '/claim', { steps: ['first_trade', 'first_property'], coins: 9999 });
    expect(r.body.coins).toBe(0);
    expect(await balanceOf(u)).toBe(0);
  });
});
