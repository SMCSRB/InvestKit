import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken, generateImpersonationToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import { claimDailyReward, dailyRewardStatus, weekStartKey, nextWeekStartKey } from '../src/services/dailyRewardService';
import { recordActiveDay, clearActiveDayCache } from '../src/services/activityService';
import { DAILY_REWARD_COINS, DAILY_REWARD_MAX_DAYS_PER_WEEK } from '../src/config/economy';

const at = (iso: string) => new Date(`${iso}Z`);

describe('récompense quotidienne : règles pures', () => {
  it('10 pièces fixes, 3 jours payés par semaine au maximum', () => {
    expect(DAILY_REWARD_COINS).toBe(10);
    expect(DAILY_REWARD_MAX_DAYS_PER_WEEK).toBe(3);
    // au plus 30 pièces par semaine, 1 560 par an : ordre de grandeur sans commune mesure avec le capital de départ
    expect(DAILY_REWARD_COINS * DAILY_REWARD_MAX_DAYS_PER_WEEK * 52).toBe(1560);
  });

  it('la semaine va du lundi au dimanche, en UTC', () => {
    expect(weekStartKey(at('2026-03-02T00:00:00'))).toBe('2026-03-02');   // lundi 00:00
    expect(weekStartKey(at('2026-03-08T23:59:59'))).toBe('2026-03-02');   // dimanche soir : même semaine
    expect(weekStartKey(at('2026-03-09T00:00:00'))).toBe('2026-03-09');   // lundi suivant : nouvelle semaine
    expect(weekStartKey(at('2026-01-01T12:00:00'))).toBe('2025-12-29');   // passage d'année
    expect(nextWeekStartKey(at('2026-03-04T10:00:00'))).toBe('2026-03-09');
  });
});

describe.skipIf(!hasDb)('récompense quotidienne (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('3 jours payés dans la semaine, le 4e refusé avec un message neutre, la semaine suivante repart', async () => {
    const uid = await createUser({ balance: 0 });
    const lundi = await claimDailyReward(uid, at('2026-03-02T09:00:00'));
    const mardi = await claimDailyReward(uid, at('2026-03-03T09:00:00'));
    const jeudi = await claimDailyReward(uid, at('2026-03-05T09:00:00'));
    expect([lundi, mardi, jeudi].map((r) => r.claimed && r.reward)).toEqual([10, 10, 10]);
    const vendredi = await claimDailyReward(uid, at('2026-03-06T09:00:00'));
    expect(vendredi).toMatchObject({ claimed: false, reason: 'WEEKLY_CAP', maxPerWeek: 3, nextWeekStart: '2026-03-09' });
    expect(await balanceOf(uid)).toBe(30);
    const lundiSuivant = await claimDailyReward(uid, at('2026-03-09T08:00:00'));
    expect(lundiSuivant).toMatchObject({ claimed: true, reward: 10, claimedThisWeek: 1 });
    expect(await balanceOf(uid)).toBe(40);
  });

  it('même jour : refus « déjà récupérée » ; un jour manqué ne change rien (ni bonus ni pénalité)', async () => {
    const uid = await createUser({ balance: 0 });
    expect((await claimDailyReward(uid, at('2026-03-02T09:00:00'))).claimed).toBe(true);
    expect(await claimDailyReward(uid, at('2026-03-02T21:00:00'))).toMatchObject({ claimed: false, reason: 'ALREADY_CLAIMED' });
    const apresLongtemps = await claimDailyReward(uid, at('2026-04-20T09:00:00'));   // 7 semaines plus tard
    expect(apresLongtemps).toMatchObject({ claimed: true, reward: 10 });
  });

  it('chaque versement est au registre (création de pièces, motif daily_reward), total = 10 × jours payés ; aucun gain en boucle', async () => {
    const uid = await createUser({ balance: 0 });
    for (const d of ['02', '03', '04', '05', '06', '07', '08']) await claimDailyReward(uid, at(`2026-03-${d}T09:00:00`));
    expect(await balanceOf(uid)).toBe(30);                       // 7 essais dans la semaine : 3 payés
    expect(await ledgerSum(uid)).toBe(30);
    const rows = (await query(`SELECT reason, nature, amount FROM investcoins_transactions WHERE user_id = $1`, [uid])).rows;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.reason === 'daily_reward' && r.nature === 'creation' && r.amount === 10)).toBe(true);
    expect((await query('SELECT COUNT(*)::int AS n FROM daily_reward_claims WHERE user_id = $1', [uid])).rows[0].n).toBe(3);
  });

  it('réclamations simultanées : une seule payée, même sur plusieurs jours de la même semaine', async () => {
    const uid = await createUser({ balance: 0 });
    const rs = await Promise.all(Array.from({ length: 12 }, () => claimDailyReward(uid, at('2026-03-04T09:00:00'))));
    expect(rs.filter((r) => r.claimed)).toHaveLength(1);
    expect(await balanceOf(uid)).toBe(10);
    const sixDays = await Promise.all(['02', '03', '04', '05', '06', '07'].map((d) => claimDailyReward(uid, at(`2026-03-${d}T10:00:00`))));
    expect(sixDays.filter((r) => r.claimed).length).toBeLessThanOrEqual(2);   // 3 payés au total dans la semaine
    expect(await balanceOf(uid)).toBeLessThanOrEqual(30);
  });

  it('l\'état est calculé par le serveur : disponible, déjà prise, plafond de la semaine', async () => {
    const uid = await createUser({ balance: 0 });
    const db = { query } as any;
    expect(await dailyRewardStatus(uid, db, at('2026-03-02T09:00:00'))).toMatchObject({ canClaim: true, reason: null, claimedThisWeek: 0, coins: 10, maxPerWeek: 3 });
    await claimDailyReward(uid, at('2026-03-02T09:00:00'));
    expect(await dailyRewardStatus(uid, db, at('2026-03-02T20:00:00'))).toMatchObject({ canClaim: false, reason: 'ALREADY_CLAIMED', claimedThisWeek: 1 });
    await claimDailyReward(uid, at('2026-03-03T09:00:00'));
    await claimDailyReward(uid, at('2026-03-04T09:00:00'));
    expect(await dailyRewardStatus(uid, db, at('2026-03-05T09:00:00'))).toMatchObject({ canClaim: false, reason: 'WEEKLY_CAP', claimedThisWeek: 3, nextWeekStart: '2026-03-09' });
    expect(await dailyRewardStatus(uid, db, at('2026-03-09T09:00:00'))).toMatchObject({ canClaim: true, claimedThisWeek: 0 });
  });

  it('API : message neutre au plafond, aucun mot de série ni de pression', async () => {
    const uid = await createUser({ balance: 0 });
    const tok = `Bearer ${generateToken(uid, `${uid}@test.local`)}`;
    const ok = await request(app).post('/api/v1/economy/daily-reward').set('Authorization', tok);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ success: true, reward: 10, claimedThisWeek: 1, maxPerWeek: 3 });
    expect(ok.body.newStreak).toBeUndefined();
    const again = await request(app).post('/api/v1/economy/daily-reward').set('Authorization', tok);
    expect(again.status).toBe(400);
    expect(again.body).toMatchObject({ code: 'ALREADY_CLAIMED', error: 'Récompense du jour déjà récupérée.' });
    const w = (await request(app).get('/api/v1/economy/balance').set('Authorization', tok)).body;
    expect(w).not.toHaveProperty('dailyStreak');
    for (const body of [JSON.stringify(ok.body), JSON.stringify(again.body)]) expect(body.toLowerCase()).not.toMatch(/série|streak|perdre|rater|ne rate pas/);
  });
});

