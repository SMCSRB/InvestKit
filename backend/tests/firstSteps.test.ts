import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query, getClient } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId } from './helpers';
import { tradingService } from '../src/services/tradingService';
import { realEstateService as svc } from '../src/services/realEstateService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as crypto } from '../src/services/crypto/tradingService';
import { grantFirstStep, firstStepsState } from '../src/services/firstStepsService';
import { EDUCATION_QUIZZES } from '../src/data/educationQuizzes';
import { EDUCATION_CATALOG } from '../src/data/educationCatalog';
import { FIRST_STEP_BONUSES, FIRST_STEPS_TOTAL_COINS, FIRST_STEP_MIN_INVESTMENT_COINS, EDUCATION_CHAPTER_COINS, EDUCATION_DOMAIN_COMPLETE_COINS } from '../src/config/economy';

const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const goodAnswers = (domainId: string, scope: string) => {
  const d = (EDUCATION_QUIZZES as any)[domainId]; const spec = scope === 'final' ? d.final : d.chapters[scope];
  return Object.fromEntries(spec.questions.map((q: any) => [q.id, q.correct]));
};
const submit = (id: string, domainId: string, scope: string) =>
  request(app).post('/api/v1/education/submit-quiz').set('Authorization', tok(id)).send({ domainId, scope, answers: goodAnswers(domainId, scope) });
const bonusRows = async (id: string) => (await query(`SELECT amount, nature, domain, metadata FROM investcoins_transactions WHERE user_id = $1 AND reason = 'first_step_bonus' ORDER BY id`, [id])).rows;

describe('bonus premiers pas : règles', () => {
  it('30 / 30 / 40 : environ 100 au total, modifiables dans economy.ts', () => {
    expect(FIRST_STEP_BONUSES).toEqual({ first_investment: 30, first_lesson: 30, first_quiz: 40 });
    expect(FIRST_STEPS_TOTAL_COINS).toBe(100);
    expect(FIRST_STEP_MIN_INVESTMENT_COINS).toBe(100);
  });
});

