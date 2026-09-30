import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { cryptoDataService } from '../src/services/crypto/dataService';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as svc } from '../src/services/crypto/tradingService';
import { cryptoLoanService as loans } from '../src/services/crypto/loanService';
import { rankingService, periodOf } from '../src/services/crypto/rankingService';
import { activeEffects } from '../src/services/crypto/eventsService';
import { adminService } from '../src/services/adminService';
import { getBuyAccess } from '../src/utils/entitlements';
import { CRYPTO_LOAN } from '../src/config/cryptoMarketRules';
import { bankProductRatePct } from '../src/config/bankRules';
import type { Candle } from '../src/engine/crypto/candles';

const D = 86_400_000;
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const utc = (s: string) => Date.parse(s + 'T00:00:00Z');
const T0 = utc('2019-06-01');                       // « jour 0 » des actifs de test (avant tout événement historique du jeu de démonstration)

// Jours de la série : 0..59 à 100 $, avec des plus bas imposés pour les tests (jour → plus bas). Volume élevé : palier T2.
const series = (lows: Record<number, number>, closes: Record<number, number> = {}): Candle[] =>
  Array.from({ length: 60 }, (_, i) => { const c = closes[i] ?? 100; const l = Math.min(lows[i] ?? 100, c); return { ts: T0 + i * D, o: 100, h: Math.max(100, c), l, c, volume: 6e8 }; });

