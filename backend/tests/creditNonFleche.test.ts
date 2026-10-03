// Décision : le prêt personnel est NON affecté (pièces libres, dépensables partout, comme dans la réalité) ;
// le prêt immobilier reste attaché au bien (il ne crée jamais de pièces libres) ; le prêt sur portefeuille reste fléché vers son domaine.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId, setFlatFx } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as crypto } from '../src/services/crypto/tradingService';
import { realEstateService as re } from '../src/services/realEstateService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';

const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;

describe.skipIf(!hasDb)('crédit : prêt personnel libre, prêt immobilier attaché au bien', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); await setFlatFx(1.1234); }, 120_000);
  afterAll(teardownDb);

  it('prêt personnel (minimum 500) puis achat Crypto de 150 avec 100 pièces propres : l\'achat passe, aucune pièce réservée', async () => {
    const u = await createUser({ id: calmUserId(), balance: 100, tier: 'pro' });
    await re.startGame(u, 'employee');
    await clockService.create(u, 'y2020');
    // sans le prêt, 150 ne passent pas avec 100 pièces propres
    expect(await crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins: 150 }).catch((e) => e.message)).toMatch(/insuffisant/);
    const loan: any = await personal.borrow(u, { amountCoins: 500, months: 24 });
    expect(loan.message).toContain('solde libre');
    expect(await balanceOf(u)).toBe(600);
    expect((await query(`SELECT COALESCE(SUM(coins),0)::int AS s FROM bank_credit_balances WHERE user_id = $1`, [u])).rows[0].s).toBe(0);
    const pf: any = await crypto.portfolio(u);
    expect(pf.spendableCoins).toBe(600);
    expect(pf.reservedElsewhereCoins).toBe(0);
    const q: any = await crypto.quote(u, 'DEMO1', 'buy', undefined, 150);
    expect(q.affordable).toBe(true);
    const r = await crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins: 150 });
    expect(r.order!.status).toBe('filled');
    expect(r.order!.fill!.notionalCoins + r.order!.fill!.feeCoins).toBeLessThanOrEqual(150);
  });

  it('prêt personnel : dépensable aussi en Bourse (aucun fléchage)', async () => {
    const { investcoinsRepository } = await import('../src/repositories/investcoinsRepository');
    const u = await createUser({ balance: 3000, freeDomain: 'real_estate' });   // pièces propres : la banque exige une réserve avant de prêter
    await re.startGame(u, 'employee');
    await personal.borrow(u, { amountCoins: 500, months: 24 });
    await investcoinsRepository.applyTransaction(u, -3500, 'trade_buy', { domain: 'stocks' });
    expect(await balanceOf(u)).toBe(0);
  });

  it('prêt immobilier : attaché au bien, il ne crée AUCUNE pièce (ni libre ni réservée) ; le joueur ne reçoit que ce qu\'il paie en moins', async () => {
    const u = await createUser({ balance: 200000, freeDomain: 'real_estate' });
    await re.startGame(u, 'executive');
    let l: any;
    for (const x of await src.listListings(2010)) {
      if (x.age === 'old' && x.advertisedWorks === 0 && x.price > 60000 && x.price < 90000 && (await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; }
    }
    const before = await balanceOf(u);
    const res: any = await re.purchase(u, { listingId: l.id, downPaymentCoins: Math.ceil(l.price * 0.3), months: 240 });
    expect(res.success).toBe(true);
    expect(res.summary.costs.loanPrincipal).toBeGreaterThan(0);                     // il y a bien un prêt immobilier
    const rows = (await query(`SELECT amount, reason FROM investcoins_transactions WHERE user_id = $1`, [u])).rows;
    expect(rows.every((r) => r.amount < 0)).toBe(true);                             // aucune pièce créditée par le prêt
    expect(rows.some((r) => r.reason === 'bank_disburse')).toBe(false);
    expect((await query(`SELECT COUNT(*)::int AS n FROM bank_loans WHERE user_id = $1`, [u])).rows[0].n).toBe(0);   // pas un prêt de la Banque
    expect((await query(`SELECT COUNT(*)::int AS n FROM bank_credit_balances WHERE user_id = $1`, [u])).rows[0].n).toBe(0);
    expect(before - (await balanceOf(u))).toBe(-rows.reduce((t, r) => t + r.amount, 0));   // le solde baisse exactement de l'apport et des frais
  });
});
