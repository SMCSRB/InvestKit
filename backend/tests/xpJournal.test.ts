// 6a, PR 1 : journal d'XP serveur, niveaux à titres, import de l'existant, plafonds, correction d'abus.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { EDUCATION_QUIZZES } from '../src/data/educationQuizzes';
import { levelInfo, LEVEL_THRESHOLDS, LEVEL_TITLES, titleForLevel, XP_DAILY_CAPS } from '../src/config/levelRules';
import { xpService, XpError } from '../src/services/xpService';
import { educationAbuseService } from '../src/services/educationAbuseService';

const auth = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const good = (domainId: string, scope: string) => Object.fromEntries(EDUCATION_QUIZZES[domainId].chapters[scope].questions.map((q) => [q.id, q.correct]));

describe('niveaux et titres (règle pure)', () => {
  it('courbe strictement croissante, 25 niveaux, un titre par palier', () => {
    expect(LEVEL_THRESHOLDS.length).toBe(25);
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]);
    expect(LEVEL_THRESHOLDS[0]).toBe(0);
    expect(LEVEL_TITLES.map((t) => t.title)).toEqual(['Curieux', 'Apprenti', 'Initié', 'Investisseur', 'Stratège', 'Expert', 'Maître']);
  });
  it('niveau et titre selon l\'XP ; progression vers le suivant ; dernier niveau sans suite', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, title: 'Curieux', xpIntoLevel: 0, xpForNext: 100, nextLevel: 2 });
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100)).toMatchObject({ level: 2, xpIntoLevel: 0 });
    expect(levelInfo(250).title).toBe('Apprenti');                      // niveau 3
    expect(levelInfo(2500)).toMatchObject({ level: 9, title: 'Investisseur' });   // tout le contenu actuel (2 500 XP)
    expect(levelInfo(38600)).toMatchObject({ level: 25, title: 'Maître', xpForNext: null, nextLevel: null, nextTitle: null });
    expect(levelInfo(9_999_999).level).toBe(25);
    expect(titleForLevel(11)).toBe('Investisseur');
    expect(titleForLevel(12)).toBe('Stratège');
  });
  it('valeurs absurdes : jamais NaN, jamais négatif', () => {
    for (const v of [NaN, -5, Infinity, -Infinity, 1.9]) { const i = levelInfo(v as number); expect(i.level).toBeGreaterThanOrEqual(1); expect(Number.isNaN(i.xp)).toBe(false); }
    expect(levelInfo(-50).xp).toBe(0);
  });
});

