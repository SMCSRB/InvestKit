// Le tableau de bord, la checklist et le classement lisaient l'ANCIENNE Crypto (domaine « crypto »). Un achat sur le nouveau marché
// (« crypto_market ») doit apparaître partout : patrimoine, Titres, Capital investi, checklist, progression du classement.
// + patrimoine à deux chiffres (financier / total) et plus aucun « € » sur le tableau de bord.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, calmUserId, setFlatFx } from './helpers';
import { query } from '../src/utils/db';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as crypto } from '../src/services/crypto/tradingService';
import { rankingService } from '../src/services/crypto/rankingService';
import { overviewService, mergeCryptoSummaries, cryptoMarketSummary } from '../src/services/overviewService';
import { walletService } from '../src/services/walletService';
import { onboardingService } from '../src/services/onboardingService';
import { realEstateService as re } from '../src/services/realEstateService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { wealthBreakdown, netWorthCoins } from '../src/engine/wealth';
import { RANKING_MIN_INVESTED } from '../src/config/economy';

const D = 86_400_000;
const START = Date.parse('2020-01-01T00:00:00Z');
const FX = 1.1234;
const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const root = path.resolve(__dirname, '../..');

describe('patrimoine à deux chiffres (règle pure)', () => {
  it('financier = liquidités + titres − dettes ; total = financier + immobilier net de revente', () => {
    const w = wealthBreakdown({ coins: 49949, tradingValue: 150, debtCoins: 0, realEstateNetCoins: 0 });
    expect(w).toEqual({ financial: 50099, realEstateNet: 0, total: 50099 });
    const w2 = wealthBreakdown({ coins: 1000, tradingValue: 500, debtCoins: 7000, realEstateNetCoins: 6200 });
    expect(w2.financial).toBe(-5500);                         // le cas « −6 113 » : une dette sans l'immobilier
    expect(w2.total).toBe(700);                               // avec l'immobilier net de revente, le patrimoine redevient cohérent
    expect(w2.financial).toBe(netWorthCoins({ coins: 1000, tradingValue: 500, debtCoins: 7000 }));
  });
  it('un immobilier négatif (revente qui ne couvre pas la dette) n\'est pas caché ; valeurs non numériques refusées', () => {
    expect(wealthBreakdown({ coins: 100, tradingValue: 0, debtCoins: 0, realEstateNetCoins: -40 }).total).toBe(60);
    expect(() => wealthBreakdown({ coins: NaN, tradingValue: 0, debtCoins: 0, realEstateNetCoins: 0 })).toThrow();
    expect(() => wealthBreakdown({ coins: 0, tradingValue: 0, debtCoins: 0, realEstateNetCoins: Infinity })).toThrow();
  });
  it('fusion ancienne Crypto + nouveau marché : tout s\'additionne, rien n\'est perdu', () => {
    const base = { started: false, positions: 0, marketValue: 0, invested: 0, proceeds: 0, gain: 0, performancePct: 0, simulatedYear: 2014, feesPaid: 0, taxPaid: 0 };
    const old = { ...base, started: true, positions: 1, marketValue: 300, invested: 200, proceeds: 0, gain: 100, feesPaid: 2, simulatedYear: 2016 };
    const mkt = { ...base, started: true, positions: 2, marketValue: 160, invested: 150, proceeds: 10, gain: 20, feesPaid: 1, simulatedYear: 2020, fxUnavailable: false };
    const m = mergeCryptoSummaries(old, mkt);
    expect(m).toMatchObject({ started: true, positions: 3, marketValue: 460, invested: 350, proceeds: 10, gain: 120, feesPaid: 3, simulatedYear: 2020 });
    expect(mergeCryptoSummaries(old, base).simulatedYear).toBe(2016);          // seulement l'ancienne
    expect(mergeCryptoSummaries(base, base).started).toBe(false);
  });
});

