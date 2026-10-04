// Accès aux modes de jeu (6c) : règles décidées par Andreja, vérifiées côté serveur.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser, setFlatFx, calmUserId } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { importDemo } from '../src/services/crypto/importer';
import { decideAccess, scenarioPlayed, isGameMode } from '../src/engine/modeAccess';
import { modeAccessService } from '../src/services/modeAccessService';
import { PERIOD_UNLOCK_MONTHS } from '../src/config/clockRules';

const d = (s: string) => Date.parse(`${s}T00:00:00Z`);
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;

describe('règles d\'accès (pures)', () => {
  const base = { pro: false, unlockedScenarios: [] as string[] };
  it('Histoire : ouvert à tous', () => {
    expect(decideAccess({ ...base, mode: 'history' }).allowed).toBe(true);
  });
  it('En ligne : Pro seulement', () => {
    expect(decideAccess({ ...base, mode: 'live' })).toMatchObject({ allowed: false, code: 'PRO_REQUIRED' });
    expect(decideAccess({ ...base, pro: true, mode: 'live' }).allowed).toBe(true);
  });
  it('Bac à sable gratuit : seulement les périodes déjà jouées, jamais de départ libre', () => {
    expect(decideAccess({ ...base, mode: 'sandbox', scenarioId: 'y2020' })).toMatchObject({ allowed: false, code: 'PERIOD_LOCKED' });
    expect(decideAccess({ ...base, mode: 'sandbox' })).toMatchObject({ allowed: false, code: 'PERIOD_LOCKED' });
    expect(decideAccess({ ...base, unlockedScenarios: ['y2020'], mode: 'sandbox', scenarioId: 'y2020' }).allowed).toBe(true);
    expect(decideAccess({ ...base, unlockedScenarios: ['y2020'], mode: 'sandbox', scenarioId: 'y2021' })).toMatchObject({ code: 'PERIOD_LOCKED' });
    expect(decideAccess({ ...base, unlockedScenarios: ['y2020'], mode: 'sandbox', scenarioId: 'y2020', customStart: true })).toMatchObject({ allowed: false, code: 'PRO_REQUIRED' });
  });
  it('Bac à sable Pro : période et date de départ libres', () => {
    expect(decideAccess({ ...base, pro: true, mode: 'sandbox', scenarioId: 'y2014', customStart: true }).allowed).toBe(true);
  });
  it('mode inconnu refusé', () => {
    for (const m of ['', 'Histoire', 'accelerated', null, 3, undefined, '__proto__']) expect(decideAccess({ ...base, pro: true, mode: m })).toMatchObject({ allowed: false, code: 'UNKNOWN_MODE' });
    expect(isGameMode('live')).toBe(true);
  });
  it('une période est jouée après le nombre de mois voulu', () => {
    expect(PERIOD_UNLOCK_MONTHS).toBe(12);
    expect(scenarioPlayed(d('2020-01-01'), d('2020-12-31'), 12)).toBe(false);
    expect(scenarioPlayed(d('2020-01-01'), d('2021-01-01'), 12)).toBe(true);
    expect(scenarioPlayed(d('2020-01-15'), d('2021-01-14'), 12)).toBe(false);
    expect(scenarioPlayed(d('2020-01-15'), d('2021-01-15'), 12)).toBe(true);
  });
});

describe.skipIf(!hasDb)('accès aux modes : serveur', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); await setFlatFx(1.1); }, 120_000);
  afterAll(teardownDb);
  const player = async (tier: 'free' | 'pro' = 'free') => createUser({ id: calmUserId(d('2020-01-01'), 800), balance: 50_000, tier, activeDays: 5 });
  const adv = (u: string, body: any) => request(app).post('/api/v1/clock/advance').set('Authorization', tok(u)).send(body);

  it('jouer son scénario en Histoire débloque sa période (une fois, jamais avant 12 mois)', async () => {
    const u = await player();
    await adv(u, { step: 'quarter' });
    expect((await modeAccessService.view(u)).modes.find((m) => m.id === 'sandbox')!.unlockedPeriods).toEqual([]);
    await adv(u, { step: 'year' });
    const sb: any = (await modeAccessService.view(u)).modes.find((m) => m.id === 'sandbox');
    expect(sb.unlockedPeriods).toEqual(['y2020']);
    await adv(u, { step: 'year' });
    expect((await query('SELECT COUNT(*)::int AS n FROM played_periods WHERE user_id = $1', [u])).rows[0].n).toBe(1);
    expect(await modeAccessService.check(u, { mode: 'sandbox', scenarioId: 'y2020' })).toEqual({ allowed: true });
    expect(await modeAccessService.check(u, { mode: 'sandbox', scenarioId: 'y2021' })).toMatchObject({ code: 'PERIOD_LOCKED' });
  });

  it('le droit Pro vient de la base, jamais de la demande', async () => {
    const free = await player(), pro = await player('pro');
    expect(await modeAccessService.check(free, { mode: 'live', ...({ pro: true, tier: 'pro' } as any) })).toMatchObject({ code: 'PRO_REQUIRED' });
    expect(await modeAccessService.check(pro, { mode: 'live' })).toEqual({ allowed: true });
    expect(await modeAccessService.check(pro, { mode: 'sandbox', scenarioId: 'y2014', customStart: true })).toEqual({ allowed: true });
  });

  it('GET /clock/modes : authentification obligatoire, chacun voit ses propres périodes', async () => {
    expect((await request(app).get('/api/v1/clock/modes')).status).toBe(401);
    const a = await player(), b = await player();
    await adv(a, { step: 'year' });
    const ra = (await request(app).get('/api/v1/clock/modes').set('Authorization', tok(a))).body;
    const rb = (await request(app).get('/api/v1/clock/modes').set('Authorization', tok(b))).body;
    expect(ra.modes.map((m: any) => m.id)).toEqual(['history', 'sandbox', 'live']);
    expect(ra.modes.find((m: any) => m.id === 'sandbox').unlockedPeriods).toEqual(['y2020']);
    expect(rb.modes.find((m: any) => m.id === 'sandbox').unlockedPeriods).toEqual([]);
    expect(ra.modes.find((m: any) => m.id === 'live')).toMatchObject({ access: 'pro', allowedForYou: false, available: false, readOnlyForFree: false });
    expect(ra.modes.find((m: any) => m.id === 'history')).toMatchObject({ access: 'all', allowedForYou: true, available: true });
  });

  it('suppression du compte : périodes effacées', async () => {
    const u = await player();
    await adv(u, { step: 'year' });
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect((await query('SELECT COUNT(*)::int AS n FROM played_periods WHERE user_id = $1', [u])).rows[0].n).toBe(0);
  });
});
