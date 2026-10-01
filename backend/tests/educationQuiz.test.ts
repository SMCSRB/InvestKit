import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { EDUCATION_CATALOG } from '../src/data/educationCatalog';
import { EDUCATION_QUIZZES } from '../src/data/educationQuizzes';
// @ts-ignore : fichier JavaScript partagé avec le site
import { optionId } from '../../data/quizIds.js';

const ROOT = join(__dirname, '../..');
const auth = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const goodAnswers = (domainId: string, scope: string) => {
  const spec = scope === 'final' ? EDUCATION_QUIZZES[domainId].final : EDUCATION_QUIZZES[domainId].chapters[scope];
  return Object.fromEntries(spec.questions.map((q) => [q.id, q.correct]));
};
const wrongAnswers = (domainId: string, scope: string) => {
  const spec = scope === 'final' ? EDUCATION_QUIZZES[domainId].final : EDUCATION_QUIZZES[domainId].chapters[scope];
  return Object.fromEntries(spec.questions.map((q) => [q.id, q.options.find((o) => o !== q.correct)!]));
};
const submit = (u: string, body: object) => request(app).post('/api/v1/education/submit-quiz').set('Authorization', auth(u)).send(body);

describe('quiz : identifiants d\'options (indépendants de l\'ordre d\'affichage)', () => {
  it('l\'identifiant d\'une option ne dépend que de son texte, pas de sa position', () => {
    const opts = ['Oui', 'Non', 'Peut-être', 'Jamais'];
    const ids = opts.map((t) => optionId('d', '1', '2', t));
    expect(new Set(ids).size).toBe(4);
    const shuffled = [opts[2], opts[0], opts[3], opts[1]];
    expect(shuffled.map((t) => optionId('d', '1', '2', t))).toEqual([ids[2], ids[0], ids[3], ids[1]]);
  });
  it('dans le catalogue serveur, la bonne réponse n\'est plus « la première » : elle est repérée par identifiant', () => {
    for (const [domainId, d] of Object.entries(EDUCATION_QUIZZES)) {
      const all = [...Object.values(d.chapters), d.final];
      for (const spec of all) for (const q of spec.questions) {
        expect(q.options, `${domainId}/${q.id}`).toContain(q.correct);
        expect(new Set(q.options).size).toBe(q.options.length);
        expect(q.correct).toMatch(/^o[0-9a-z]+$/);
      }
    }
  });
  it('le catalogue des quiz couvre exactement les chapitres du catalogue des récompenses', () => {
    for (const [domainId, chapters] of Object.entries(EDUCATION_CATALOG)) expect(Object.keys(EDUCATION_QUIZZES[domainId].chapters).sort()).toEqual([...chapters].sort());
  });
});

describe('quiz : l\'interface mélange les réponses et ne corrige plus elle-même', () => {
  const chapter = readFileSync(join(ROOT, 'app/education/[domain]/[chapter]/page.jsx'), 'utf8');
  const final = readFileSync(join(ROOT, 'app/education/[domain]/final-quiz/page.jsx'), 'utf8');
  const lib = readFileSync(join(ROOT, 'app/lib/quiz.js'), 'utf8');
  it('chapitres et quiz final : ordre des options mélangé à chaque tentative, réponse envoyée par identifiant, correction par le serveur', () => {
    for (const page of [chapter, final]) {
      expect(page).toContain('shuffleOptions');
      expect(page).toContain('submitQuiz');
      expect(page).not.toMatch(/=== q\.correct|=== question\.correct/);   // plus de correction côté navigateur
    }
    expect(lib).toMatch(/Math\.random/);
    expect(lib).toContain('optionId');
  });
});

