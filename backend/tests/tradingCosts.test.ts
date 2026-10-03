import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TRADING_COSTS, TRADING_TAX } from '../src/config/tradingRules';
import { brokerageFee, saleTax, emptyTaxState } from '../src/engine/trading/costs';
import { tradingService } from '../src/services/tradingService';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';

beforeEach(() => { TRADING_COSTS.enabled = true; TRADING_TAX.enabled = true; });

const ts = () => emptyTaxState();

describe('courtage', () => {
  it('0,5 % sur une action, minimum 1 InvestCoin, arrondi vers le haut', () => {
    expect(brokerageFee('stock', 1000)).toBe(5);
    expect(brokerageFee('stock', 50)).toBe(1);
    expect(brokerageFee('stock', 1001)).toBe(6);
    expect(brokerageFee('etf', 1000)).toBe(4);   // 0,35 % → 3,5 → 4
    expect(brokerageFee('crypto', 2000)).toBe(10);
  });
  it('désactivé : aucun frais', () => {
    TRADING_COSTS.enabled = false;
    expect(brokerageFee('stock', 1000)).toBe(0);
  });
});

describe('impôt sur la plus-value', () => {
  it('compte-titres : flat tax 12,8 % + prélèvements sociaux (2024 : 17,2 %, 2026 : 18,6 %)', () => {
    const a = saleTax({ account: 'cto', year: 2024, proceeds: 2000, basis: 1000, taxState: ts() });
    expect(a).toMatchObject({ gain: 1000, incomeTax: 128, social: 172, total: 300 });
    const b = saleTax({ account: 'cto', year: 2026, proceeds: 2000, basis: 1000, taxState: ts() });
    expect(b.total).toBe(128 + 186);
  });
  it('moins-value ou gain nul : aucun impôt', () => {
    expect(saleTax({ account: 'cto', year: 2024, proceeds: 900, basis: 1000, taxState: ts() }).total).toBe(0);
    expect(saleTax({ account: 'cto', year: 2024, proceeds: 1000, basis: 1000, taxState: ts() }).total).toBe(0);
  });
  it('PEA : après 5 ans, seulement les prélèvements sociaux ; avant, flat tax', () => {
    const state = { ...ts(), peaOpenedYear: 2015 };
    const old = saleTax({ account: 'pea', year: 2020, proceeds: 2000, basis: 1000, taxState: state });
    expect(old).toMatchObject({ incomeTax: 0, social: 172, total: 172 });
    const young = saleTax({ account: 'pea', year: 2019, proceeds: 2000, basis: 1000, taxState: state });
    expect(young.incomeTax).toBe(128);
    expect(young.total).toBe(300);
    const never = saleTax({ account: 'pea', year: 2024, proceeds: 2000, basis: 1000, taxState: ts() });
    expect(never.incomeTax).toBe(128); // PEA jamais alimenté : pas d'exonération
  });
  it('crypto : sous 305  InvestCoins de cessions dans l\'année, pas d\'impôt ; au-dessus, flat tax', () => {
    const low = saleTax({ account: 'crypto', year: 2024, proceeds: 300, basis: 100, taxState: ts() });
    expect(low.total).toBe(0);
    const cumul = saleTax({ account: 'crypto', year: 2024, proceeds: 200, basis: 100, taxState: { ...ts(), cryptoSales: { '2024': 200 } } });
    expect(cumul.total).toBe(Math.ceil(100 * 0.128) + Math.ceil(100 * 0.172));
    const other = saleTax({ account: 'crypto', year: 2024, proceeds: 200, basis: 100, taxState: { ...ts(), cryptoSales: { '2023': 900 } } });
    expect(other.total).toBe(0); // le seuil se calcule année par année
  });
  it('désactivé : aucun impôt', () => {
    TRADING_TAX.enabled = false;
    expect(saleTax({ account: 'cto', year: 2024, proceeds: 2000, basis: 1000, taxState: ts() }).total).toBe(0);
  });
});