describe.skipIf(!hasDb)('journal d\'XP (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('un gain est enregistré une seule fois par clé, même en parallèle (deux onglets)', async () => {
    const u = await createUser();
    const g = { domain: 'education' as const, source: 'quiz', key: 'quiz:crypto:1', amount: 100 };
    const rs = await Promise.all([xpService.grant(u, g), xpService.grant(u, g), xpService.grant(u, g), xpService.grant(u, g)]);
    expect(rs.filter((r) => r.reason === 'ok').length).toBe(1);
    expect(rs.filter((r) => r.reason === 'duplicate').length).toBe(3);
    expect((await xpService.totals(u)).total).toBe(100);
  });

  it('XP globale = somme de tout ; XP par domaine recalculée ; niveau serveur', async () => {
    const u = await createUser();
    await xpService.grant(u, { domain: 'education', source: 'quiz', key: 'a', amount: 100 });
    await xpService.grant(u, { domain: 'education', source: 'domain_final', key: 'b', amount: 500 });
    await xpService.grant(u, { domain: 'bourse', source: 'first_trade', key: 'c', amount: 50 });
    const t = await xpService.totals(u);
    expect(t.total).toBe(650);
    expect(t.byDomain).toMatchObject({ education: 600, bourse: 50, crypto: 0 });
    const me = await xpService.me(u);
    expect(me).toMatchObject({ level: 4, title: 'Apprenti', xp: 650 });
    expect(me.domains.map((d: any) => d.domain).sort()).toEqual(['bourse', 'education']);   // seulement les domaines où il y a de l'XP
  });

  it('plafond quotidien : au-delà, aucune XP et aucune erreur ; une clé déjà vue reste un doublon', async () => {
    const u = await createUser();
    const cap = XP_DAILY_CAPS.lesson;
    const r1 = await xpService.grant(u, { domain: 'education', source: 'lesson', key: 'l1', amount: cap - 20 });
    expect(r1).toEqual({ granted: cap - 20, reason: 'ok' });
    const r2 = await xpService.grant(u, { domain: 'education', source: 'lesson', key: 'l2', amount: 100 });
    expect(r2).toEqual({ granted: 20, reason: 'ok' });                                    // tronqué au reste du plafond
    const r3 = await xpService.grant(u, { domain: 'education', source: 'lesson', key: 'l3', amount: 50 });
    expect(r3).toEqual({ granted: 0, reason: 'capped' });
    expect((await xpService.totals(u)).total).toBe(cap);
    // le plafond est par source : une autre source n'est pas touchée
    expect((await xpService.grant(u, { domain: 'education', source: 'mini_question', key: 'm1', amount: 10 })).reason).toBe('ok');
  });

  it('entrées invalides refusées ; jamais de montant négatif ou énorme', async () => {
    const u = await createUser();
    for (const bad of [
      { domain: 'inconnu', source: 'quiz', key: 'k', amount: 10 }, { domain: 'education', source: 'Quiz!', key: 'k', amount: 10 },
      { domain: 'education', source: 'quiz', key: '', amount: 10 }, { domain: 'education', source: 'quiz', key: 'k', amount: -5 },
      { domain: 'education', source: 'quiz', key: 'k', amount: 0 }, { domain: 'education', source: 'quiz', key: 'k', amount: 1.5 },
      { domain: 'education', source: 'quiz', key: 'k', amount: 10_000_000 }, { domain: 'education', source: 'quiz', key: 'x'.repeat(200), amount: 10 },
    ]) await expect(xpService.grant(u, bad as any)).rejects.toBeInstanceOf(XpError);
    expect((await xpService.totals(u)).total).toBe(0);
  });

  it('la validation d\'un chapitre écrit le même montant dans le journal, une seule fois (double clic compris)', async () => {
    const u = await createUser();
    const body = { domainId: 'crypto', scope: '1', answers: good('crypto', '1') };
    const send = () => request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u)).send(body);
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status].sort()).toEqual([200, 200]);
    const progress = (await query('SELECT xp_earned FROM education_progress WHERE user_id = $1', [u])).rows;
    expect(progress.length).toBe(1);
    const events = (await query('SELECT amount, source, domain FROM xp_events WHERE user_id = $1', [u])).rows;
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({ amount: progress[0].xp_earned, source: 'quiz', domain: 'education' });
  });

  it('un client qui envoie son XP, son niveau ou un badge : ignoré (quiz raté = rien ; quiz réussi = XP décidée par le serveur)', async () => {
    const u = await createUser();
    const ratee = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u))
      .send({ domainId: 'crypto', scope: '2', answers: Object.fromEntries(Object.keys(good('crypto', '2')).map((k) => [k, 'faux'])), xpEarned: 99999, level: 50, badges: ['x'] });
    expect(ratee.status).toBe(400);
    expect((await xpService.totals(u)).total).toBe(0);
    const reussie = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u))
      .send({ domainId: 'crypto', scope: '2', answers: good('crypto', '2'), xpEarned: 99999, score: 100, level: 50, badges: ['x'] });
    expect(reussie.status).toBe(200);
    const total = (await xpService.totals(u)).total;
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(500);                                               // jamais les 99 999 envoyés par le client
  });

  it('GET /xp : lecture de MON XP uniquement, authentification obligatoire', async () => {
    const u = await createUser();
    await xpService.grant(u, { domain: 'education', source: 'quiz', key: 'k', amount: 120 });
    expect((await request(app).get('/api/v1/xp')).status).toBe(401);
    const res = await request(app).get('/api/v1/xp').set('Authorization', auth(u));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ level: 2, title: 'Curieux', xp: 120 });
    expect(res.body.recent.length).toBe(1);
  });

  it('import de l\'existant : une ligne d\'éducation déjà enregistrée = un événement du même montant (plafonné à 500), sans doublon au rejeu', async () => {
    const u = await createUser();
    await query(`INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned, coins_earned) VALUES ($1, 'crypto', 'old1', 100, 0), ($1, 'crypto', 'old2', 5000, 0), ($1, 'crypto', 'old3', 0, 0)`, [u]);
    const migration = (await import('fs')).readFileSync(require('path').join(__dirname, '../migrations/048_xp_events.sql'), 'utf8');
    const importSql = migration.slice(migration.indexOf('INSERT INTO xp_events'));
    await query(importSql);
    await query(importSql);                                                               // rejeu : aucun doublon
    const events = (await query(`SELECT amount FROM xp_events WHERE user_id = $1 AND source = 'legacy_import' ORDER BY amount`, [u])).rows.map((r: any) => r.amount);
    expect(events).toEqual([100, 500]);                                                   // 5000 plafonné à 500 ; XP nulle non importée
  });

  it('correction d\'abus : l\'XP des lignes invalides est retirée du journal, jamais celle des lignes valides', async () => {
    const u = await createUser({ balance: 1000 });
    const validChapter = Object.keys(EDUCATION_QUIZZES.crypto.chapters)[0];
    const ok = (await query(`INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned, coins_earned) VALUES ($1, 'crypto', $2, 100, 20) RETURNING id`, [u, validChapter])).rows[0].id;
    const bad = (await query(`INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned, coins_earned) VALUES ($1, 'inventé', 'x9', 300, 20) RETURNING id`, [u])).rows[0].id;
    await xpService.grant(u, { domain: 'education', source: 'legacy_import', key: `ep:${ok}`, amount: 100 });
    await xpService.grant(u, { domain: 'education', source: 'legacy_import', key: `ep:${bad}`, amount: 300 });
    expect((await xpService.totals(u)).total).toBe(400);
    await educationAbuseService.correct(u);
    expect((await xpService.totals(u)).total).toBe(100);
  });

  it('suppression de compte : le journal disparaît avec le joueur (cascade) ; l\'export le contient', async () => {
    const u = await createUser();
    await xpService.grant(u, { domain: 'education', source: 'quiz', key: 'k', amount: 10 });
    const { exportUserData } = await import('../src/services/accountService');
    const data: any = await exportUserData(u);
    expect(data.xp.length).toBe(1);
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect((await query('SELECT 1 FROM xp_events WHERE user_id = $1', [u])).rows.length).toBe(0);
  });
});
