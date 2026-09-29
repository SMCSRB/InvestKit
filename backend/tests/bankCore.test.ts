import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { investcoinsRepository, InsufficientFundsError } from '../src/repositories/investcoinsRepository';
import { originateLoan, settleMonth, bankService, BankError, withTx, outstandingCoins, assertCanBorrow } from '../src/services/bankService';
import { BANK_LIMITS } from '../src/config/bankRules';
import { buildCoinSchedule } from '../src/engine/bank';

describe.skipIf(!hasDb)('banque : noyau (registre des dettes, création/destruction des pièces, plafonds)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const open = (userId: string, o: Partial<{ product: 'personal'; domain: string; principalCoins: number; annualRatePct: number; months: number; clockTotal: number; earmark: boolean }> = {}) =>
    withTx((c) => originateLoan(c, { userId, product: 'personal', domain: 'real_estate', principalCoins: 1000, annualRatePct: 8, months: 12, clockTotal: 24120, ...o }));
  const settle = (userId: string, clock: number, domain = 'real_estate') => withTx((c) => settleMonth(c, userId, domain, clock));
  const loanRow = async (id: string) => (await query('SELECT * FROM bank_loans WHERE id = $1', [id])).rows[0];
  const rejects = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as any; } throw new Error('aurait dû échouer'); };

  it('emprunt : pièces CRÉÉES (nature « credit », domaine du prêt), dette enregistrée, crédit fléché, journal', async () => {
    const uid = await createUser({ balance: 100 });
    const { loanId } = await open(uid);
    expect(await balanceOf(uid)).toBe(1100);
    const led = (await query(`SELECT amount, reason, nature, domain FROM investcoins_transactions WHERE user_id = $1 AND reason = 'bank_disburse'`, [uid])).rows;
    expect(led).toEqual([{ amount: 1000, reason: 'bank_disburse', nature: 'credit', domain: 'real_estate' }]);
    const l = await loanRow(loanId);
    expect(Number(l.balance_h)).toBe(100000);
    expect(l.status).toBe('active');
    expect((await query('SELECT coins FROM bank_credit_balances WHERE user_id = $1 AND domain = $2', [uid, 'real_estate'])).rows[0].coins).toBe(1000);
    expect((await bankService.events(uid) as any).events[0].kind).toBe('loan_opened');
  });

  it('CRÉDIT FLÉCHÉ : les pièces empruntées ne se dépensent que dans leur domaine ; les siennes restent libres', async () => {
    const uid = await createUser({ balance: 100 });
    await open(uid, { principalCoins: 500 });              // 100 libres + 500 réservées à l'Immobilier
    const spend = (amount: number, domain?: string) => investcoinsRepository.applyTransaction(uid, -amount, domain === 'real_estate' ? 're_exchange_down_payment' : 'trade_buy', domain ? { domain } : undefined);
    await expect(spend(200, 'stocks')).rejects.toThrow(InsufficientFundsError);   // entamerait les 500 réservés
    await expect(spend(150)).rejects.toThrow(InsufficientFundsError);              // sans domaine : rien de réservé n'est accessible
    await spend(100, 'stocks');                                                    // ses propres pièces : autorisé
    expect(await balanceOf(uid)).toBe(500);
    await expect(spend(1, 'crypto')).rejects.toThrow(InsufficientFundsError);
    await spend(300, 'real_estate');                                               // le domaine du prêt : autorisé, entame la réserve
    expect((await query('SELECT coins FROM bank_credit_balances WHERE user_id = $1', [uid])).rows[0].coins).toBe(200);
    expect(await balanceOf(uid)).toBe(200);
  });

  it('une réserve ne dépasse jamais le solde : rembourser avec des pièces réservées la réduit', async () => {
    const uid = await createUser({ balance: 0 });
    const { loanId } = await open(uid, { principalCoins: 600, months: 6, annualRatePct: 0 });
    await settle(uid, 24121);                              // 1re échéance de 100 payée sur les pièces empruntées
    expect(await balanceOf(uid)).toBe(500);
    expect((await query('SELECT coins FROM bank_credit_balances WHERE user_id = $1', [uid])).rows[0].coins).toBe(500);
    expect(Number((await loanRow(loanId)).balance_h)).toBe(50000);
  });

  it('VIE COMPLÈTE d\'un prêt : chaque mois une échéance, jamais deux fois le même mois, solde à zéro, conservation exacte des pièces', async () => {
    const uid = await createUser({ balance: 5000 });
    const { loanId } = await open(uid, { principalCoins: 1000, months: 12, annualRatePct: 8 });
    const sched = buildCoinSchedule({ principalCoins: 1000, annualRatePct: 8, months: 12 });
    await settle(uid, 24121); await settle(uid, 24121);   // rejeu du même mois : sans effet
    expect((await loanRow(loanId)).accrued_instalments).toBe(1);
    for (let k = 2; k <= 12; k++) await settle(uid, 24120 + k);
    const l = await loanRow(loanId);
    expect(l.status).toBe('repaid');
    expect(Number(l.balance_h)).toBe(0);
    expect(Number(l.principal_paid_h)).toBe(100000);
    expect(Number(l.interest_paid_h)).toBe(sched.totalInterestH);
    // pièces détruites au remboursement = capital + intérêts (au reliquat près) ; capital créé = capital remboursé
    const repaid = (await query(`SELECT COALESCE(-SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1 AND reason = 'bank_repayment' AND nature = 'repayment'`, [uid])).rows[0].s;
    expect(repaid * 100 - l.remainder_h).toBe(sched.totalPaidH);
    const created = (await query(`SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1 AND nature = 'credit'`, [uid])).rows[0].s;
    expect(created).toBe(1000);
    expect(await balanceOf(uid)).toBe(5000 + 1000 - repaid);
    expect(repaid).toBeGreaterThan(1000);                   // les intérêts sont une destruction nette
  });

  it('ÉCHÉANCE IMPAYÉE → défaut après 3 : compte bloqué, dette conservée, nouvel emprunt refusé ; solder lève le blocage', async () => {
    const uid = await createUser({ balance: 0 });
    const { loanId } = await open(uid, { principalCoins: 300, months: 12, annualRatePct: 12 });
    await investcoinsRepository.applyTransaction(uid, -300, 'trade_buy', { domain: 'real_estate' }); // le joueur dépense tout (domaine du prêt)
    expect(await balanceOf(uid)).toBe(0);
    const ev1 = await settle(uid, 24121); expect(ev1[0].kind).toBe('instalment_missed');
    await settle(uid, 24122);
    const ev3 = await settle(uid, 24123);
    expect(ev3.map((e: any) => e.kind)).toEqual(['instalment_missed', 'loan_defaulted']);
    const l = await loanRow(loanId);
    expect(l.status).toBe('defaulted');
    expect(Number(l.balance_h)).toBe(30000);
    expect(Number(l.due_principal_h) + Number(l.due_interest_h)).toBeGreaterThan(0);
    const acc = (await query('SELECT * FROM bank_accounts WHERE user_id = $1', [uid])).rows[0];
    expect(acc).toMatchObject({ credit_blocked: true, blocked_reason: 'default', defaults: 1 });
    expect((await rejects(open(uid))).code).toBe('CREDIT_BLOCKED');
    // dette conservée dans le total
    expect(await outstandingCoins({ query } as any, uid)).toBe(300);
    // solder : il faut de quoi payer
    expect((await rejects(bankService.earlyRepay(uid, loanId))).code).toBe('INSUFFICIENT_FUNDS');
    await investcoinsRepository.applyTransaction(uid, 1000, 'daily_reward');
    const r: any = await bankService.earlyRepay(uid, loanId);
    expect(r.coinsPaid).toBeGreaterThanOrEqual(300);
    expect((await loanRow(loanId)).status).toBe('repaid');
    expect((await query('SELECT credit_blocked FROM bank_accounts WHERE user_id = $1', [uid])).rows[0].credit_blocked).toBe(false);
    await open(uid, { principalCoins: 100 });                // de nouveau possible
  });

  it('REMBOURSEMENT ANTICIPÉ : indemnité de 1 % (plus d\'un an) ou 0,5 %, pièces détruites, SÉCURITÉ (prêt d\'un autre, identifiant invalide)', async () => {
    const uid = await createUser({ balance: 5000 });
    const { loanId } = await open(uid, { principalCoins: 1000, months: 24, annualRatePct: 6 });
    const before = await balanceOf(uid);
    const r: any = await bankService.earlyRepay(uid, loanId);
    expect(r.penaltyCoins).toBeCloseTo(10, 1);              // 1 % de 1 000, plus d'un an restant
    expect(r.coinsPaid).toBe(1010);
    expect(await balanceOf(uid)).toBe(before - 1010);
    expect((await rejects(bankService.earlyRepay(uid, loanId))).message).toContain('déjà clos');
    const other = await createUser({ balance: 100 });
    const { loanId: l2 } = await open(other, { principalCoins: 200 });
    expect((await rejects(bankService.earlyRepay(uid, l2))).code).toBe('NOT_FOUND');
    expect((await rejects(bankService.earlyRepay(uid, 'x'))).code).toBe('INVALID_INPUT');
  });

  it('PLAFONDS : nombre de prêts, dette totale, montants invalides', async () => {
    const uid = await createUser({ balance: 0 });
    for (let i = 0; i < BANK_LIMITS.maxActiveLoansPerUser; i++) await open(uid, { principalCoins: 100 });
    expect((await rejects(open(uid, { principalCoins: 100 }))).code).toBe('LIMIT_REACHED');
    const rich = await createUser({ balance: 0 });
    expect((await rejects(open(rich, { principalCoins: BANK_LIMITS.maxOutstandingPrincipalCoins + 1 }))).code).toBe('LIMIT_REACHED');
    for (const bad of [0, -5, 10.5, NaN]) expect((await rejects(withTx((c) => assertCanBorrow(c, rich, bad)))).code).toBe('INVALID_INPUT');
    expect((await rejects(open(rich, { principalCoins: 100, annualRatePct: -3 }))).name).toBe('BankInputError');
    expect(await balanceOf(rich)).toBe(0);                  // une ouverture refusée ne crée aucune pièce
  });

  it('RÉCAPITULATIF : uniquement ses propres prêts, montants cohérents ; statistique d\'administration', async () => {
    const a = await createUser({ balance: 50 }); const b = await createUser({ balance: 50 });
    await open(a, { principalCoins: 400, months: 10, annualRatePct: 5 });
    await open(b, { principalCoins: 900 });
    const ov: any = await bankService.overview(a);
    expect(ov.loans).toHaveLength(1);
    expect(ov.loans[0]).toMatchObject({ product: 'personal', domain: 'real_estate', principalCoins: 400, balanceCoins: 400, status: 'active' });
    expect(ov.loans[0].nextInstalmentCoins).toBeGreaterThan(40);
    expect(ov.totals.outstandingCoins).toBe(400);
    expect(ov.reservedCredit).toEqual([{ domain: 'real_estate', coins: 400 }]);
    const stats = await investcoinsRepository.ledgerStatsByDomain();
    expect(stats.real_estate.credited).toBeGreaterThanOrEqual(1300);
    expect(stats.real_estate).toHaveProperty('repaid');
    const admin = await bankService.adminStats();
    expect(admin.outstanding.find((r) => r.product === 'personal' && r.domain === 'real_estate')!.outstandingCoins).toBeGreaterThanOrEqual(1300);
  });

  it('INVARIANT GLOBAL : pièces créées par crédit − capital remboursé = capital restant dû (tous prêts, tous états)', async () => {
    const users = await Promise.all([1, 2, 3].map(() => createUser({ balance: 3000 })));
    for (const [i, u] of users.entries()) {
      await open(u, { principalCoins: 500 + i * 300, months: 6 + i * 6, annualRatePct: 3 + i * 2 });
      for (let k = 1; k <= 4 + i; k++) await settle(u, 24120 + k);
    }
    const created = Number((await query(`SELECT COALESCE(SUM(amount),0) AS s FROM investcoins_transactions WHERE nature = 'credit' AND user_id = ANY($1)`, [users])).rows[0].s);
    const ls = (await query(`SELECT COALESCE(SUM(principal_paid_h),0) AS p, COALESCE(SUM(balance_h),0) AS b FROM bank_loans WHERE user_id = ANY($1)`, [users])).rows[0];
    expect(created * 100).toBe(Number(ls.p) + Number(ls.b));
  });
});
