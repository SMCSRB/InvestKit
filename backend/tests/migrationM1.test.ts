// Migration M1 (6b-fin + 6c) : parties d'avant l'horloge unique → nouvelle économie, à valeur conservée.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser, setFlatFx, calmUserId, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { importDemo } from '../src/services/crypto/importer';
import { clockService as cryptoClock } from '../src/services/crypto/clockService';
import { cryptoTradingService as crypto } from '../src/services/crypto/tradingService';
import { tradingService as trading } from '../src/services/tradingService';
import { bankPortfolioService as lombard } from '../src/services/bankPortfolioService';
import { realEstateService as re } from '../src/services/realEstateService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { virtualPortfolioRepository } from '../src/repositories/virtualPortfolioRepository';
import { walletService } from '../src/services/walletService';
import { cutoverService, eligibleUsers, CutoverError } from '../src/services/cutoverService';
import { simClockService } from '../src/services/simClockService';
import { STARTING_CAPITAL } from '../src/config/economy';

const D = 86_400_000;
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const cid = () => `m1-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const count = async (table: string, u: string) => Number((await query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE user_id = $1`, [u])).rows[0].n);

describe.skipIf(!hasDb)('migration M1 : valeur conservée', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); await setFlatFx(1.1); }, 120_000);
  afterAll(teardownDb);

  // Un joueur « d'avant » : Bourse (avec prêt sur portefeuille), Crypto, Immobilier, sans horloge unique.
  const legacy = async (balance = 80_000) => {
    const u = await createUser({ id: calmUserId(), balance, tier: 'pro', activeDays: 5 });
    await virtualPortfolioRepository.getOrCreate(u, 'accelerated', 'stocks', 2019);
    await trading.buy(u, 'stocks', 'TTE', 10);
    await lombard.borrow(u, { domain: 'stocks', amountCoins: 200 });
    await cryptoClock.create(u, 'y2020');
    await query('DELETE FROM sim_clocks WHERE user_id = $1', [u]);          // l'horloge unique n'existait pas encore
    await crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins: 3_000 });
    await crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'limit', quantity: '1', triggerPrice: 1 } as any).catch(() => undefined);
    await re.startGame(u, 'executive');
    await query('DELETE FROM sim_clocks WHERE user_id = $1', [u]);
    let l: any;
    for (const x of await src.listListings(2010)) {
      if (x.age === 'old' && x.advertisedWorks === 0 && x.price > 60000 && x.price < 90000 && (await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; }
    }
    await re.purchase(u, { listingId: l.id, downPaymentCoins: Math.ceil(l.price * 0.3), months: 240 });
    return u;
  };

  it('le patrimoine total est identique avant et après ; tout est converti en pièces, les prêts sont soldés, les domaines remis à zéro', async () => {
    const u = await legacy();
    const before = await walletService.snapshot(u);
    expect(before.tradingValue).toBeGreaterThan(0); expect(before.debtCoins).toBeGreaterThan(0); expect(before.realEstateNet).not.toBe(0);
    const r = await cutoverService.migrate(u);
    expect(r.before.totalWealth).toBe(before.totalWealth);
    expect(r.forgiven + r.realEstateShortfall).toBe(0);
    expect(r.after.balance).toBe(Math.max(before.totalWealth, STARTING_CAPITAL));
    const after = await walletService.snapshot(u);
    expect(after.totalWealth).toBe(after.balance);                                  // plus aucune position, aucun bien, aucune dette
    expect(after.debtCoins).toBe(0); expect(after.tradingValue).toBe(0); expect(after.realEstateNet).toBe(0);
    expect(after.balance).toBe(r.after.balance);
    for (const t of ['virtual_portfolios', 'crypto_accounts', 'crypto_positions', 're_games']) expect(await count(t, u), t).toBe(0);
    expect((await query(`SELECT status FROM bank_loans WHERE user_id = $1`, [u])).rows.every((x: any) => x.status === 'repaid')).toBe(true);
    expect(await count('bank_credit_balances', u)).toBe(0);
    expect(await count('m1_cutover', u)).toBe(1);
  });

  it('le registre n\'est pas réécrit : on ajoute des lignes « échange » (liquidation) et « remboursement » ; les statistiques restent neutres', async () => {
    const u = await legacy();
    const rowsBefore = await count('investcoins_transactions', u);
    await cutoverService.migrate(u);
    const added = (await query(`SELECT reason, nature, amount, domain FROM investcoins_transactions WHERE user_id = $1 AND metadata->>'migration' = 'm1' ORDER BY id`, [u])).rows;
    expect(await count('investcoins_transactions', u)).toBe(rowsBefore + added.length + (added.some((x: any) => x.reason === 'economy_cutover_grant') ? 0 : 0));
    expect(added.filter((x: any) => x.reason === 'trade_migration_sell').every((x: any) => x.nature === 'exchange' && x.amount > 0)).toBe(true);
    expect(added.filter((x: any) => x.reason === 'bank_repayment').every((x: any) => x.nature === 'repayment' && x.amount < 0)).toBe(true);
    expect(added.some((x: any) => x.nature === 'creation')).toBe(false);            // aucune pièce créée quand le patrimoine dépasse déjà le capital de départ
  });

  it('un joueur qui avait moins que le capital de départ y est remonté (écriture tracée), jamais retiré', async () => {
    const poor = await createUser({ balance: 500 });
    const r = await cutoverService.migrate(poor);
    expect(r.grant).toBe(STARTING_CAPITAL - 500);
    expect(await balanceOf(poor)).toBe(STARTING_CAPITAL);
    const g = (await query(`SELECT nature, amount FROM investcoins_transactions WHERE user_id = $1 AND reason = 'economy_cutover_grant'`, [poor])).rows;
    expect(g).toEqual([{ nature: 'creation', amount: STARTING_CAPITAL - 500 }]);
    const rich = await createUser({ balance: 250_000 });
    expect((await cutoverService.migrate(rich)).grant).toBe(0);
    expect(await balanceOf(rich)).toBe(250_000);
  });

  it('une dette plus grande que les avoirs est effacée (rapportée), le joueur ne repart jamais en négatif', async () => {
    const u = await createUser({ id: calmUserId(), balance: 1_000, tier: 'pro', activeDays: 5 });
    await virtualPortfolioRepository.getOrCreate(u, 'accelerated', 'stocks', 2019);
    await trading.buy(u, 'stocks', 'TTE', 10);
    await lombard.borrow(u, { domain: 'stocks', amountCoins: 200 });
    await query('UPDATE investcoins_balance SET balance = 0 WHERE user_id = $1', [u]);                // il a tout dépensé
    await query(`UPDATE virtual_portfolios SET positions = '[]' WHERE user_id = $1`, [u]);            // et ses titres ont disparu
    const r = await cutoverService.migrate(u);
    expect(r.forgiven).toBeGreaterThan(0);
    expect(r.after.balance).toBe(STARTING_CAPITAL);
    expect((await query(`SELECT meta FROM bank_loans WHERE user_id = $1`, [u])).rows[0].meta.forgivenCoins).toBe(r.forgiven);
  });

  it('simulation : le rapport est exact et RIEN n\'est écrit', async () => {
    const u = await legacy();
    const bal = await balanceOf(u);
    const r = await cutoverService.migrate(u, { dryRun: true });
    expect(r.after.balance).toBeGreaterThan(0);
    expect(await balanceOf(u)).toBe(bal);
    expect(await count('m1_cutover', u)).toBe(0);
    expect(await count('crypto_accounts', u)).toBe(1); expect(await count('re_games', u)).toBe(1);
    expect((await query(`SELECT status FROM bank_loans WHERE user_id = $1`, [u])).rows.some((x: any) => x.status === 'active')).toBe(true);
    expect(await eligibleUsers()).toContain(u);
  });

  it('rejouer ne fait rien (déjà migré) ; un joueur qui a une horloge unique n\'est pas concerné', async () => {
    const u = await createUser({ balance: 2_000 });
    await cutoverService.migrate(u);
    await expect(cutoverService.migrate(u)).rejects.toMatchObject({ code: 'ALREADY_DONE' });
    expect(await eligibleUsers()).not.toContain(u);
    const fresh = await createUser({ balance: 2_000 });
    await simClockService.ensure(fresh);
    await expect(cutoverService.migrate(fresh)).rejects.toMatchObject({ code: 'NOT_ELIGIBLE' });
    expect(await eligibleUsers()).not.toContain(fresh);
  });

  it('taux de change indisponible : le joueur est laissé tel quel (jamais de valeur devinée)', async () => {
    const u = await legacy();
    await query('DELETE FROM fx_rates');
    await expect(cutoverService.migrate(u)).rejects.toBeInstanceOf(CutoverError);
    await setFlatFx(1.1);
    expect(await count('crypto_accounts', u)).toBe(1); expect(await count('m1_cutover', u)).toBe(0);
  });

  it('après la migration, le joueur rejoue : l\'horloge unique démarre, les domaines repartent à la date de la partie', async () => {
    const u = await legacy();
    const blocked = await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    expect(blocked.status).toBe(409); expect(blocked.body.code).toBe('MIGRATION_REQUIRED');
    await cutoverService.migrate(u);
    const ok = await request(app).get('/api/v1/trading/portfolio?domain=stocks').set('Authorization', tok(u));
    expect(ok.status).toBe(200);
    expect(await simClockService.get(u)).not.toBeNull();
    const adv = await request(app).post('/api/v1/clock/advance').set('Authorization', tok(u)).send({ step: 'month' });
    expect(adv.status).toBe(200);
    // les ordres Crypto en attente d'avant la migration ont été annulés avec un motif
    const cancelled = (await query(`SELECT COUNT(*)::int AS n FROM crypto_orders WHERE user_id = $1 AND status = 'open'`, [u])).rows[0].n;
    expect(cancelled).toBe(0);
  });
});
