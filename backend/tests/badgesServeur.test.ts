// 6a, PR 2 : badges attribués par le serveur, conditions testées une par une, notification unique, rareté réelle.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { EDUCATION_QUIZZES } from '../src/data/educationQuizzes';
import { EDUCATION_CATALOG } from '../src/data/educationCatalog';
import { BADGES, BADGE_BY_ID, RARITY_MIN_PLAYERS, BadgeFacts } from '../src/config/badgeRules';
import { badgeService, gatherFacts } from '../src/services/badgeService';
import { xpService } from '../src/services/xpService';

const auth = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const good = (domainId: string, scope: string) => Object.fromEntries((scope === 'final' ? EDUCATION_QUIZZES[domainId].final : EDUCATION_QUIZZES[domainId].chapters[scope]).questions.map((q) => [q.id, q.correct]));
const baseFacts: BadgeFacts = { chaptersDone: 0, domainsCompleted: [], tradedStocks: false, tradedCrypto: false, boughtProperty: false, activeDays: 0, loansRepaid: 0, friends: 0, inGuild: false, level: 1 };

describe('règles de badges (conditions pures)', () => {
  it('identifiants uniques, aucun badge sans règle, raretés connues, aucune pièce promise', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(['commun', 'rare', 'epique', 'legendaire']).toContain(b.rarity);
      expect(typeof b.condition(baseFacts)).toBe('boolean');
      expect(b.coins).toBe(0);
      expect(b.xp).toBeGreaterThan(0);
      expect(b.factRef(baseFacts).length).toBeGreaterThan(0);
    }
    expect(BADGE_BY_ID.first_lesson).toBeDefined();
  });
  it('un joueur sans aucun fait n\'a aucun badge', () => { expect(BADGES.filter((b) => b.condition(baseFacts))).toEqual([]); });
  it('chaque badge se débloque avec son fait, et pas avant (seuils testés un par un)', () => {
    const cases: [string, Partial<BadgeFacts>, Partial<BadgeFacts>][] = [
      ['first_lesson', { chaptersDone: 1 }, { chaptersDone: 0 }], ['five_lessons', { chaptersDone: 5 }, { chaptersDone: 4 }], ['ten_lessons', { chaptersDone: 10 }, { chaptersDone: 9 }],
      ['domain_crypto', { domainsCompleted: ['crypto'] }, { domainsCompleted: ['stocks'] }], ['domain_stocks', { domainsCompleted: ['stocks'] }, {}],
      ['domain_real_estate', { domainsCompleted: ['real_estate'] }, {}], ['domain_crypto_market', { domainsCompleted: ['crypto_market'] }, {}],
      ['first_stock_trade', { tradedStocks: true }, {}], ['first_crypto_trade', { tradedCrypto: true }, {}], ['first_property', { boughtProperty: true }, {}],
      ['three_domains', { tradedStocks: true, tradedCrypto: true, boughtProperty: true }, { tradedStocks: true, tradedCrypto: true }],
      ['active_5', { activeDays: 5 }, { activeDays: 4 }], ['active_30', { activeDays: 30 }, { activeDays: 29 }], ['active_100', { activeDays: 100 }, { activeDays: 99 }],
      ['first_loan_repaid', { loansRepaid: 1 }, {}], ['first_friend', { friends: 1 }, {}], ['guild_member', { inGuild: true }, {}],
      ['level_5', { level: 5 }, { level: 4 }], ['level_9', { level: 9 }, { level: 8 }],
    ];
    for (const [id, yes, no] of cases) {
      expect(BADGE_BY_ID[id].condition({ ...baseFacts, ...yes }), `${id} avec son fait`).toBe(true);
      expect(BADGE_BY_ID[id].condition({ ...baseFacts, ...no }), `${id} sans son fait`).toBe(false);
    }
    expect(cases.length).toBe(BADGES.length);   // aucun badge sans test
  });
});

