import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, legacyCoins, minDownCoins } from './helpers';
import { query } from '../src/utils/db';
import { investcoinsRepository, InsufficientFundsError } from '../src/repositories/investcoinsRepository';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { getRealEstateLeaderboard, wealthMetrics } from '../src/services/realEstateSaleService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { bankService, BankError } from '../src/services/bankService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { bankProductRatePct, PERSONAL_LOAN } from '../src/config/bankRules';
import { EVENT_PARAMS } from '../src/config/immoRules';
import { computeNetPerformance, computePerformancePctFromEuros } from '../src/engine/immo';
import { EUROS_PER_COIN } from '../src/config/economy';

// Le seuil d'entrée au classement vaut RANKING_MIN_INVESTED en production ; ces tests vérifient le CLASSEMENT (rang, levier,
// instantané), pas le seuil : on le ramène à une valeur atteignable avec le capital de la partie de test.
vi.mock('../src/config/economy', async (orig) => ({ ...(await orig<typeof import('../src/config/economy')>()), RANKING_MIN_INVESTED: 100 }));


describe('prêt personnel : performance nette de dettes (règle pure)', () => {
  it('sans emprunt : identique à la formule d\'origine, levier ×1', () => {
    const base = { equity: 12000, cumulativeCashFlow: 800, invested: 10000 };
    const n = computeNetPerformance({ ...base, interestPaid: 0, borrowedInvested: 0 });
    expect(n.performancePct).toBeCloseTo(computePerformancePctFromEuros(base), 3);
    expect(n.leverage).toBe(1);
  });
  it('avec emprunt : gain diminué des intérêts, ramené au capital PROPRE, levier affiché', () => {
    const n = computeNetPerformance({ equity: 12000, cumulativeCashFlow: 0, invested: 10000, interestPaid: 500, borrowedInvested: 6000 });
    expect(n.ownCapital).toBe(4000);
    expect(n.leverage).toBe(2.5);
    expect(n.performancePct).toBeCloseTo(((12000 - 10000 - 500) / 4000) * 100, 2);
  });
  it('tout emprunté : plancher à 10 % du capital investi (levier ×10 au maximum)', () => {
    const n = computeNetPerformance({ equity: 11000, cumulativeCashFlow: 0, invested: 10000, interestPaid: 0, borrowedInvested: 10000 });
    expect(n.ownCapital).toBe(1000);
    expect(n.leverage).toBe(10);
  });
});

