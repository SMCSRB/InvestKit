import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { InsufficientFundsError, investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { tradingService as trading } from '../src/services/tradingService';
import { bankPortfolioService as lombard } from '../src/services/bankPortfolioService';
import { bankService } from '../src/services/bankService';
import { collateralLimits, marginState, ltvPct, liquidationFraction } from '../src/engine/bank';
import { LOMBARD_LTV_PCT, LOMBARD, bankProductRatePct } from '../src/config/bankRules';

const S = LOMBARD_LTV_PCT.stock, C = LOMBARD_LTV_PCT.crypto;

describe('prêt sur portefeuille : règles pures de la garantie', () => {
  it('plafond / appel / liquidation par classe d\'actif (50-65-80 actions, 30 % crypto)', () => {
    expect(S).toEqual({ max: 50, call: 65, liquidation: 80 });
    expect(LOMBARD_LTV_PCT.bond.max).toBe(70);
    expect(C.max).toBe(30);
    const l = collateralLimits([{ value: 1000, ltv: S }, { value: 1000, ltv: C }]);
    expect(l).toEqual({ value: 2000, maxLimit: 800, callLimit: 1040, liquidationLimit: 1280 });
    expect(() => collateralLimits([{ value: -1, ltv: S }])).toThrow();
  });
  it('états : ok / appel de marge (65 %) / liquidation (80 %) pour des actions', () => {
    const l = collateralLimits([{ value: 1000, ltv: S }]);
    expect(marginState(0, l)).toBe('ok');
    expect(marginState(650, l)).toBe('ok');          // exactement le seuil : pas encore d'appel
    expect(marginState(651, l)).toBe('call');
    expect(marginState(800, l)).toBe('call');
    expect(marginState(801, l)).toBe('liquidation');
    expect(ltvPct(500, 1000)).toBe(50);
    expect(ltvPct(10, 0)).toBe(999);
  });
  it('fraction à liquider : ramène la dette sous le plafond, jamais plus que nécessaire, tout si impossible', () => {
    for (const [debt, value] of [[900, 1000], [820, 1000], [1200, 1300], [700, 1000]] as const) {
      const max = value * 0.5;
      const f = liquidationFraction(debt, value, max, 3);
      const proceeds = f * value * 0.97;
      expect(debt - proceeds).toBeLessThanOrEqual(max * (1 - f) + 0.001);
      if (f > 0 && f < 1) expect(debt - proceeds).toBeCloseTo(max * (1 - f), 3);   // ni plus ni moins
    }
    expect(liquidationFraction(400, 1000, 500, 3)).toBe(0);
    expect(liquidationFraction(2000, 1000, 500, 3)).toBe(1);   // même en vendant tout, la dette dépasse
  });
});

describe.skipIf(!hasDb)('prêt sur portefeuille (Lombard) : Bourse et Crypto', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const player = async (opts: { balance?: number; domain?: 'stocks' | 'crypto'; year?: number; free?: string | null; tier?: 'free' | 'pro' } = {}) => {
    const domain = opts.domain ?? 'stocks';
    const uid = await createUser({ balance: opts.balance ?? 2000, freeDomain: opts.free === undefined ? domain : opts.free, tier: opts.tier });
    await trading.getPortfolioView(uid, domain);
    if (opts.year) await query(`UPDATE virtual_portfolios SET simulated_year = $2 WHERE user_id = $1 AND domain = $3`, [uid, opts.year, domain]);
    return uid;
  };
  const rejects = async (p: Promise<unknown>): Promise<any> => { try { await p; } catch (e) { return e; } throw new Error('aurait dû échouer'); };
  const loanOf = async (uid: string) => (await query(`SELECT * FROM bank_loans WHERE user_id = $1 AND product = 'portfolio' ORDER BY created_at DESC LIMIT 1`, [uid])).rows[0];
  const events = async (uid: string) => (await query('SELECT kind, message FROM bank_events WHERE user_id = $1 ORDER BY id', [uid])).rows;
  const pos = async (uid: string, domain = 'stocks') => (await query('SELECT positions FROM virtual_portfolios WHERE user_id = $1 AND domain = $2', [uid, domain])).rows[0].positions as { symbol: string; quantity: number }[];

  it('simulation : plafond = 50 % des actions, taux variable base + écart, levier annoncé, simplification signalée ; aucun effet', async () => {
    const uid = await player({ year: 2019 });
    await trading.buy(uid, 'stocks', 'TTE', 10);                           // 10 × 45 = 450  InvestCoins
    const before = await balanceOf(uid);
    const q: any = await lombard.quote(uid, { domain: 'stocks', amountCoins: 200 });
    expect(q.approved).toBe(true);
    expect(q.collateral).toMatchObject({ valueCoins: 450, capacityCoins: 225 });
    expect(q.loan.annualRatePct).toBe(bankProductRatePct('portfolio', 2019));
    expect(q.loan.rateKind).toBe('variable');
    expect(q.afterPurchase.leverage).toBeCloseTo((450 + 200) / 450, 2);
    expect(q.simplification).toContain('clôtures annuelles');
    expect(q.earmark).toContain('Bourse');
    expect(await balanceOf(uid)).toBe(before);
    const over: any = await lombard.quote(uid, { domain: 'stocks', amountCoins: 226 });
    expect(over.reasons.map((r: any) => r.code)).toContain('OVER_CAPACITY');
    expect(((await lombard.quote(uid, { domain: 'stocks', amountCoins: 10 })) as any).reasons.map((r: any) => r.code)).toContain('TOO_SMALL');
  });

  it('refus : portefeuille vide, domaine invalide, montants invalides, droits (domaine gratuit ou Pro)', async () => {
    const empty = await player({ year: 2019 });
    expect(((await lombard.quote(empty, { domain: 'stocks', amountCoins: 100 })) as any).reasons.map((r: any) => r.code)).toContain('NO_COLLATERAL');
    for (const body of [{ domain: 'bonds', amountCoins: 100 }, { domain: 'stocks', amountCoins: 1.5 }, { domain: 'stocks', amountCoins: '100' }, { domain: 'stocks' }, {}]) {
      expect((await rejects(lombard.quote(empty, body))).code).toBe('INVALID_INPUT');
    }
    const other = await player({ year: 2019, free: 'crypto' });          // domaine gratuit = crypto : la Bourse est verrouillée
    expect((await rejects(lombard.quote(other, { domain: 'stocks', amountCoins: 100 }))).code).toBe('NOT_ALLOWED');
    const pro = await player({ year: 2019, free: 'crypto', tier: 'pro' });
    await trading.buy(pro, 'stocks', 'TTE', 10);
    expect(((await lombard.quote(pro, { domain: 'stocks', amountCoins: 100 })) as any).approved).toBe(true);
  });

  it('EMPRUNT : pièces créées (« credit », domaine Bourse), fléchées Bourse ; un seul prêt par domaine et par année ; SÉCURITÉ', async () => {
    const uid = await player({ year: 2019, balance: 1000 });
    await trading.buy(uid, 'stocks', 'TTE', 10);
    const r: any = await lombard.borrow(uid, { domain: 'stocks', amountCoins: 200 });
    expect(r.message).toContain('taux variable');
    const led = (await query(`SELECT nature, domain, amount FROM investcoins_transactions WHERE user_id = $1 AND reason = 'bank_disburse'`, [uid])).rows[0];
    expect(led).toEqual({ nature: 'credit', domain: 'stocks', amount: 200 });
    const l = await loanOf(uid);
    expect(l).toMatchObject({ repayment_type: 'interest_only', domain: 'stocks', status: 'active' });
    // fléché : ni Immobilier ni Crypto ; la Bourse, oui
    await expect(investcoinsRepository.applyTransaction(uid, -700, 're_exchange_down_payment', { domain: 'real_estate' })).rejects.toThrow(InsufficientFundsError);
    await trading.buy(uid, 'stocks', 'SAN', 3);                            // avec ses pièces et/ou les pièces fléchées Bourse : autorisé
    expect((await rejects(lombard.borrow(uid, { domain: 'stocks', amountCoins: 25 }))).details.reasons.map((x: any) => x.code)).toContain('ALREADY_HAVE_ONE');
    const view: any = (await trading.getPortfolioView(uid, 'stocks'));
    expect(view.bank.loan).toMatchObject({ debtCoins: 200, state: 'ok', status: 'active' });
    expect(view.bank.capacityCoins).toBeGreaterThan(0);
    const other = await player({ year: 2019 });
    expect((await rejects(lombard.repay(other, l.id, 10))).code).toBe('NOT_FOUND');      // prêt d'un autre joueur
    expect((await rejects(lombard.repay(uid, 'x', 10))).code).toBe('INVALID_INPUT');
    expect((await rejects(bankService.earlyRepay(uid, l.id))).message).toContain('portefeuille');
  });

  it('PASSAGE D\'ANNÉE : intérêts de l\'année payés (destruction), nouveau taux variable, conservation exacte', async () => {
    const uid = await player({ year: 2010, balance: 1000 });
    await trading.buy(uid, 'stocks', 'LVMH', 5);                           // 600  InvestCoins en 2010
    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 250 });
    const rate2010 = bankProductRatePct('portfolio', 2010);
    const before = await balanceOf(uid);
    const r: any = await trading.advanceYear(uid, 'stocks');
    expect(r.simulatedYear).toBe(2011);
    const l = await loanOf(uid);
    expect(Number(l.annual_rate_pct)).toBe(bankProductRatePct('portfolio', 2011));
    expect(Number(l.interest_paid_h)).toBe(Math.round(25000 * rate2010 / 100));
    const paid = before - (await balanceOf(uid));
    expect(paid * 100 - l.remainder_h).toBe(Number(l.interest_paid_h));
    expect(Number(l.balance_h)).toBe(25000);                               // intérêts seuls : le capital ne bouge pas
    const created = Number((await query(`SELECT COALESCE(SUM(amount),0) AS s FROM investcoins_transactions WHERE user_id = $1 AND nature = 'credit'`, [uid])).rows[0].s);
    expect(created * 100).toBe(Number(l.principal_paid_h) + Number(l.balance_h));
  });

  it('APPEL DE MARGE (TTE 2019 → 2020, −33 %) : signalé, titres conservés, régularisable ; sinon vente forcée au passage suivant', async () => {
    const uid = await player({ year: 2019, balance: 1000 });
    await trading.buy(uid, 'stocks', 'TTE', 10);                           // 450  InvestCoins
    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 225 });    // le maximum : 50 %
    const r: any = await trading.advanceYear(uid, 'stocks');               // TTE 30 : valeur 300, dette 225 = 75 % → appel de marge
    expect(r.bankEvents.map((e: any) => e.kind)).toContain('margin_call');
    expect(r.bankEvents.find((e: any) => e.kind === 'margin_call').message).toContain('clôtures annuelles');
    expect((await pos(uid))[0].quantity).toBe(10);
    let l = await loanOf(uid);
    expect(l.meta.marginCall).toBeTruthy();
    const view: any = await trading.getPortfolioView(uid, 'stocks');
    expect(view.bank.loan.state).toBe('call');
    // régularisation : rembourser une partie (dette ≤ 65 % de 300 = 195 après intérêts)
    const rep: any = await lombard.repay(uid, l.id, 60);
    expect(rep.marginState).toBe('ok');
    l = await loanOf(uid);
    expect(l.meta.marginCall).toBeUndefined();
    // deuxième joueur qui ne régularise pas : vente forcée au passage suivant
    const lazy = await player({ year: 2019, balance: 1000 });
    await trading.buy(lazy, 'stocks', 'TTE', 10);
    await lombard.borrow(lazy, { domain: 'stocks', amountCoins: 225 });
    await trading.advanceYear(lazy, 'stocks');                             // appel de marge (2020)
    await query(`UPDATE bank_loans SET balance_h = 30000 WHERE user_id = $1 AND product = 'portfolio'`, [lazy]);   // 2021 : dette encore dans la zone d'appel (rebond des cours)
    const r2: any = await trading.advanceYear(lazy, 'stocks');             // appel non régularisé dans l'année → vente forcée
    expect(r2.bankEvents.map((e: any) => e.kind)).toContain('liquidation');
    expect((await pos(lazy)).length === 0 || (await pos(lazy))[0].quantity < 10).toBe(true);
  });

  it('VENTE FORCÉE (AIR 2019 → 2020, −48 %) : vente proportionnelle décotée, dette ramenée sous le plafond, pièces conservées', async () => {
    const uid = await player({ year: 2019, balance: 3000 });
    await trading.buy(uid, 'stocks', 'AIR', 20);                           // 2 600  InvestCoins
    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 1150 });
    const balBefore = await balanceOf(uid);
    const r: any = await trading.advanceYear(uid, 'stocks');
    const liq = r.bankEvents.find((e: any) => e.kind === 'liquidation');
    expect(liq.message).toContain('VENTE FORCÉE');
    expect(liq.message).toContain('décote');
    const p = await pos(uid);
    expect(p[0].quantity).toBeLessThan(20);
    const l = await loanOf(uid);
    const debt = (Number(l.balance_h) + Number(l.due_interest_h)) / 100;
    const value = p[0].quantity * 67;                                      // AIR 2020 = 67
    expect(debt).toBeLessThanOrEqual(value * 0.5 + 1);                     // sous le plafond à l'ouverture
    // pièces : le produit de la vente forcée a été crédité (échange) puis a remboursé le prêt (destruction)
    const forced = (await query(`SELECT amount, nature FROM investcoins_transactions WHERE user_id = $1 AND reason = 'trade_sell'`, [uid])).rows;
    expect(forced).toHaveLength(1);
    expect(forced[0].nature).toBe('exchange');
    const created = 1150;
    expect(created * 100).toBe(Number(l.principal_paid_h) + Number(l.balance_h) + 0);   // capital créé = capital remboursé + capital restant
    expect(await balanceOf(uid)).toBeLessThan(balBefore + forced[0].amount);           // une partie du produit a servi à rembourser
  });

  it('DETTE RÉSIDUELLE : tout est vendu et il reste une dette → défaut, compte bloqué, nouvel emprunt refusé ; la solder débloque', async () => {
    const uid = await player({ year: 2019, balance: 2000 });
    await trading.buy(uid, 'stocks', 'AIR', 10);                           // 1 300  InvestCoins
    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 600 });
    await query(`UPDATE bank_loans SET balance_h = 400000 WHERE user_id = $1 AND product = 'portfolio'`, [uid]);   // dette gonflée : la vente de tout ne suffit pas
    const r: any = await trading.advanceYear(uid, 'stocks');
    const liq = r.bankEvents.find((e: any) => e.kind === 'liquidation');
    expect(liq.message).toContain('tous tes titres');
    expect((await pos(uid)).length).toBe(0);
    const l = await loanOf(uid);
    expect(l.status).toBe('defaulted');
    expect((await query('SELECT credit_blocked FROM bank_accounts WHERE user_id = $1', [uid])).rows[0].credit_blocked).toBe(true);
    await trading.buy(uid, 'stocks', 'SAN', 1).catch(() => undefined);
    const rej = await rejects(lombard.borrow(uid, { domain: 'stocks', amountCoins: 30 }));
    expect(rej.message).toBeTruthy();
    await investcoinsRepository.applyTransaction(uid, 5000, 'daily_reward');
    const owed = Math.ceil((Number((await loanOf(uid)).balance_h) + Number((await loanOf(uid)).due_interest_h)) / 100);
    const rep: any = await lombard.repay(uid, l.id, owed);
    expect(rep.repaid).toBe(true);
    expect((await query('SELECT credit_blocked FROM bank_accounts WHERE user_id = $1', [uid])).rows[0].credit_blocked).toBe(false);
  });

  it('VENTE DE TITRES EN GARANTIE : remboursement automatique de ce qui manque, ou refus si insuffisant', async () => {
    const uid = await player({ year: 2019, balance: 1000 });
    await trading.buy(uid, 'stocks', 'TTE', 10);                           // 450
    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 225 });
    const s: any = await trading.sell(uid, 'stocks', 'TTE', 5);             // reste 225 de titres : plafond 112 → il faut rembourser ≈113 sur les 225 de la vente
    expect(s.loanAutoRepaid).toBeGreaterThanOrEqual(112);
    expect(s.loanMessage).toContain('a servi à rembourser');
    const l = await loanOf(uid);
    expect((Number(l.balance_h) + Number(l.due_interest_h)) / 100).toBeLessThanOrEqual(225 / 2 + 1);
    // après une baisse (appel de marge), une petite vente ne suffit pas : refusée
    const uid2 = await player({ year: 2019, balance: 1000 });
    await trading.buy(uid2, 'stocks', 'TTE', 10);
    await lombard.borrow(uid2, { domain: 'stocks', amountCoins: 225 });
    await trading.advanceYear(uid2, 'stocks');                              // appel de marge, valeur 300, dette 225
    const refused = await rejects(trading.sell(uid2, 'stocks', 'TTE', 1));  // 30  InvestCoins de produit, il en faudrait bien plus
    expect(refused.code).toBe('NOT_ALLOWED');
    expect(refused.message).toContain('sans garantie suffisante');
    expect((await pos(uid2))[0].quantity).toBe(10);                          // rien n'a été vendu
  });

  it('CRYPTO : plafond 30 %, krach BTC 2017 → 2018 (−72 %) déclenche la vente forcée', async () => {
    const uid = await player({ domain: 'crypto', year: 2017, balance: 2000 });
    await trading.buy(uid, 'crypto', 'BTC', 0.1);                            // 1 300  InvestCoins
    const q: any = await lombard.quote(uid, { domain: 'crypto', amountCoins: 390 });
    expect(q.collateral.capacityCoins).toBe(390);
    expect(((await lombard.quote(uid, { domain: 'crypto', amountCoins: 391 })) as any).reasons.map((r: any) => r.code)).toContain('OVER_CAPACITY');
    await lombard.borrow(uid, { domain: 'crypto', amountCoins: 390 });
    await expect(trading.buy(uid, 'stocks', 'SAN', 1)).rejects.toBeTruthy();  // fléché Crypto ne finance pas la Bourse... (droits de domaine)
    const r: any = await trading.advanceYear(uid, 'crypto');
    expect(r.bankEvents.map((e: any) => e.kind)).toContain('liquidation');
    const left = await pos(uid, 'crypto');
    expect(left.length === 0 || left[0].quantity < 0.1).toBe(true);
    expect(['defaulted', 'liquidated', 'active']).toContain((await loanOf(uid)).status);
  });

  it('CLASSEMENT NET DE DETTES : levier et performance enregistrés au classement', async () => {
    const uid = await player({ year: 2010, balance: 1000 });
    await trading.buy(uid, 'stocks', 'LVMH', 5);
    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 250 });
    await trading.buy(uid, 'stocks', 'LVMH', 2);                              // achat avec les pièces empruntées
    const snap = (await query(`SELECT leverage, performance_pct FROM leaderboard_rankings WHERE user_id = $1 AND domain = 'stocks'`, [uid])).rows[0];
    expect(Number(snap.leverage)).toBeGreaterThan(1);
    const plain = await player({ year: 2010, balance: 1000 });
    await trading.buy(plain, 'stocks', 'LVMH', 5);
    expect((await query(`SELECT leverage FROM leaderboard_rankings WHERE user_id = $1 AND domain = 'stocks'`, [plain])).rows[0].leverage).toBeNull();
  });
});
