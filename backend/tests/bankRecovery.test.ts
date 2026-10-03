import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, legacyCoins } from './helpers';
import { query } from '../src/utils/db';
import { tradingService as trading } from '../src/services/tradingService';
import { realEstateService as svc } from '../src/services/realEstateService';
import { bankService, withTx, originateLoan } from '../src/services/bankService';
import { bankRecoveryService as recovery } from '../src/services/bankRecoveryService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { RECOVERY } from '../src/config/bankRules';

describe.skipIf(!hasDb)('procédure de rétablissement après défaut', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const rejects = async (p: Promise<unknown>): Promise<any> => { try { await p; } catch (e) { return e; } throw new Error('aurait dû échouer'); };
  const acc = async (uid: string) => (await query('SELECT * FROM bank_accounts WHERE user_id = $1', [uid])).rows[0];
  const loans = async (uid: string) => (await query('SELECT * FROM bank_loans WHERE user_id = $1 ORDER BY created_at', [uid])).rows;

  // Prêt en défaut créé directement en base (le défaut lui-même est testé dans les autres fichiers).
  const addDefaulted = async (uid: string, domain: string, product = 'portfolio', principal = 60) => {
    await query(`INSERT INTO bank_loans (user_id, product, domain, repayment_type, principal_coins, annual_rate_pct, months, balance_h, opened_clock_total, status)
                 VALUES ($1, $2, $3, $4, $5, 5, 12, $6, 2010, 'defaulted')`, [uid, product, domain, product === 'portfolio' ? 'interest_only' : 'annuity', principal, principal * 100]);
    await query(`INSERT INTO bank_accounts (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [uid]);
    await query(`UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', blocked_until = NULL WHERE user_id = $1`, [uid]);
  };

  // Joueur Bourse avec un prêt en défaut (état obtenu directement : le défaut lui-même est testé dans les autres fichiers).
  const defaultedStocksPlayer = async (balance = 300) => {
    const uid = await createUser({ balance, freeDomain: 'stocks' });
    await trading.getPortfolioView(uid, 'stocks');
    await trading.buy(uid, 'stocks', 'LVMH', 2);                                      // 240  InvestCoins de titres
    const { loanId } = await withTx((c) => originateLoan(c, { userId: uid, product: 'portfolio', domain: 'stocks', principalCoins: 600, annualRatePct: 3, months: 1, clockTotal: 2010, repaymentType: 'interest_only' }));
    await query(`UPDATE bank_loans SET status = 'defaulted', missed_instalments = 3 WHERE id = $1`, [loanId]);
    await query(`UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', defaults = 1 WHERE user_id = $1`, [uid]);
    await query(`INSERT INTO leaderboard_rankings (user_id, mode, domain, period, performance_pct, capital_committed) VALUES ($1,'accelerated','stocks','Y2010',5,240) ON CONFLICT DO NOTHING`, [uid]);
    return { uid, loanId };
  };

  it('aperçu : ce qui sera perdu, effacé, complété ; aucun effet ; règles d\'éligibilité', async () => {
    const { uid } = await defaultedStocksPlayer();
    const before = await balanceOf(uid);
    const pv: any = await recovery.preview(uid, { domain: 'stocks' });
    expect(pv.eligible).toBe(true);
    expect(pv.willLose.rank).toBe(true);
    expect(pv.willLose.badges).toContain('navigateur');
    expect(pv.willHappen.debtWrittenOffCoins).toBe(600);
    expect(pv.willHappen.borrowedCoinsSeized).toBe(600);                              // les 600  InvestCoins empruntés, non dépensés
    expect(pv.willHappen.baseCapitalTopUpCoins).toBe(RECOVERY.baseCapitalCoins - (before - 600));
    expect(pv.confirmPhrase).toBe('RETABLISSEMENT');
    expect(await balanceOf(uid)).toBe(before);                                        // simple aperçu
    expect((await loans(uid))[0].status).toBe('defaulted');
    // sans défaut dans ce domaine : refusé avec explication
    const clean = await createUser({ balance: 100, freeDomain: 'stocks' });
    await trading.getPortfolioView(clean, 'stocks');
    expect(((await recovery.preview(clean, { domain: 'stocks' })) as any).reasons[0]).toContain('en défaut');
    expect((await rejects(recovery.preview(uid, { domain: 'bonds' }))).code).toBe('INVALID_INPUT');
    // un défaut en Bourse ne permet pas de « rétablir » l'Immobilier
    expect(((await recovery.preview(uid, { domain: 'real_estate' })) as any).eligible).toBe(false);
  });

  it('confirmation obligatoire ; SÉCURITÉ : uniquement son propre compte', async () => {
    const { uid } = await defaultedStocksPlayer();
    for (const confirm of [undefined, '', 'oui', 'retablissement']) {
      expect((await rejects(recovery.start(uid, { domain: 'stocks', confirm }))).code).toBe('INVALID_INPUT');
    }
    const other = await createUser({ balance: 100, freeDomain: 'stocks' });
    await trading.getPortfolioView(other, 'stocks');
    expect((await rejects(recovery.start(other, { domain: 'stocks', confirm: 'RETABLISSEMENT' }))).code).toBe('NOT_ALLOWED');   // rien à rétablir, et son compte n'est pas touché
    expect((await loans(uid))[0].status).toBe('defaulted');
  });

  it('BOURSE : dette effacée, pièces empruntées reprises, portefeuille et rang remis à zéro, capital de base, interdiction de crédit', async () => {
    const { uid, loanId } = await defaultedStocksPlayer(300);
    const r: any = await recovery.start(uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' });
    expect(r.message).toContain('rang perdu');
    expect(r.writtenOffCoins).toBe(600);
    const l = (await loans(uid))[0];
    expect(l.id).toBe(loanId);
    expect(l.status).toBe('written_off');
    expect(Number(l.balance_h)).toBe(0);
    expect(Number(l.written_off_h)).toBe(60000);
    // invariant complet : capital créé = capital remboursé + restant dû + effacé
    expect(600 * 100).toBe(Number(l.principal_paid_h) + Number(l.balance_h) + Number(l.written_off_h));
    const p = (await query(`SELECT positions, total_bought, total_proceeds, simulated_year FROM virtual_portfolios WHERE user_id = $1 AND domain = 'stocks'`, [uid])).rows[0];
    expect(p.positions).toEqual([]);
    expect(Number(p.total_bought)).toBe(0);
    expect(p.simulated_year).toBe(2010);
    expect((await query(`SELECT COUNT(*) AS n FROM leaderboard_rankings WHERE user_id = $1 AND domain = 'stocks'`, [uid])).rows[0].n).toBe('0');
    expect((await query('SELECT coins FROM bank_credit_balances WHERE user_id = $1 AND domain = $2', [uid, 'stocks'])).rows[0].coins).toBe(0);
    // pièces : reprise des 600 empruntées (destruction), capital de base complété (création), ledger classé
    const nat = (await query(`SELECT reason, nature, amount FROM investcoins_transactions WHERE user_id = $1 AND reason IN ('bank_recovery_seizure','bank_recovery_grant')`, [uid])).rows;
    expect(nat.find((x) => x.reason === 'bank_recovery_seizure')).toMatchObject({ nature: 'repayment', amount: -600 });
    const grant = nat.find((x) => x.reason === 'bank_recovery_grant')!;
    expect(grant.nature).toBe('creation');
    expect(await balanceOf(uid)).toBe(RECOVERY.baseCapitalCoins);
    // blocage « recovery » de 30 jours, compteurs
    const a = await acc(uid);
    expect(a).toMatchObject({ credit_blocked: true, blocked_reason: 'recovery', recoveries: 1 });
    expect(new Date(a.blocked_until).getTime() - Date.now()).toBeGreaterThan(29 * 86_400_000);
    expect(Number(a.written_off_coins)).toBe(600);
    expect((await rejects(withTx((c) => originateLoan(c, { userId: uid, product: 'portfolio', domain: 'stocks', principalCoins: 30, annualRatePct: 3, months: 1, clockTotal: 2010, repaymentType: 'interest_only' })))).code).toBe('CREDIT_BLOCKED');
    // la partie repart : on peut réacheter
    await trading.buy(uid, 'stocks', 'SAN', 1);
    expect(((await bankService.adminStats()) as any).writtenOffCoins).toBeGreaterThanOrEqual(600);
    expect((await query('SELECT COUNT(*) AS n FROM bank_recoveries WHERE user_id = $1', [uid])).rows[0].n).toBe('1');
  });

  it('l\'interdiction de crédit expire d\'elle-même ; un défaut restant ailleurs maintient le blocage', async () => {
    const { uid } = await defaultedStocksPlayer(600);
    await recovery.start(uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' });
    await query(`UPDATE bank_accounts SET blocked_until = NOW() - INTERVAL '1 minute' WHERE user_id = $1`, [uid]);
    await withTx((c) => originateLoan(c, { userId: uid, product: 'portfolio', domain: 'stocks', principalCoins: 30, annualRatePct: 3, months: 1, clockTotal: 2010, repaymentType: 'interest_only' }));   // possible de nouveau
    expect((await acc(uid)).credit_blocked).toBe(false);
    // autre joueur : défaut Bourse rétabli mais défaut Immobilier restant → toujours bloqué après expiration
    const both = await defaultedStocksPlayer(600);
    await addDefaulted(both.uid, 'real_estate', 'personal', 100);
    await recovery.start(both.uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' });
    await query(`UPDATE bank_accounts SET blocked_until = NOW() - INTERVAL '1 minute' WHERE user_id = $1`, [both.uid]);
    const e = await rejects(withTx((c) => originateLoan(c, { userId: both.uid, product: 'portfolio', domain: 'stocks', principalCoins: 30, annualRatePct: 3, months: 1, clockTotal: 2010, repaymentType: 'interest_only' })));
    expect(e.code).toBe('CREDIT_BLOCKED');
  });

  it('LIMITES : délai entre deux procédures et nombre maximum', async () => {
    const { uid } = await defaultedStocksPlayer(600);
    await recovery.start(uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' });
    // nouveau défaut immédiatement après : refusé (délai)
    const again = async () => { await addDefaulted(uid, 'stocks'); };
    await again();
    expect((await rejects(recovery.start(uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' }))).message).toContain('attente');
    for (let i = 2; i <= RECOVERY.maxLifetime; i++) {
      await query(`UPDATE bank_accounts SET last_recovery_at = NOW() - INTERVAL '31 days' WHERE user_id = $1`, [uid]);
      await recovery.start(uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' });
      await again();
    }
    await query(`UPDATE bank_accounts SET last_recovery_at = NOW() - INTERVAL '31 days' WHERE user_id = $1`, [uid]);
    expect((await rejects(recovery.start(uid, { domain: 'stocks', confirm: 'RETABLISSEMENT' }))).message).toContain('maximum');
    expect((await acc(uid)).recoveries).toBe(RECOVERY.maxLifetime);
  });

  it('IMMOBILIER : la partie (biens, prêts, événements) est supprimée, le rang perdu ; on peut recommencer avec un nouveau profil', async () => {
    const uid = await createUser({ balance: legacyCoins(200), freeDomain: 'real_estate' });
    await svc.startGame(uid, 'employee');
    const loan: any = await personal.borrow(uid, { amountCoins: legacyCoins(100), months: 12 });
    await query(`UPDATE bank_loans SET status = 'defaulted' WHERE id = $1`, [loan.loanId]);
    await query(`UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', defaults = 1 WHERE user_id = $1`, [uid]);
    await query(`INSERT INTO leaderboard_rankings (user_id, mode, domain, period, performance_pct, capital_committed) VALUES ($1,'accelerated','real_estate','Y2010',5,150)`, [uid]);
    const r: any = await recovery.start(uid, { domain: 'real_estate', confirm: 'RETABLISSEMENT' });
    expect(r.borrowedCoinsSeized).toBe(0);   // prêt personnel non affecté : aucune pièce réservée à saisir
    expect((await query('SELECT COUNT(*) AS n FROM re_games WHERE user_id = $1', [uid])).rows[0].n).toBe('0');
    expect((await query(`SELECT COUNT(*) AS n FROM leaderboard_rankings WHERE user_id = $1 AND domain = 'real_estate'`, [uid])).rows[0].n).toBe('0');
    expect((await loans(uid))[0].status).toBe('written_off');
    await svc.startGame(uid, 'student');                                              // redémarrage possible
    expect(((await svc.getState(uid)) as any).game.profile).toBe('student');
  });
});