describe.skipIf(!hasDb)('prêt personnel (fléché Immobilier)', () => {
  beforeAll(async () => {
    await setupDb();
    for (const t of Object.values(EVENT_PARAMS.tenants)) { t.lateProbPerMonth = 0; t.defaultProbPerMonth = 0; t.tenureMonths = 1e9; }
    for (const k of Object.keys(EVENT_PARAMS.unexpectedWorks.probPerMonthByCondition)) (EVENT_PARAMS.unexpectedWorks.probPerMonthByCondition as any)[k] = 0;
    EVENT_PARAMS.damage.prob = 0;
  });
  afterAll(teardownDb);

  const player = async (opts: { profile?: 'student' | 'employee' | 'executive'; balance?: number; tier?: 'free' | 'pro'; freeDomain?: string | null; seed?: string } = {}) => {
    const uid = await createUser({ balance: opts.balance ?? legacyCoins(100), tier: opts.tier, freeDomain: opts.freeDomain === undefined ? 'real_estate' : opts.freeDomain, activeDays: 5 });
    await svc.startGame(uid, opts.profile ?? 'executive');
    if (opts.seed) await query('UPDATE re_games SET seed = $2 WHERE user_id = $1', [uid, opts.seed]);
    return uid;
  };
  const rejects = async (p: Promise<unknown>): Promise<any> => { try { await p; } catch (e) { return e; } throw new Error('aurait dû échouer'); };
  const cheap = (l: any) => l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 50000 && l.price < 90000;
  const goodListing = async () => { for (const x of await src.listListings(2010)) { if (cheap(x) && (await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) return x; } throw new Error('bien introuvable'); };
  const advance = async (uid: string, n: number) => { for (let i = 0; i < n; i++) await life.advanceTime(uid, 1); };

  it('plafonds par profil (6 mois de revenus), taux base + écart, plus cher que l\'immobilier ; décision expliquée', async () => {
    const caps: Record<string, number> = { student: legacyCoins(270), employee: legacyCoins(720), executive: legacyCoins(1350) };
    for (const profile of ['student', 'employee', 'executive'] as const) {
      const uid = await player({ profile });
      const q: any = await personal.quote(uid, { amountCoins: legacyCoins(100), months: 24 });
      expect(q.limits.capCoins).toBe(caps[profile]);
      expect(q.loan.annualRatePct).toBe(bankProductRatePct('personal', 2010));
      expect(q.loan.annualRatePct).toBeGreaterThan(q.mortgageRatePct);
      expect(q.loan.instalmentCoins).toBeGreaterThan(legacyCoins(100) / 24);
      expect(q.loan.totalRepaidCoins).toBeGreaterThan(legacyCoins(100));
      expect(q.earmark).toContain('Immobilier');
    }
    const uid = await player({ profile: 'student' });
    const over: any = await personal.quote(uid, { amountCoins: legacyCoins(271), months: 60 });
    expect(over.approved).toBe(false);
    expect(over.reasons.map((r: any) => r.code)).toContain('OVER_CAP');
    // étudiant : reste à vivre insuffisant pour un gros prêt court
    const tight: any = await personal.quote(uid, { amountCoins: legacyCoins(270), months: 6 });
    expect(tight.reasons.map((r: any) => r.code)).toEqual(expect.arrayContaining(['LIVING_REMAINING']));
    const small: any = await personal.quote(uid, { amountCoins: legacyCoins(10), months: 12 });
    expect(small.reasons.map((r: any) => r.code)).toContain('TOO_SMALL');
    expect((await player({ profile: 'employee' }).then((u) => personal.quote(u, { amountCoins: legacyCoins(100), months: 24 }))) as any).toMatchObject({ approved: true });
  });

  it('entrées invalides refusées ; accès : domaine gratuit ou Pro seulement ; une simulation ne crée aucune pièce', async () => {
    const uid = await player();
    for (const body of [{}, { amountCoins: 1.5, months: 12 }, { amountCoins: legacyCoins(100), months: 5 }, { amountCoins: legacyCoins(100), months: 61 }, { amountCoins: '100', months: 12 }]) {
      expect((await rejects(personal.quote(uid, body))).code).toBe('INVALID_INPUT');
    }
    const before = await balanceOf(uid);
    await personal.quote(uid, { amountCoins: legacyCoins(100), months: 12 });
    expect(await balanceOf(uid)).toBe(before);
    const locked = await player({ freeDomain: 'stocks' });
    expect((await rejects(personal.quote(locked, { amountCoins: legacyCoins(100), months: 12 }))).code).toBe('NOT_ALLOWED');
    const pro = await player({ tier: 'pro', freeDomain: 'stocks' });
    expect(((await personal.quote(pro, { amountCoins: legacyCoins(100), months: 12 })) as any).approved).toBe(true);
    const noGame = await createUser({ balance: legacyCoins(10), freeDomain: 'real_estate' });
    expect((await rejects(personal.quote(noGame, { amountCoins: legacyCoins(100), months: 12 }))) instanceof RealEstateError).toBe(true);
  });

  it('EMPRUNT : pièces créées (« credit »), NON fléchées (solde libre) ; un seul prêt à la fois, un seul par mois ; SÉCURITÉ', async () => {
    const uid = await player({ profile: 'employee', balance: legacyCoins(50) });
    const r: any = await personal.borrow(uid, { amountCoins: legacyCoins(400), months: 36 });
    expect(r.message).toContain('solde libre');
    expect(await balanceOf(uid)).toBe(legacyCoins(450));
    const led = (await query(`SELECT nature, domain, amount FROM investcoins_transactions WHERE user_id = $1 AND reason = 'bank_disburse'`, [uid])).rows[0];
    expect(led).toEqual({ nature: 'credit', domain: 'real_estate', amount: legacyCoins(400) });
    // non fléché (prêt personnel non affecté) : dépensable partout, y compris en Bourse
    await investcoinsRepository.applyTransaction(uid, -legacyCoins(100), 'trade_buy', { domain: 'stocks' });
    await investcoinsRepository.applyTransaction(uid, -legacyCoins(50), 'trade_buy', { domain: 'stocks' });
    expect((await rejects(personal.borrow(uid, { amountCoins: legacyCoins(100), months: 12 }))).message).toContain('un seul à la fois');
    const ov: any = await bankService.overview(uid);
    expect(ov.loans).toHaveLength(1);
    expect(ov.reservedCredit).toEqual([]);                                  // aucune réservation par domaine
    const other = await player({ profile: 'employee' });
    expect(((await bankService.overview(other)) as any).loans).toHaveLength(0);       // aucune fuite entre joueurs
    expect((await rejects(personal.borrow(uid, { amountCoins: 0, months: 12 }))).code).toBe('INVALID_INPUT');
  });

  it('le prêt personnel (libre) finance un achat immobilier ; l\'aperçu ne compte pas les pièces d\'un prêt fléché ailleurs (portefeuille Bourse)', async () => {
    const l = await goodListing();
    // 30 000 pièces à lui : depuis la décision « réserve = pièces propres », l'argent du prêt personnel ne compte pas dans la réserve exigée
    const uid = await player({ profile: 'executive', balance: legacyCoins(1500) });
    await personal.borrow(uid, { amountCoins: legacyCoins(700), months: 48 });
    const down = minDownCoins(l);
    const prev: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(prev.coins.balance).toBe(legacyCoins(2200));
    expect(prev.coins.affordable).toBe(true);
    // les pièces réservées à un autre domaine ne comptent pas : simulation d'un prêt fléché Bourse
    await query(`INSERT INTO bank_credit_balances (user_id, domain, coins) VALUES ($1, 'stocks', ${legacyCoins(500)}) ON CONFLICT (user_id, domain) DO UPDATE SET coins = ${legacyCoins(500)}`, [uid]);
    await investcoinsRepository.applyTransaction(uid, legacyCoins(500), 'bank_disburse', { domain: 'stocks' });
    const prev2: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(prev2.coins.balance).toBe(legacyCoins(2200));           // 2 700 en portefeuille − 500 réservés à la Bourse
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect((await query('SELECT coins FROM bank_credit_balances WHERE user_id = $1 AND domain = $2', [uid, 'real_estate'])).rows).toHaveLength(0);   // le prêt personnel ne réserve rien
  });

  it('ENDETTEMENT : l\'échéance du prêt personnel compte dans les 35 % à l\'achat d\'un bien', async () => {
    const l = await goodListing();
    const uid = await player({ profile: 'employee', balance: legacyCoins(1000) });
    const down = Math.floor((l.price * 0.3) / EUROS_PER_COIN);
    const before: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    await personal.borrow(uid, { amountCoins: legacyCoins(300), months: 24 });
    const after: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(after.bank.debtRatioPct).toBeGreaterThan(before.bank.debtRatioPct);
  });

  it('ÉCHÉANCES sur l\'horloge de l\'Immobilier, conservation exacte ; prêt soldé au terme', async () => {
    const uid = await player({ profile: 'employee', balance: legacyCoins(5000), seed: 'pret-perso' });
    const r: any = await personal.borrow(uid, { amountCoins: legacyCoins(100), months: 12 });
    await advance(uid, 12);
    const loan = (await query('SELECT * FROM bank_loans WHERE id = $1', [r.loanId])).rows[0];
    expect(loan.status).toBe('repaid');
    expect(Number(loan.balance_h)).toBe(0);
    const repaid = (await query(`SELECT COALESCE(-SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1 AND reason = 'bank_repayment'`, [uid])).rows[0].s;
    expect(repaid * 100 - loan.remainder_h).toBe(Number(loan.principal_paid_h) + Number(loan.interest_paid_h));
    expect(repaid).toBeGreaterThan(legacyCoins(100));
    expect(await balanceOf(uid)).toBe(legacyCoins(5000) + legacyCoins(100) - repaid);
    const ev = ((await bankService.events(uid)) as any).events.map((e: any) => e.kind);
    expect(ev).toContain('loan_repaid');
  });

  it('IMPAYÉS : échéance non payée → avertissement dans le mois ; 3 de suite = défaut, blocage, aucun nouvel emprunt', async () => {
    const own = legacyCoins(100);   // pièces à lui : la banque exige une réserve de 4 mensualités avant de prêter
    const uid = await player({ profile: 'employee', balance: own });
    await personal.borrow(uid, { amountCoins: legacyCoins(300), months: 24 });
    await investcoinsRepository.applyTransaction(uid, -(legacyCoins(300) + own), 're_exchange_pay_works', { domain: 'real_estate' });   // il dépense tout
    let warned = false;
    for (let i = 0; i < 3; i++) {
      const r: any = await life.advanceTime(uid, 1);
      if (r.settled.some((s: any) => s.warnings.some((w: any) => w.code === 'BANK'))) warned = true;
    }
    expect(warned).toBe(true);
    const ov: any = await bankService.overview(uid);
    expect(ov.loans[0].status).toBe('defaulted');
    expect(ov.account).toMatchObject({ creditBlocked: true, defaults: 1 });
    const refused = await rejects(personal.borrow(uid, { amountCoins: legacyCoins(50), months: 12 }));
    expect(refused.code).toBe('NOT_ALLOWED');
    expect(refused.details.reasons.map((r: any) => r.code)).toContain('CREDIT_BLOCKED');
    // le blocage ne touche pas le reste du jeu : on peut toujours consulter et avancer
    await life.advanceTime(uid, 1);
  });

  it('CLASSEMENT NET DE DETTES : levier affiché, intérêts déduits ; sans emprunt levier ×1', async () => {
    const l = await goodListing();
    const buyWith = async (uid: string, down: number) => { await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 }); const p = (await svc.listProperties(uid)).properties[0]; await life.listForRent(uid, p.id, 0.9); await advance(uid, 12); };
    const down = minDownCoins(l);
    const own = await player({ profile: 'executive', balance: legacyCoins(2000), seed: 'levier' });
    await buyWith(own, down);
    const debt = await player({ profile: 'executive', balance: legacyCoins(1000), seed: 'levier' });
    await personal.borrow(debt, { amountCoins: legacyCoins(700), months: 60 });
    await buyWith(debt, down);
    const g = async (u: string) => (await query('SELECT * FROM re_games WHERE user_id = $1', [u])).rows[0];
    const mOwn: any = await wealthMetrics({ query } as any, await g(own));
    const mDebt: any = await wealthMetrics({ query } as any, await g(debt));
    expect(mOwn.leverage).toBe(1);
    expect(mDebt.leverage).toBeGreaterThan(1);
    expect(mDebt.bankDebtEuros).toBeGreaterThan(0);
    expect(mDebt.bankInterestPaidEuros).toBeGreaterThan(0);
    const board: any = await getRealEstateLeaderboard(debt, undefined);
    expect(board.mine.leverage).toBe(mDebt.leverage);
    expect(board.me.leverage).toBe(mDebt.leverage);
    const snap = (await query(`SELECT leverage FROM leaderboard_rankings WHERE user_id = $1 AND domain = 'real_estate' ORDER BY period DESC LIMIT 1`, [debt])).rows[0];   // dernière période (l'avance de 12 mois peut en écrire deux)
    expect(Number(snap.leverage)).toBe(mDebt.leverage);
    // gain identique au bien seul, moins les intérêts : jamais supérieur au joueur sans dette en euros
    expect(mDebt.equity + mDebt.cumulativeCashFlow - mDebt.investedEuros - mDebt.bankInterestPaidEuros)
      .toBeLessThanOrEqual(mOwn.equity + mOwn.cumulativeCashFlow - mOwn.investedEuros + 1);
  });
});