describe('tableau de bord : plus aucun « € » dans les fichiers d\'affichage du tableau de bord', () => {
  it('OverviewTab et DashHero n\'affichent plus d\'euros', () => {
    for (const f of ['app/dashboard/OverviewTab.jsx', 'app/dashboard/DashHero.jsx']) {
      const bad = fs.readFileSync(path.join(root, f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && l.includes('€'));
      expect(bad, `${f} : ${bad[0]}`).toEqual([]);
    }
  });
});

describe.skipIf(!hasDb)('un achat sur le nouveau marché Crypto est vu partout', () => {
  beforeAll(async () => {
    await setupDb(); await importDemo(); await setFlatFx(FX);
    await query(`UPDATE crypto_candles SET o = 7195.23, h = 7195.23, l = 7195.23, c = 7195.23 WHERE asset_id = (SELECT id FROM crypto_assets WHERE symbol = 'DEMO1') AND tf = '1d' AND ts = to_timestamp($1::float8 / 1000.0)`, [START - D]);
  }, 120_000);
  afterAll(teardownDb);

  const player = async (balance = 50_000) => {
    const id = await createUser({ id: calmUserId(), balance, tier: 'pro', activeDays: 5 });
    await clockService.create(id, 'y2020');
    return id;
  };
  const buy = (u: string, amountCoins: number) => crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins });

  it('avant tout achat : Crypto « pas commencée », checklist non cochée', async () => {
    const u = await player();
    const ov: any = await overviewService.get(u);
    expect(ov.trading.crypto.started).toBe(false);
    expect((await onboardingService.get(u)).steps.find((s) => s.key === 'first_trade')!.done).toBe(false);
  });

  it('achat de 150 : patrimoine, Titres, Capital investi, Crypto « commencée », checklist, wallet, classement', async () => {
    const u = await player();
    const before = await balanceOf(u);
    const r = await buy(u, 150);
    const f = r.order!.fill!;
    const paid = f.notionalCoins + f.feeCoins;
    expect(await balanceOf(u)).toBe(before - paid);
    const value = Math.floor((f.priceCoins * Number(f.quantity) * 1e8) / 1e8);   // valeur au prix d'exécution : ordre de grandeur
    // 1) vue d'ensemble
    const ov: any = await overviewService.get(u);
    expect(ov.trading.crypto.started).toBe(true);
    expect(ov.trading.crypto.positions).toBe(1);
    expect(ov.trading.crypto.invested).toBe(paid);                                  // « Total acheté (cumul) » = montant payé (prix + frais)
    expect(ov.trading.crypto.investedNow).toBe(f.notionalCoins);                    // « Actuellement investi » = prix de revient des positions détenues
    expect(ov.totals.investedNow).toBe(f.notionalCoins);
    expect(ov.trading.crypto.marketValue).toBeGreaterThan(0);
    expect(ov.trading.crypto.marketValue).toBeLessThanOrEqual(paid);
    expect(ov.trading.crypto.marketValue).toBeGreaterThanOrEqual(value - 2);
    expect(ov.totals.tradingValue).toBe(ov.trading.stocks.marketValue + ov.trading.crypto.marketValue);   // « Titres »
    expect(ov.totals.tradingValue).toBeGreaterThan(0);
    expect(ov.totals.invested).toBe(paid);
    // 2) patrimoine : liquidités + titres (le BTC est compté)
    expect(ov.totals.financialWealth).toBe(ov.coins + ov.totals.tradingValue);
    expect(ov.totals.financialWealth).toBeGreaterThan(ov.coins);
    expect(ov.totals.netWorth).toBe(ov.totals.financialWealth);
    expect(ov.totals.totalWealth).toBe(ov.totals.financialWealth);                  // pas d'immobilier : total = financier
    // 3) solde partagé du site (barre du haut, carte Patrimoine)
    const w = await walletService.snapshot(u);
    expect(w.tradingValue).toBe(ov.totals.tradingValue);
    expect(w.netWorth).toBe(w.balance + w.tradingValue - w.debtCoins);
    expect(w.financialWealth).toBe(w.netWorth);
    expect(w.totalWealth).toBe(w.financialWealth + w.realEstateNet);
    // 4) checklist
    expect((await onboardingService.get(u)).steps.find((s) => s.key === 'first_trade')!.done).toBe(true);
    // 5) classement Crypto : la progression « x / 2 500 investis » compte ce capital
    const board: any = await rankingService.board(u, undefined);
    expect(board.progress.investedCoins).toBe(f.notionalCoins);                     // le seuil compte le montant ACTUELLEMENT investi
    expect(board.progress.minInvestedCoins).toBe(RANKING_MIN_INVESTED);
    expect(board.progress.ranked).toBe(false);                                      // 150 < 2 500
    expect(board.progress.activeDays).toBe(5);
  });

  it('un achat qui atteint le seuil : classé (investis ≥ 2 500 et 5 jours actifs)', async () => {
    const u = await player(100_000);
    await buy(u, 2600);
    const board: any = await rankingService.board(u, undefined);
    expect(board.progress.investedCoins).toBeGreaterThanOrEqual(RANKING_MIN_INVESTED);
    expect(board.progress.ranked).toBe(true);
    expect(board.me).not.toBeNull();
  });

  it('une vente met à jour les chiffres : Capital investi inchangé, produit compté dans le gain', async () => {
    const u = await player();
    const b = (await buy(u, 150)).order!.fill!;
    await crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'sell', type: 'market', quantity: String(b.quantity) });
    const s = await cryptoMarketSummary(u);
    expect(s.positions).toBe(0);
    expect(s.marketValue).toBe(0);
    expect(s.invested).toBe(b.notionalCoins + b.feeCoins);                          // total acheté (cumul) : inchangé après la vente
    expect(s.investedNow).toBe(0);                                                  // actuellement investi : plus rien
    const board: any = await rankingService.board(u, undefined);
    expect(board.progress.investedCoins).toBe(0);                                    // le seuil du classement compte le montant ACTUELLEMENT investi
    expect(s.proceeds).toBeGreaterThan(0);
    expect(s.gain).toBe(s.proceeds - s.invested);                                  // une perte réelle (frais, écart), jamais un gain gratuit
    expect(s.gain).toBeLessThan(0);
  });

  it('sans taux de change : la valeur n\'est pas devinée (0 + drapeau), les autres chiffres restent', async () => {
    const u = await player();
    await buy(u, 150);
    await query(`DELETE FROM fx_rates WHERE currency = 'USD'`);
    const s = await cryptoMarketSummary(u);
    expect(s.fxUnavailable).toBe(true);
    expect(s.marketValue).toBe(0);
    expect(s.invested).toBeGreaterThan(0);
    await setFlatFx(FX);                                                            // on remet le taux pour les tests suivants
  });

  it('patrimoine total = financier + immobilier net de revente (jamais deux fois la dette du prêt immobilier)', async () => {
    const u = await createUser({ id: calmUserId(), balance: 200_000, tier: 'pro', activeDays: 5 });
    await re.startGame(u, 'executive');
    let l: any;
    for (const x of await src.listListings(2010)) {
      if (x.age === 'old' && x.advertisedWorks === 0 && x.price > 60000 && x.price < 90000 && (await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; }
    }
    await re.purchase(u, { listingId: l.id, downPaymentCoins: Math.ceil(l.price * 0.3), months: 240 });
    const ov: any = await overviewService.get(u);
    expect(ov.realEstate.started).toBe(true);
    expect(ov.realEstate.netLiquidationCoins).toBeLessThan(ov.realEstate.equityCoins);       // revendre coûte (agence, diagnostics, impôt…)
    expect(ov.totals.totalWealth).toBe(ov.totals.financialWealth + ov.realEstate.netLiquidationCoins);
    expect(ov.totals.realEstateNetCoins).toBe(ov.realEstate.netLiquidationCoins);
    const w = await walletService.snapshot(u);
    expect(w.totalWealth).toBe(ov.totals.totalWealth);
    expect(w.realEstateNet).toBe(ov.realEstate.netLiquidationCoins);
    // chaque champ immobilier est en InvestCoins
    for (const k of ['netLiquidationCoins', 'equityCoins', 'investedCoins', 'bankDebtCoins']) expect(Number.isFinite(ov.realEstate[k]), k).toBe(true);
  });
});