describe.skipIf(!hasDb)('badges attribués par le serveur (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('un compte neuf n\'a aucun badge ; rien n\'est donné sans fait du serveur', async () => {
    const u = await createUser();
    expect(await badgeService.evaluate(u)).toEqual([]);
    const res = await request(app).get('/api/v1/xp/badges').set('Authorization', auth(u));
    expect(res.status).toBe(200);
    expect(res.body.badges.filter((b: any) => b.earned)).toEqual([]);
    expect(res.body.badges.length).toBe(BADGES.length);
  });

  it('valider un chapitre : badge « Première leçon », XP du badge, une seule notification, et rien au second passage', async () => {
    const u = await createUser();
    const r = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u)).send({ domainId: 'crypto', scope: '1', answers: good('crypto', '1') });
    expect(r.status).toBe(200);
    expect(r.body.newBadges).toContain('first_lesson');
    expect((await query('SELECT badge_id FROM user_badges WHERE user_id = $1', [u])).rows.map((x: any) => x.badge_id)).toContain('first_lesson');
    const notifs = (await query(`SELECT title FROM notifications WHERE user_id = $1 AND kind = 'badge'`, [u])).rows;
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toContain('Première leçon');
    // XP du badge : une ligne du journal, clé « badge:first_lesson »
    expect((await query(`SELECT amount FROM xp_events WHERE user_id = $1 AND source = 'badge' AND event_key = 'badge:first_lesson'`, [u])).rows[0].amount).toBe(BADGE_BY_ID.first_lesson.xp);
    // Second passage (lecture, rejeu) : rien de nouveau, pas de seconde notification
    expect(await badgeService.evaluate(u)).toEqual([]);
    await request(app).get('/api/v1/xp/badges').set('Authorization', auth(u));
    expect((await query(`SELECT 1 FROM notifications WHERE user_id = $1 AND kind = 'badge'`, [u])).rows.length).toBe(1);
  });

  it('évaluations simultanées : un badge n\'est donné qu\'une fois, une seule notification, une seule XP', async () => {
    const u = await createUser({ activeDays: 5 });
    const results = await Promise.all([badgeService.evaluate(u), badgeService.evaluate(u), badgeService.evaluate(u), badgeService.evaluate(u)]);
    expect(results.flat().filter((id) => id === 'active_5').length).toBe(1);
    expect((await query(`SELECT 1 FROM user_badges WHERE user_id = $1 AND badge_id = 'active_5'`, [u])).rows.length).toBe(1);
    expect((await query(`SELECT 1 FROM notifications WHERE user_id = $1 AND kind = 'badge' AND title LIKE '%5 jours%'`, [u])).rows.length).toBe(1);
    expect((await query(`SELECT 1 FROM xp_events WHERE user_id = $1 AND event_key = 'badge:active_5'`, [u])).rows.length).toBe(1);
  });

  it('les faits viennent du serveur : jours actifs, amitié, guilde, achat', async () => {
    const u = await createUser({ activeDays: 30 });
    const f = await gatherFacts(u);
    expect(f).toMatchObject({ activeDays: 30, friends: 0, inGuild: false, tradedStocks: false, tradedCrypto: false, boughtProperty: false, chaptersDone: 0 });
    const got = await badgeService.evaluate(u);
    expect(got).toEqual(expect.arrayContaining(['active_5', 'active_30']));
    expect(got).not.toContain('active_100');
  });

  it('les récompenses d\'XP peuvent débloquer un badge de niveau (évaluation en cascade bornée)', async () => {
    const u = await createUser();
    await xpService.grant(u, { domain: 'education', source: 'quiz', key: 'seed', amount: 690 });   // niveau 4 (700 = niveau 5) : le badge « Première leçon » ne s'applique pas sans chapitre
    expect((await gatherFacts(u)).level).toBe(4);
    await xpService.grant(u, { domain: 'education', source: 'quiz', key: 'seed2', amount: 10 });
    expect(await badgeService.evaluate(u)).toContain('level_5');
  });

  it('un client qui envoie un badge : ignoré (aucune route d\'écriture de badge)', async () => {
    const u = await createUser();
    const res = await request(app).post('/api/v1/xp/badges').set('Authorization', auth(u)).send({ badge: 'level_9' });
    expect([404, 405]).toContain(res.status);
    expect((await query('SELECT 1 FROM user_badges WHERE user_id = $1', [u])).rows.length).toBe(0);
  });

  it('rareté : masquée sous 50 joueurs ; au-delà, calculée sur les vrais joueurs', async () => {
    const u = await createUser({ activeDays: 5 });
    await badgeService.evaluate(u);
    const total = Number((await query('SELECT COUNT(*)::int AS n FROM users WHERE verified IS TRUE')).rows[0].n);
    const first = await badgeService.list(u);
    if (total < RARITY_MIN_PLAYERS) expect(first.badges.every((b: any) => b.rarityPct === null)).toBe(true);
    for (let i = 0; i < RARITY_MIN_PLAYERS; i++) await createUser();
    const second = await badgeService.list(u);
    const a5 = second.badges.find((b: any) => b.id === 'active_5')!;
    expect(a5.rarityPct).not.toBeNull();
    expect(a5.rarityPct!).toBeGreaterThan(0);
    expect(a5.rarityPct!).toBeLessThanOrEqual(100);
    expect(second.badges.find((b: any) => b.id === 'ten_lessons')!.rarityPct).toBe(0);   // personne ne l'a : 0 %, pas un chiffre inventé
  });

  it('suppression de compte : les badges disparaissent ; export de compte les contient', async () => {
    const u = await createUser({ activeDays: 5 });
    await badgeService.evaluate(u);
    const { exportUserData } = await import('../src/services/accountService');
    expect(((await exportUserData(u)) as any).badges.length).toBeGreaterThan(0);
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect((await query('SELECT 1 FROM user_badges WHERE user_id = $1', [u])).rows.length).toBe(0);
  });

  it('un domaine terminé donne son badge de parcours (quiz final réussi après tous les chapitres)', async () => {
    const u = await createUser();
    const chapters = EDUCATION_CATALOG.crypto_market;
    for (const c of chapters) await request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u)).send({ domainId: 'crypto_market', scope: c, answers: good('crypto_market', c) });
    const fin = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u)).send({ domainId: 'crypto_market', scope: 'final', answers: good('crypto_market', 'final') });
    expect(fin.status).toBe(200);
    expect(fin.body.newBadges).toContain('domain_crypto_market');
  });
});