describe.skipIf(!hasDb)('achat / vente avec frais et impôts (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const advance = async (uid: string, domain: string, n: number) => { for (let i = 0; i < n; i++) await tradingService.advanceYear(uid, domain); };

  it('CTO : frais à l\'achat et à la vente, impôt 2013 (19 % + 15,5 %), pièces détruites', async () => {
    const uid = await createUser({ tier: 'pro', balance: 100000 });
    const buy = await tradingService.buy(uid, 'stocks', 'LVMH', 100, 'cto'); // 100 × 120 = 12 000
    expect(buy).toMatchObject({ cost: 12000, fee: 60, account: 'cto' });
    await advance(uid, 'stocks', 3); // 2013 : 140
    const quote = await tradingService.quote(uid, 'stocks', 'sell', 'LVMH', 100, 'cto');
    expect(quote).toMatchObject({ amount: 14000, fee: 70, gain: 2000, incomeTax: 380, social: 310, tax: 690 });
    const sell = await tradingService.sell(uid, 'stocks', 'LVMH', 100, 'cto');
    expect(sell).toMatchObject({ proceeds: 14000, fee: 70, tax: 690, netProceeds: 14000 - 70 - 690 });
    expect(await balanceOf(uid)).toBe(100000 - 12000 - 60 + 14000 - 70 - 690);
    expect(100000 + await ledgerSum(uid)).toBe(await balanceOf(uid)); // solde de départ + écritures du ledger

    const sinks = await investcoinsRepository.sinksByDomainAndReason();
    expect(sinks.stocks.fee_brokerage.destroyed).toBeGreaterThanOrEqual(130);
    expect(sinks.stocks.tax_capital_gains.destroyed).toBeGreaterThanOrEqual(690);
    const view = await tradingService.getPortfolioView(uid, 'stocks');
    expect(view.costs.feesPaid).toBe(130);
    expect(view.costs.taxPaid).toBe(690);
  });

  it('PEA : ouvert au premier achat, exonéré d\'impôt sur le revenu après 5 ans (2015)', async () => {
    const uid = await createUser({ tier: 'pro', balance: 100000 });
    await tradingService.buy(uid, 'stocks', 'LVMH', 100); // PEA par défaut
    const v0 = await tradingService.getPortfolioView(uid, 'stocks');
    expect(v0.costs.pea).toMatchObject({ openedYear: 2010, exemptFromYear: 2015, deposits: 12000 });
    await advance(uid, 'stocks', 4); // 2014 : moins de 5 ans → flat tax
    const early = await tradingService.quote(uid, 'stocks', 'sell', 'LVMH', 100);
    expect(early.incomeTax).toBeGreaterThan(0);
    await advance(uid, 'stocks', 1); // 2015 : 160
    const q = await tradingService.quote(uid, 'stocks', 'sell', 'LVMH', 100);
    expect(q).toMatchObject({ amount: 16000, gain: 4000, incomeTax: 0, social: 620, tax: 620 });
    const sell = await tradingService.sell(uid, 'stocks', 'LVMH', 100);
    expect(sell.tax).toBe(620);
  });

  it('plafond de versements du PEA : au-delà, refusé (le compte-titres reste possible)', async () => {
    const uid = await createUser({ tier: 'pro', balance: 500000 });
    await expect(tradingService.buy(uid, 'stocks', 'LVMH', 1300, 'pea')).rejects.toMatchObject({ code: 'PEA_CEILING' });
    await expect(tradingService.buy(uid, 'stocks', 'LVMH', 1300, 'cto')).resolves.toMatchObject({ account: 'cto' });
  });

  it('même titre sur deux enveloppes : il faut préciser laquelle vendre', async () => {
    const uid = await createUser({ tier: 'pro', balance: 100000 });
    await tradingService.buy(uid, 'stocks', 'TTE', 10, 'pea');
    await tradingService.buy(uid, 'stocks', 'TTE', 10, 'cto');
    await expect(tradingService.sell(uid, 'stocks', 'TTE', 5)).rejects.toMatchObject({ code: 'INVALID_ACCOUNT' });
    await expect(tradingService.sell(uid, 'stocks', 'TTE', 5, 'cto')).resolves.toMatchObject({ account: 'cto' });
    await expect(tradingService.buy(uid, 'stocks', 'TTE', 1, 'livret')).rejects.toMatchObject({ code: 'INVALID_ACCOUNT' });
  });

  it('crypto : imposée à la vente contre euros (2016 : 19 % + 15,5 %), seuil des 305  InvestCoins annuel', async () => {
    const uid = await createUser({ tier: 'pro', balance: 100000 });
    await tradingService.buy(uid, 'crypto', 'BTC', 1); // 2013 : 700
    await advance(uid, 'crypto', 3); // 2016 : 900
    const sell = await tradingService.sell(uid, 'crypto', 'BTC', 1);
    expect(sell).toMatchObject({ proceeds: 900, fee: 5, tax: Math.ceil(200 * 0.19) + Math.ceil(200 * 0.155), account: 'crypto' });
    await expect(tradingService.buy(uid, 'crypto', 'BTC', 1, 'pea')).rejects.toMatchObject({ code: 'INVALID_ACCOUNT' });
  });

  it('crypto : petites cessions de l\'année (≤ 305  InvestCoins) non imposées', async () => {
    const uid = await createUser({ tier: 'pro', balance: 100000 });
    await advance(uid, 'crypto', 2); // 2015 : l'ETH existe
    await tradingService.buy(uid, 'crypto', 'ETH', 0.3); // 1 InvestCoin
    await advance(uid, 'crypto', 2); // 2017 : 750
    const s = await tradingService.sell(uid, 'crypto', 'ETH', 0.3);
    expect(s.proceeds).toBe(225);
    expect(s.tax).toBe(0);
  });
});

describe.skipIf(!hasDb)('journal des ordres (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  it('liste achat, frais, vente, frais et impôt du domaine, sans toucher aux autres écritures', async () => {
    const uid = await createUser({ tier: 'pro', balance: 100000 });
    await tradingService.buy(uid, 'stocks', 'LVMH', 10, 'cto');
    for (let i = 0; i < 3; i++) await tradingService.advanceYear(uid, 'stocks');
    await tradingService.sell(uid, 'stocks', 'LVMH', 10, 'cto');
    const { orders } = await tradingService.orders(uid, 'stocks');
    const kinds = orders.map((o: any) => o.kind).sort();
    expect(kinds).toEqual(['buy', 'fee', 'fee', 'sell', 'tax']);
    const buy = orders.find((o: any) => o.kind === 'buy') as any;
    expect(buy).toMatchObject({ symbol: 'LVMH', quantity: 10, price: 120, account: 'cto' });
    expect(buy.amount).toBeLessThan(0);
    expect((await tradingService.orders(uid, 'crypto')).orders).toEqual([]);
  });
});
