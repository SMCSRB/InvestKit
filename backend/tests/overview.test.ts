import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { tradingService } from '../src/services/tradingService';
import { realEstateService as svc } from '../src/services/realEstateService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { computePerformancePct } from '../src/utils/performance';
import { hasDb, setupDb, teardownDb, createUser, legacyCoins } from './helpers';
import { EUROS_PER_COIN } from '../src/config/economy';

describe.skipIf(!hasDb)('vue d\'ensemble réelle (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const get = (uid: string) => request(app).get('/api/v1/overview').set('Authorization', `Bearer ${generateToken(uid, `${uid}@test.local`)}`);

  it('authentification requise ; nouveau compte : des zéros, jamais de chiffres inventés', async () => {
    expect((await request(app).get('/api/v1/overview')).status).toBe(401);
    const u = await createUser({ balance: 500 });
    const r = await get(u);
    expect(r.status).toBe(200);
    expect(r.body.coins).toBe(500);
    expect(r.body.tier).toBe('free');
    expect(r.body.totals).toMatchObject({ tradingValue: 0, coinsAndTrading: 500, invested: 0, gain: 0, performancePct: 0, feesPaid: 0, taxPaid: 0 });
    expect(r.body.realEstate).toEqual({ started: false });
    expect(r.body.risk).toBeNull();
    expect(r.body.bank.debtCoins).toBe(0);
    expect(JSON.stringify(r.body)).not.toMatch(/245|Dupont|Sharpe|winRate/);   // aucune valeur de démonstration
  });

  it('Bourse et Crypto : cohérent avec les portefeuilles, gain = valeur + ventes − achats, risque calculé', async () => {
    const u = await createUser({ balance: 5000, tier: 'pro' });
    await tradingService.buy(u, 'stocks', 'LVMH', 10, 'cto');
    await tradingService.buy(u, 'crypto', 'BTC', 1);
    await tradingService.advanceYear(u, 'stocks');
    const r = (await get(u)).body;
    const view = await tradingService.getPortfolioView(u, 'stocks');
    expect(r.tier).toBe('pro');
    expect(r.trading.stocks).toMatchObject({ positions: 1, marketValue: Math.round(view.marketValue), simulatedYear: 2011 });
    expect(r.trading.crypto.positions).toBe(1);
    const s = r.trading.stocks;
    expect(s.gain).toBe(Math.round(view.marketValue + 0 - s.invested));
    expect(s.performancePct).toBeCloseTo(computePerformancePct({ marketValue: view.marketValue, totalBought: s.invested, totalProceeds: 0 }), 0);
    expect(r.totals.invested).toBe(r.trading.stocks.invested + r.trading.crypto.invested);
    expect(r.totals.coinsAndTrading).toBe(r.coins + r.trading.stocks.marketValue + r.trading.crypto.marketValue);
    expect(r.risk).toMatchObject({ domain: expect.stringMatching(/stocks|crypto/) });
    expect(r.risk.score).toBeGreaterThan(0);
  });

  it('Immobilier (en euros, séparé) et dette bancaire', async () => {
    const u = await createUser({ balance: legacyCoins(30000), freeDomain: 'real_estate' });
    await svc.startGame(u, 'executive');
    let listing: any;
    for (const l of await src.listListings(2010)) { if (l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 50000 && l.price < 90000) { listing = l; break; } }
    await svc.purchase(u, { listingId: listing.id, downPaymentCoins: legacyCoins(1500), months: 240 });
    await personal.borrow(u, { amountCoins: legacyCoins(200), months: 24 });
    const r = (await get(u)).body;
    expect(r.realEstate).toMatchObject({ started: true, properties: 1, year: 2010, profile: 'executive' });
    expect(r.realEstate.equityEuros).toBeGreaterThan(0);
    expect(r.realEstate.equityCoinsApprox).toBe(Math.round(r.realEstate.equityEuros / EUROS_PER_COIN));
    expect(r.bank.debtCoins).toBeGreaterThanOrEqual(200);
    expect(r.notes.join(' ')).toMatch(/pas additionnés/);
  });

  it('frais et impôts payés remontés depuis le portefeuille', async () => {
    const u = await createUser({ balance: 1000 });
    await query(`INSERT INTO virtual_portfolios (user_id, mode, domain, positions, simulated_year, total_bought, total_proceeds, tax_state) VALUES ($1,'accelerated','stocks','[]',2015,100,150,$2)`, [u, JSON.stringify({ feesPaid: 7, taxPaid: 11 })]);
    const r = (await get(u)).body;
    expect(r.totals).toMatchObject({ feesPaid: 7, taxPaid: 11, invested: 100, gain: 50, performancePct: 50 });
  });
});