describe.skipIf(!hasDb)('jours actifs : compteur sans pénalité', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const days = async (id: string) => Number((await query('SELECT active_days FROM users WHERE id = $1', [id])).rows[0].active_days);

  it('un jour compte une seule fois, même avec des requêtes simultanées et un cache vidé', async () => {
    const uid = await createUser({ balance: 0 });
    clearActiveDayCache();
    await Promise.all(Array.from({ length: 15 }, () => recordActiveDay(uid, at('2026-03-02T09:00:00'))));
    expect(await days(uid)).toBe(1);
    clearActiveDayCache();                                                  // un autre processus ne connaît pas le cache
    await recordActiveDay(uid, at('2026-03-02T22:00:00'));
    expect(await days(uid)).toBe(1);
    await recordActiveDay(uid, at('2026-03-03T01:00:00'));
    expect(await days(uid)).toBe(2);
  });

  it('manquer des jours ne retire rien ; le compteur ne baisse JAMAIS (garde-fou en base)', async () => {
    const uid = await createUser({ balance: 0 });
    clearActiveDayCache();
    await recordActiveDay(uid, at('2026-03-02T09:00:00'));
    await recordActiveDay(uid, at('2026-06-15T09:00:00'));                  // 3 mois plus tard
    expect(await days(uid)).toBe(2);
    await expect(query('UPDATE users SET active_days = active_days - 1 WHERE id = $1', [uid])).rejects.toThrow(/ne peut pas baisser/);
    await expect(query('UPDATE users SET active_days = 0 WHERE id = $1', [uid])).rejects.toThrow();
    expect(await days(uid)).toBe(2);
    await query('UPDATE users SET active_days = active_days + 5 WHERE id = $1', [uid]);   // monter reste possible (correction d'un administrateur)
    expect(await days(uid)).toBe(7);
  });

  it('une requête du joueur compte le jour ; une session d\'impersonation par l\'administration ne compte pas', async () => {
    const uid = await createUser({ balance: 0 });
    const admin = await createUser({ balance: 0 });
    clearActiveDayCache();
    const imp = `Bearer ${generateImpersonationToken(uid, `${uid}@test.local`, admin)}`;
    expect((await request(app).get('/api/v1/economy/balance').set('Authorization', imp)).status).toBe(200);
    expect(await days(uid)).toBe(0);
    const own = `Bearer ${generateToken(uid, `${uid}@test.local`)}`;
    expect((await request(app).get('/api/v1/economy/balance').set('Authorization', own)).status).toBe(200);
    expect(await days(uid)).toBe(1);
    expect((await request(app).get('/api/v1/economy/balance').set('Authorization', own)).status).toBe(200);
    expect(await days(uid)).toBe(1);
  });
});