describe.skipIf(!hasDb)('quiz : correction par le serveur, récompense unique, plafonds', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });

  it('refuse les requêtes invalides : domaine/chapitre inconnus, réponses manquantes, positions au lieu d\'identifiants, option d\'une autre question', async () => {
    const u = await createUser({ balance: 0 });
    const good = goodAnswers('crypto', '1');
    const bads: object[] = [
      { domainId: 'inventé', scope: '1', answers: good }, { domainId: '__proto__', scope: '1', answers: good }, { domainId: 'crypto', scope: '9999', answers: good },
      { domainId: 'crypto', scope: 'constructor', answers: good }, { domainId: 'crypto', scope: '1' }, { domainId: 'crypto', scope: '1', answers: [] },
      { domainId: 'crypto', scope: '1', answers: {} },
      { domainId: 'crypto', scope: '1', answers: Object.fromEntries(Object.keys(good).map((k) => [k, 0])) },     // positions : refusées
      { domainId: 'crypto', scope: '1', answers: Object.fromEntries(Object.keys(good).map((k) => [k, '0'])) },
      { domainId: 'crypto', scope: '1', answers: { ...good, '1': goodAnswers('crypto', '2')['1'] } },          // option d'une autre question
    ];
    for (const b of bads) expect((await submit(u, b)).status, JSON.stringify(b).slice(0, 80)).toBe(400);
    const { '1': _drop, ...partial } = good;
    expect((await submit(u, { domainId: 'crypto', scope: '1', answers: partial })).status).toBe(400);       // une question sans réponse
    expect(await balanceOf(u)).toBe(0);
    expect((await query('SELECT COUNT(*)::int AS n FROM education_progress WHERE user_id = $1', [u])).rows[0].n).toBe(0);
  });

  it('un quiz raté ne rapporte rien et ne révèle pas les bonnes options ; la réussite rapporte une seule fois', async () => {
    const u = await createUser({ balance: 0 });
    const fail = await submit(u, { domainId: 'crypto', scope: '1', answers: wrongAnswers('crypto', '1'), score: 100, xpEarned: 999999 });
    expect(fail.status).toBe(200);
    expect(fail.body.passed).toBe(false);
    expect(fail.body.rewarded).toBe(false);
    expect(fail.body.results.every((r: any) => r.correct === false && r.correctOptionId === undefined)).toBe(true);
    expect(await balanceOf(u)).toBe(0);

    const ok = await submit(u, { domainId: 'crypto', scope: '1', answers: goodAnswers('crypto', '1'), score: 5 });
    expect(ok.body.passed).toBe(true); expect(ok.body.score).toBe(100); expect(ok.body.rewarded).toBe(true); expect(ok.body.coinsEarned).toBe(20);
    expect(ok.body.results.every((r: any) => r.correct && typeof r.correctOptionId === 'string')).toBe(true);
    expect(await balanceOf(u)).toBe(20);
    const row = (await query('SELECT score, xp_earned, coins_earned FROM education_progress WHERE user_id = $1', [u])).rows[0];
    expect(row.score).toBe(100);                  // le score vient du serveur, pas du client
    expect(row.xp_earned).toBe(100);

    for (let i = 0; i < 3; i++) {                 // tentatives répétées sur un chapitre déjà validé : rien de plus
      const again = await submit(u, { domainId: 'crypto', scope: '1', answers: goodAnswers('crypto', '1') });
      expect(again.body.rewarded).toBe(false); expect(again.body.coinsEarned).toBe(0);
    }
    expect(await balanceOf(u)).toBe(20);
  });

  it('seuil de réussite : juste en dessous = raté, au seuil = réussi (score calculé par le serveur)', async () => {
    const u = await createUser({ balance: 0 });
    const spec = EDUCATION_QUIZZES.crypto.chapters['2'];
    const need = Math.ceil((spec.passingScore / 100) * spec.questions.length);
    const mix = (nGood: number) => Object.fromEntries(spec.questions.map((q, i) => [q.id, i < nGood ? q.correct : q.options.find((o) => o !== q.correct)!]));
    const below = await submit(u, { domainId: 'crypto', scope: '2', answers: mix(need - 1) });
    expect(below.body.passed).toBe(false); expect(await balanceOf(u)).toBe(0);
    const at = await submit(u, { domainId: 'crypto', scope: '2', answers: mix(need) });
    expect(at.body.passed).toBe(true); expect(await balanceOf(u)).toBe(20);
  });

  it('quiz final : refusé tant que tous les chapitres ne sont pas validés ; puis récompense unique ; plafond total respecté', async () => {
    const u = await createUser({ balance: 0 });
    const early = await submit(u, { domainId: 'crypto_market', scope: 'final', answers: goodAnswers('crypto_market', 'final') });
    expect(early.status).toBe(409); expect(early.body.code).toBe('CHAPTERS_MISSING');
    expect(await balanceOf(u)).toBe(0);
    for (const c of EDUCATION_CATALOG.crypto_market) expect((await submit(u, { domainId: 'crypto_market', scope: c, answers: goodAnswers('crypto_market', c) })).body.rewarded).toBe(true);
    expect(await balanceOf(u)).toBe(EDUCATION_CATALOG.crypto_market.length * 20);
    const fin = await submit(u, { domainId: 'crypto_market', scope: 'final', answers: goodAnswers('crypto_market', 'final') });
    expect(fin.body.rewarded).toBe(true); expect(fin.body.coinsEarned).toBe(100);
    const finAgain = await submit(u, { domainId: 'crypto_market', scope: 'final', answers: goodAnswers('crypto_market', 'final') });
    expect(finAgain.body.rewarded).toBe(false);
    expect(await balanceOf(u)).toBe(EDUCATION_CATALOG.crypto_market.length * 20 + 100);
  });

  it('plafond absolu : tout refaire plusieurs fois ne dépasse jamais (chapitres × 20) + (domaines × 100)', async () => {
    const u = await createUser({ balance: 0 });
    for (let pass = 0; pass < 2; pass++) {
      for (const [domainId, chapters] of Object.entries(EDUCATION_CATALOG)) {
        for (const c of chapters) await submit(u, { domainId, scope: c, answers: goodAnswers(domainId, c) });
        await submit(u, { domainId, scope: 'final', answers: goodAnswers(domainId, 'final') });
      }
    }
    const cap = Object.values(EDUCATION_CATALOG).reduce((n, ch) => n + ch.length * 20 + 100, 0);
    expect(await balanceOf(u)).toBe(cap);
    const ledger = (await query(`SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1 AND reason IN ('quiz_chapter','quiz_domain_complete')`, [u])).rows[0].s;
    expect(ledger).toBe(cap);
  });

  it('martelage : au-delà de 20 tentatives en 10 minutes, le serveur répond 429 (par joueur)', async () => {
    const u = await createUser({ balance: 0 });
    const wrong = wrongAnswers('crypto', '3');
    let last = 200;
    for (let i = 0; i < 22; i++) last = (await submit(u, { domainId: 'crypto', scope: '3', answers: wrong })).status;
    expect(last).toBe(429);
    const other = await createUser({ balance: 0 });                       // un autre joueur n'est pas touché
    expect((await submit(other, { domainId: 'crypto', scope: '3', answers: wrong })).status).toBe(200);
  });
});