describe.skipIf(!hasDb)('bonus premiers pas (base réelle)', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); }, 120_000);
  afterAll(teardownDb);

  const stockSymbol = async (id: string) => {
    const view = await tradingService.getPortfolioView(id, 'stocks');
    return Object.keys(view.prices).find((s) => view.prices[s] !== null)!;
  };

  it('premier investissement en Bourse : +30 une seule fois, au registre (création de pièces, motif first_step_bonus)', async () => {
    const id = await createUser({ balance: 5000, freeDomain: 'stocks', firstStepsPending: true });
    const symbol = await stockSymbol(id);
    const price = (await tradingService.getPortfolioView(id, 'stocks')).prices[symbol]!;
    const q = Math.ceil(300 / price);
    const r1: any = await tradingService.buy(id, 'stocks', symbol, q);
    expect(await balanceOf(id)).toBe(5000 - r1.cost - r1.fee + 30);
    expect(await bonusRows(id)).toEqual([{ amount: 30, nature: 'creation', domain: null, metadata: { step: 'first_investment' } }]);
    const r2: any = await tradingService.buy(id, 'stocks', symbol, q);
    expect(await balanceOf(id)).toBe(5000 - r1.cost - r1.fee - r2.cost - r2.fee + 30);          // pas de second bonus
    expect(await bonusRows(id)).toHaveLength(1);
    expect((await firstStepsState(id)).steps.find((s) => s.key === 'first_investment')).toMatchObject({ earned: true, coins: 30 });
  });

  it('achat symbolique (moins de 100) : aucun bonus ; un vrai premier investissement ensuite : bonus', async () => {
    const id = await createUser({ balance: 5000, freeDomain: 'stocks', firstStepsPending: true });
    const symbol = await stockSymbol(id);
    const price = (await tradingService.getPortfolioView(id, 'stocks')).prices[symbol]!;
    await tradingService.buy(id, 'stocks', symbol, 1);
    if (price < FIRST_STEP_MIN_INVESTMENT_COINS) {
      expect(await bonusRows(id)).toHaveLength(0);
      await tradingService.buy(id, 'stocks', symbol, Math.ceil(FIRST_STEP_MIN_INVESTMENT_COINS / price));
    }
    expect(await bonusRows(id)).toHaveLength(1);                      // jamais plus d'un bonus, et celui-ci arrive dès que le montant minimal est atteint
  });

  it('achats simultanés : le bonus n\'est versé qu\'une fois', async () => {
    const id = await createUser({ balance: 50_000, freeDomain: 'stocks', firstStepsPending: true });
    const symbol = await stockSymbol(id);
    const price = (await tradingService.getPortfolioView(id, 'stocks')).prices[symbol]!;
    const q = Math.ceil(200 / price);
    const rs = await Promise.allSettled(Array.from({ length: 8 }, () => tradingService.buy(id, 'stocks', symbol, q)));
    expect(rs.filter((r) => r.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);
    expect(await bonusRows(id)).toHaveLength(1);
  });

  it('premier chapitre validé : +30 (en plus des pièces du chapitre) ; le second chapitre n\'en donne plus', async () => {
    const id = await createUser({ balance: 0, firstStepsPending: true });
    const a = await submit(id, 'crypto_market', '1');
    expect(a.status).toBe(200); expect(a.body.passed).toBe(true);
    expect(a.body).toMatchObject({ coinsEarned: EDUCATION_CHAPTER_COINS, firstStepBonus: 30 });
    expect(a.body.balance).toBe(EDUCATION_CHAPTER_COINS + 30);
    expect(a.body.wallet.balance).toBe(EDUCATION_CHAPTER_COINS + 30);
    const b = await submit(id, 'crypto_market', '2');
    expect(b.body.firstStepBonus).toBe(0);
    expect(await balanceOf(id)).toBe(2 * EDUCATION_CHAPTER_COINS + 30);
    const again = await submit(id, 'crypto_market', '1');                       // rejouer : rien
    expect(again.body).toMatchObject({ rewarded: false, firstStepBonus: 0 });
    expect(await bonusRows(id)).toHaveLength(1);
  });

  it('premier quiz final réussi : +40 une fois ; quiz raté : aucun bonus', async () => {
    const id = await createUser({ balance: 0, firstStepsPending: true });
    const wrong = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', tok(id)).send({
      domainId: 'crypto_market', scope: '1',
      answers: Object.fromEntries(((EDUCATION_QUIZZES as any).crypto_market.chapters['1'].questions).map((q: any) => [q.id, q.options.find((o: string) => o !== q.correct)])),
    });
    expect(wrong.body.passed).toBe(false);
    expect(await bonusRows(id)).toHaveLength(0);
    for (const c of EDUCATION_CATALOG.crypto_market) await submit(id, 'crypto_market', c);
    const fin = await submit(id, 'crypto_market', 'final');
    expect(fin.body).toMatchObject({ passed: true, coinsEarned: EDUCATION_DOMAIN_COMPLETE_COINS, firstStepBonus: 40 });
    const rows = await bonusRows(id);
    expect(rows.map((r) => r.metadata.step).sort()).toEqual(['first_lesson', 'first_quiz']);
    expect(await balanceOf(id)).toBe(EDUCATION_CATALOG.crypto_market.length * EDUCATION_CHAPTER_COINS + EDUCATION_DOMAIN_COMPLETE_COINS + 30 + 40);
  });

  it('plafond : jamais plus de 100 au total par compte, même avec toutes les actions répétées ; clé inconnue refusée', async () => {
    const id = await createUser({ balance: 100_000, freeDomain: 'stocks', firstStepsPending: true });
    const symbol = await stockSymbol(id);
    const price = (await tradingService.getPortfolioView(id, 'stocks')).prices[symbol]!;
    for (let i = 0; i < 3; i++) await tradingService.buy(id, 'stocks', symbol, Math.ceil(300 / price));
    for (const c of EDUCATION_CATALOG.crypto_market) await submit(id, 'crypto_market', c);
    await submit(id, 'crypto_market', 'final');
    for (let i = 0; i < 5; i++) for (const k of Object.keys(FIRST_STEP_BONUSES)) await grantFirstStep(id, k as any);
    const total = (await bonusRows(id)).reduce((a, r) => a + r.amount, 0);
    expect(total).toBe(FIRST_STEPS_TOTAL_COINS);
    expect((await firstStepsState(id))).toMatchObject({ earnedCoins: 100, totalCoins: 100 });
    await expect(grantFirstStep(id, 'bonus_inventé' as any)).rejects.toThrow(/inconnu/);
    await expect(query(`INSERT INTO first_step_bonuses (user_id, step_key, coins) VALUES ($1, 'autre', 5)`, [id])).rejects.toThrow();
  });

  it('versements simultanés : une seule fois ; transaction annulée : ni clé ni pièces', async () => {
    const id = await createUser({ balance: 0, firstStepsPending: true });
    const rs = await Promise.all(Array.from({ length: 12 }, () => grantFirstStep(id, 'first_lesson')));
    expect(rs.filter((c) => c > 0)).toEqual([30]);
    expect(await balanceOf(id)).toBe(30);
    const other = await createUser({ balance: 0, firstStepsPending: true });
    const client = await getClient();
    try {
      await client.query('BEGIN');
      expect(await grantFirstStep(other, 'first_quiz', client as any)).toBe(40);
      await client.query('ROLLBACK');
    } finally { client.release(); }
    expect(await balanceOf(other)).toBe(0);
    expect((await firstStepsState(other)).earnedCoins).toBe(0);
  });

  it('API : état lisible par le serveur (futur guide), aucune route pour demander un bonus', async () => {
    const id = await createUser({ balance: 0, firstStepsPending: true });
    const anon = await request(app).get('/api/v1/economy/first-steps');
    expect(anon.status).toBe(401);
    const s0 = await request(app).get('/api/v1/economy/first-steps').set('Authorization', tok(id));
    expect(s0.status).toBe(200);
    expect(s0.body).toMatchObject({ earnedCoins: 0, totalCoins: 100, minInvestmentCoins: 100 });
    expect(s0.body.steps.map((s: any) => [s.key, s.coins, s.earned])).toEqual([['first_investment', 30, false], ['first_lesson', 30, false], ['first_quiz', 40, false]]);
    await submit(id, 'crypto_market', '1');
    const s1 = (await request(app).get('/api/v1/economy/first-steps').set('Authorization', tok(id))).body;
    expect(s1.steps.find((s: any) => s.key === 'first_lesson')).toMatchObject({ earned: true });
    expect(typeof s1.steps.find((s: any) => s.key === 'first_lesson').earnedAt).toBe('string');
    for (const path of ['/api/v1/economy/first-steps', '/api/v1/economy/first-step-bonus', '/api/v1/economy/claim-first-steps']) {
      const r = await request(app).post(path).set('Authorization', tok(id)).send({ step: 'first_quiz', coins: 9999 });
      expect([404, 405]).toContain(r.status);
    }
    expect(await balanceOf(id)).toBe(EDUCATION_CHAPTER_COINS + 30);
  });

  it('premier achat immobilier : +30 (apport ≥ 100), une seule fois', async () => {
    const id = await createUser({ balance: 200_000, freeDomain: 'real_estate', firstStepsPending: true });
    await svc.startGame(id, 'executive');
    let l: any;
    for (const x of await src.listListings(2010)) {
      if (x.age === 'old' && x.advertisedWorks === 0 && x.price > 50000 && x.price < 90000 && (await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; }
    }
    const down = Math.floor(l.price * 0.4);
    const prev: any = await svc.previewPurchase(id, { listingId: l.id, downPaymentCoins: down, months: 240 });
    await svc.purchase(id, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(await balanceOf(id)).toBe(200_000 - prev.coins.total + 30);
    expect(await bonusRows(id)).toHaveLength(1);
  });

  it('premier achat crypto (marché) : +30 si le montant atteint le minimum, une seule fois', async () => {
    const id = await createUser({ id: calmUserId(), balance: 100_000, tier: 'pro', firstStepsPending: true });
    await clockService.create(id, 'y2020');
    const r = await crypto.placeOrder(id, { clientOrderId: `fs-${Date.now()}`, symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '3' });
    const f = r.order!.fill!;
    const expected = f.notionalCoins >= FIRST_STEP_MIN_INVESTMENT_COINS ? 1 : 0;
    expect(await bonusRows(id)).toHaveLength(expected);
    expect(await balanceOf(id)).toBe(100_000 - f.notionalCoins - f.feeCoins + 30 * expected);
    await crypto.placeOrder(id, { clientOrderId: `fs2-${Date.now()}`, symbol: 'DEMO1', side: 'buy', type: 'market', quantity: '3' });
    expect(await bonusRows(id)).toHaveLength(expected);
  });
});