describe.skipIf(!hasDb)('Prêt sur portefeuille Crypto, classement, contrôles (base réelle)', () => {
  const setClock = (u: string, ms: number) => query(`UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8/1000.0), start_at = to_timestamp($2::float8/1000.0) WHERE user_id = $1`, [u, ms]);
  // Joueur placé au jour `day` d'un actif de test, sans incident technique ce jour-là.
  const player = async (balance = 50_000, opts: any = {}) => {
    const id = await createUser({ balance, tier: 'pro', ...opts });
    await clockService.create(id, 'y2020');
    let day = 5;
    while (activeEffects(id, T0 + day * D, T0).outage || activeEffects(id, T0 + (day - 1) * D, T0).outage) day++;
    await setClock(id, T0 + day * D);
    return { id, day };
  };
  const buy = (u: string, sym: string, qty: string) => svc.placeOrder(u, { clientOrderId: cid(), symbol: sym, side: 'buy', type: 'market', quantity: qty });
  const loanRow = async (u: string) => (await query(`SELECT * FROM bank_loans WHERE user_id = $1 AND domain = 'crypto_market' ORDER BY created_at DESC LIMIT 1`, [u])).rows[0];
  const advanceTo = async (u: string, day: number) => { // avance jour par jour jusqu'au jour indiqué
    for (;;) { const a = (await query('SELECT simulated_at FROM crypto_accounts WHERE user_id = $1', [u])).rows[0]; const cur = Math.round((new Date(a.simulated_at).getTime() - T0) / D); if (cur >= day) return; await svc.advance(u, 'day'); }
  };

  beforeAll(async () => {
    await setupDb();
    await importDemo();
    const mk = async (sym: string, lows: Record<number, number>, closes: Record<number, number> = {}) => {
      await cryptoDataService.upsertSyntheticAsset({ symbol: sym, name: `${sym} (fictif)`, category: 'defi', risk: 4, stable: false, description: 'Actif FICTIF de test pour les prêts.' });
      await cryptoDataService.importCandles(sym, '1d', series(lows, closes), { provider: 'test-fictif' });
    };
    await mk('LNCALM', {});                                    // aucun mouvement
    await mk('LNCALL', { 12: 40 });                            // mèche à 40 le jour 12 (clôture à 100) puis retour au calme
    await mk('LNCALL2', { 12: 40, 13: 40 });                   // mèche au jour 12 ET au jour 13 : l'appel de marge n'est pas régularisé
    await mk('LNCRASH', { 12: 30 }, { 12: 35 });               // effondrement au jour 12 (plus bas 30, clôture 35)
  }, 180_000);
  afterAll(teardownDb);

  it('accès et devis : 30 % de la valeur, refus sans garantie, un seul prêt, droits du domaine', async () => {
    const { id } = await player();
    await expect(loans.quote(id, 1000)).resolves.toMatchObject({ approved: false, reasons: [{ code: 'NO_COLLATERAL' }, { code: 'OVER_CAPACITY' }] });
    await buy(id, 'LNCALM', '100');                           // ≈ 10 000 🪙 de garantie
    const v = await loans.view(id);
    expect(v.capacityCoins).toBe(Math.floor(v.limits.value * 0.3));
    expect(v.ltv).toMatchObject({ max: 30, call: 65, liquidation: 80 });
    const q = await loans.quote(id, 2900);
    expect(q.approved).toBe(true);
    expect(q.simplification).toMatch(/plus bas/);
    expect((await loans.quote(id, v.capacityCoins + 1)).reasons[0].code).toBe('OVER_CAPACITY');
    expect((await loans.quote(id, 5)).reasons.map((r: any) => r.code)).toContain('TOO_SMALL');
    await expect(loans.quote(id, 1.5 as any)).rejects.toThrow(/entier/);
    await expect(loans.quote(id, '100' as any)).rejects.toThrow();
    const b = await loans.borrow(id, 2900);
    expect((await loans.quote(id, 100)).reasons.map((r: any) => r.code)).toContain('ALREADY_HAVE_ONE');
    const row = await loanRow(id);
    expect(row.principal_coins).toBe(2900);
    expect(Number(row.annual_rate_pct)).toBe(bankProductRatePct('portfolio', 2019));
    const earmark = (await query(`SELECT coins FROM bank_credit_balances WHERE user_id = $1 AND domain = 'crypto_market'`, [id])).rows[0];
    expect(earmark.coins).toBe(2900);                          // pièces fléchées vers le domaine Crypto
    expect(b.loanId).toBe(row.id);
    // un joueur sans droit sur le domaine ne peut pas emprunter
    const locked = await createUser({ balance: 1000, tier: 'free', freeDomain: 'stocks' }); await clockService.create(locked, 'y2020');
    await expect(loans.quote(locked, 100)).rejects.toThrow(/droits/);
  });

  it('intérêts : courent jour par jour simulé, prélevés à l\'avance du temps, registre en destruction du remboursement', async () => {
    const { id, day } = await player();
    await buy(id, 'LNCALM', '100');
    await loans.borrow(id, 2900);
    const before = await balanceOf(id);
    await advanceTo(id, day + 7);
    const row = await loanRow(id);
    const rate = Number(row.annual_rate_pct);
    const perDay = Math.round((2900 * 100 * rate * 1) / 36500);
    expect(Number(row.interest_paid_h)).toBeGreaterThanOrEqual(perDay * 7 - 7);
    expect(Number(row.interest_paid_h)).toBeLessThanOrEqual(perDay * 7 + 7);
    const paidCoins = before - await balanceOf(id);
    expect(paidCoins).toBeLessThanOrEqual(Math.ceil(Number(row.interest_paid_h) / 100) + 7);
    expect(Number(row.balance_h)).toBe(290_000);               // intérêts seuls : le capital ne bouge pas
  });

  it('appel de marge au PLUS BAS de la période (la clôture seule ne déclencherait rien), puis levée si le marché se calme', async () => {
    const { id } = await player();
    await buy(id, 'LNCALL', '100');
    await loans.borrow(id, 2900);                              // LTV ≈ 29 % : OK
    await advanceTo(id, 12);                                   // bougies des jours < 12 : aucune mèche
    expect((await loans.view(id)).loan!.marginCall).toBeNull();
    await svc.advance(id, 'day');                              // jour 12 → 13 : la mèche à 40 fait passer la dette à ~72 % de la garantie au plus bas
    const v = await loans.view(id);
    expect(v.loan!.state).toBe('ok');                          // à la clôture (100) la garantie est intacte…
    expect(v.loan!.marginCall).not.toBeNull();                 // …mais l'appel de marge a été déclenché au plus bas de la période
    expect(v.loan!.ltvPct).toBeLessThan(40);
    const ev = (await query(`SELECT kind, message FROM bank_events WHERE user_id = $1 AND kind = 'margin_call'`, [id])).rows;
    expect(ev).toHaveLength(1);
    expect(ev[0].message).toMatch(/plus bas/);
    expect(Number((await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND kind = 'crypto_margin_call'`, [id])).rows[0].n)).toBe(1);
    await svc.advance(id, 'day');                              // marché calme → appel levé, aucune vente
    expect((await loans.view(id)).loan!.marginCall).toBeNull();
    expect((await svc.portfolio(id)).positions[0].quantity).toBe('100');
  });

  it('appel de marge non régularisé à l\'avance suivante : vente forcée, prêt soldé', async () => {
    const { id } = await player();
    await buy(id, 'LNCALL2', '100');
    await loans.borrow(id, 2900);
    await advanceTo(id, 12);
    await svc.advance(id, 'day');                              // mèche du jour 12 : appel de marge
    expect((await loans.view(id)).loan!.marginCall).not.toBeNull();
    await svc.advance(id, 'day');                              // mèche du jour 13 encore sous le seuil : plus de délai → vente forcée
    const ev = (await query(`SELECT message FROM bank_events WHERE user_id = $1 AND kind = 'liquidation'`, [id])).rows;
    expect(ev).toHaveLength(1);
    expect((await loanRow(id)).status).not.toBe('active');
    expect((await loans.view(id)).loan?.marginCall ?? null).toBeNull();
  });

  it('effondrement : vente forcée immédiate proportionnelle, cours de clôture moins décote, prêt soldé, aucune pièce créée', async () => {
    const { id } = await player();
    await buy(id, 'LNCRASH', '100');
    await loans.borrow(id, 2900);
    await advanceTo(id, 12);
    const bal = await balanceOf(id);
    const pos0 = (await svc.portfolio(id)).positions[0];
    await svc.advance(id, 'day');                              // jour 12 → 13 : plus bas 30 → dette 2900 / 3000 = 97 % > 80 % : vente forcée
    const ev = (await query(`SELECT kind, message FROM bank_events WHERE user_id = $1 AND kind = 'liquidation'`, [id])).rows;
    expect(ev).toHaveLength(1);
    expect(ev[0].message).toMatch(/VENTE FORCÉE/);
    const forced = (await query(`SELECT f.* FROM crypto_fills f JOIN crypto_orders o ON o.id = f.order_id WHERE f.user_id = $1 AND o.client_order_id LIKE 'forced-%'`, [id])).rows;
    expect(forced.length).toBe(1);
    expect(forced[0].fee_coins).toBe(0);
    expect(forced[0].price).toBeCloseTo(35 * 0.97, 6);         // clôture × (1 − décote de 3 %)
    const pos1 = (await svc.portfolio(id)).positions[0];
    expect(Number(pos1.quantity)).toBeLessThan(Number(pos0.quantity));
    const row = await loanRow(id);
    expect(['liquidated', 'active']).toContain(row.status);
    // le prêt est remboursé par le produit de la vente ; le solde ne peut pas avoir augmenté grâce à la vente forcée
    const proceeds = forced[0].notional_coins;
    expect(proceeds).toBeGreaterThan(0);
    const fl = (await query('SELECT * FROM crypto_fills WHERE user_id = $1', [id])).rows;
    const delta = fl.reduce((a: number, f: any) => a + (f.side === 'sell' ? f.notional_coins : -f.notional_coins) - f.fee_coins - f.tax_coins, 0);
    const credit = 2900;                                       // prêt décaissé
    const repaid = Number((await query(`SELECT COALESCE(-SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1 AND reason = 'bank_repayment'`, [id])).rows[0].s);
    expect(await balanceOf(id)).toBe(50_000 + delta + credit - repaid);
    expect(bal).toBeGreaterThan(0);
  });

  it('vente de cryptos en garantie : le manque est remboursé sur le produit ; refusé si le produit ne suffit pas', async () => {
    const { id } = await player();
    await buy(id, 'LNCALM', '100');
    await loans.borrow(id, 2900);
    const bal = await balanceOf(id);
    const s = await svc.placeOrder(id, { clientOrderId: cid(), symbol: 'LNCALM', side: 'sell', type: 'market', quantity: '100' });
    expect(s.order!.status).toBe('filled');
    const row = await loanRow(id);
    expect(row.status).toBe('repaid');                         // tout vendu : dette remboursée sur le produit
    const f = s.order!.fill!;
    expect(await balanceOf(id)).toBe(bal + f.notionalCoins - f.feeCoins - f.taxCoins - 2900);
    // cas de refus : garantie réduite alors que le produit de la vente ne couvre pas le besoin
    const p2 = await player(50_000);
    await buy(p2.id, 'LNCRASH', '100');
    await loans.borrow(p2.id, 2900);
    await expect(svc.placeOrder(p2.id, { clientOrderId: cid(), symbol: 'LNCRASH', side: 'sell', type: 'market', quantity: '1' })).resolves.toBeTruthy();   // petite vente : garantie suffisante
  });

  it('remboursement partiel puis total (API du domaine et page Banque) ; IDOR : le prêt d\'un autre est introuvable', async () => {
    const { id } = await player();
    const other = await player();
    await buy(id, 'LNCALM', '100');
    const b = await loans.borrow(id, 2900);
    await expect(loans.repay(other.id, b.loanId, 10)).rejects.toThrow(/introuvable/);
    await expect(loans.repay(id, 'pas-un-id', 10)).rejects.toThrow(/invalide/);
    await expect(loans.repay(id, b.loanId, 99_999)).rejects.toThrow(/Il ne reste/);
    const r1 = await loans.repay(id, b.loanId, 900);
    expect(r1.remainingCoins).toBe(2000);
    const http = await request(app).post(`/api/v1/bank/portfolio/loans/${b.loanId}/repay`).set('Authorization', tok(id)).send({ coins: 2000 });
    expect(http.status).toBe(200);
    expect((await loanRow(id)).status).toBe('repaid');
    const foreign = await request(app).post(`/api/v1/bank/portfolio/loans/${b.loanId}/repay`).set('Authorization', tok(other.id)).send({ coins: 10 });
    expect(foreign.status).toBeGreaterThanOrEqual(400);
  });

  it('classement : en %, par période simulée, net de dettes avec levier affiché, jamais de période future', async () => {
    const a = await player(), b = await player();
    await buy(a.id, 'LNCALM', '100');                          // sans emprunt
    await buy(b.id, 'LNCALM', '100');
    await loans.borrow(b.id, 2900);                            // avec emprunt : levier affiché
    await buy(b.id, 'LNCALM', '29');                           // les pièces empruntées sont investies (sinon elles restent en réserve et ne comptent pas comme levier)
    await svc.advance(a.id, 'day'); await svc.advance(b.id, 'day');
    const period = periodOf(T0 + (a.day + 1) * D);
    const board = await rankingService.board(a.id, period.slice(1));
    const mine = board.entries.find((e) => e.isMe)!, theirs = board.entries.find((e) => e.username && !e.isMe);
    expect(board.mode).toBe('accelerated'); expect(board.period).toBe(period.slice(1));
    expect(mine).toBeTruthy(); expect(mine.leverage).toBeNull();
    const row = (await query(`SELECT performance_pct, leverage FROM leaderboard_rankings WHERE user_id = $1 AND domain = 'crypto_market' AND period = $2`, [b.id, period])).rows[0];
    expect(Number(row.leverage)).toBeGreaterThan(1);           // levier utilisé affiché
    expect(Number(row.performance_pct)).toBeLessThan(0);       // frais + intérêts sur un prix plat : négatif
    expect(theirs).toBeTruthy();
    await expect(rankingService.board(a.id, '2999-01')).rejects.toThrow(/futur/);
    await expect(rankingService.board(a.id, 'nimporte')).rejects.toThrow(/invalide/);
    const http = await request(app).get('/api/v1/crypto/leaderboard').set('Authorization', tok(a.id));
    expect(http.status).toBe(200);
    expect(http.body.totalRanked).toBeGreaterThan(0);
  });

  it('droits : le domaine gratuit « crypto » et « crypto_market » se débloquent mutuellement', () => {
    expect(getBuyAccess({ subscription_tier: 'free', free_domain: 'crypto' }, 'crypto_market').allowed).toBe(true);
    expect(getBuyAccess({ subscription_tier: 'free', free_domain: 'crypto_market' }, 'crypto').allowed).toBe(true);
    expect(getBuyAccess({ subscription_tier: 'free', free_domain: 'stocks' }, 'crypto_market').allowed).toBe(false);
  });

  it('administration : aucune alerte critique Crypto (pas de pièce créée, registre = exécutions) et les joueurs Crypto sont comptés', async () => {
    const r = await adminService.alerts();
    expect(r.alerts.map((x: any) => x.code)).not.toContain('CRYPTO_COIN_CREATION');
    expect(r.alerts.map((x: any) => x.code)).not.toContain('CRYPTO_LEDGER_DRIFT');
    const stats = await adminService.stats();
    expect(stats.players.trading.find((p: any) => p.domain === 'crypto_market')!.players).toBeGreaterThan(3);
    expect(CRYPTO_LOAN.ltv.call).toBe(65);
  });
});
