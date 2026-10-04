import { query } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { getDomain } from '../data/marketData';
import { readTaxState } from '../engine/trading/costs';
import { outstandingCoins } from './bankService';
import { wealthMetrics } from './realEstateSaleService';
import { riskService } from './riskService';
import { EUROS_PER_COIN } from '../config/economy';
import { wealthBreakdown } from '../engine/wealth';
import { marketFor, num, toAccount } from './crypto/core';

// Vue d'ensemble RÉELLE du joueur (remplace les chiffres fictifs du tableau de bord). Chaque domaine garde son unité :
// Tous les domaines sont en InvestCoins (1 InvestCoin = 1 € de jeu, voir config/economy.ts). Le Crypto passe des dollars aux pièces par le taux BCE du jour de jeu.
export const tradingSummary = async (userId: string, domainId: 'stocks' | 'crypto') => {
  const domain = getDomain(domainId)!;
  const row = (await query(`SELECT positions, simulated_year, total_bought, total_proceeds, tax_state FROM virtual_portfolios WHERE user_id = $1 AND mode = 'accelerated' AND domain = $2`, [userId, domainId])).rows[0];
  if (!row) return { started: false, positions: 0, marketValue: 0, invested: 0, investedNow: 0, proceeds: 0, gain: 0, performancePct: 0, simulatedYear: domain.minYear, feesPaid: 0, taxPaid: 0 };
  let marketValue = 0, positions = 0, investedNow = 0;
  for (const p of row.positions as { symbol: string; quantity: number; avgBuyPrice?: number }[]) {
    const price = domain.getPrice(p.symbol, row.simulated_year) ?? 0;
    if (p.quantity > 1e-9) { marketValue += price * p.quantity; positions++; investedNow += p.quantity * (p.avgBuyPrice ?? 0); }
  }
  const invested = Number(row.total_bought), proceeds = Number(row.total_proceeds);
  const gain = marketValue + proceeds - invested;
  const ts = readTaxState(row.tax_state);
  return {
    started: invested > 0 || positions > 0, positions, marketValue: Math.round(marketValue), invested: Math.round(invested), investedNow: Math.round(investedNow), proceeds: Math.round(proceeds),
    gain: Math.round(gain), performancePct: invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0,
    simulatedYear: row.simulated_year, feesPaid: ts.feesPaid, taxPaid: ts.taxPaid,
  };
};

// Nouveau marché Crypto (domaine « crypto_market », tables crypto_*) : même forme de résumé que tradingSummary, en InvestCoins.
export const cryptoMarketSummary = async (userId: string) => {
  const empty = { started: false, positions: 0, marketValue: 0, invested: 0, investedNow: 0, proceeds: 0, gain: 0, performancePct: 0, simulatedYear: getDomain('crypto')!.minYear, feesPaid: 0, taxPaid: 0, fxUnavailable: false };
  const accRow = (await query('SELECT * FROM crypto_accounts WHERE user_id = $1', [userId])).rows[0];
  if (!accRow) return empty;
  const acc = toAccount(accRow);
  const pos = (await query(`SELECT a.symbol, p.quantity::text AS q FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id WHERE p.user_id = $1 AND p.quantity > 0`, [userId])).rows;
  let marketValue = 0, fxUnavailable = false;
  for (const p of pos) {
    const m = await marketFor({ query }, p.symbol, acc.simulatedAt);
    if (!m) continue;
    if (m.fx === null) { fxUnavailable = true; continue; }     // sans taux de change du jour de jeu : jamais une valeur devinée
    marketValue += Math.floor((m.price * num(p.q)) / m.fx);
  }
  const f = (await query(
    `SELECT COALESCE(SUM(notional_coins + fee_coins) FILTER (WHERE side = 'buy' AND NOT swap), 0)::bigint AS bought,
            COALESCE(SUM(notional_coins - fee_coins - tax_coins) FILTER (WHERE side = 'sell' AND NOT swap), 0)::bigint AS proceeds,
            COALESCE(SUM(fee_coins), 0)::bigint AS fees, COALESCE(SUM(tax_coins), 0)::bigint AS tax,
            COALESCE(SUM(fee_coins) FILTER (WHERE swap), 0)::bigint AS swap_fees
       FROM crypto_fills WHERE user_id = $1`, [userId])).rows[0];
  const invested = num(f.bought), proceeds = num(f.proceeds) - num(f.swap_fees);
  const investedNow = Math.round(num((await query(`SELECT COALESCE(SUM(cost_basis_coins), 0) AS s FROM crypto_positions WHERE user_id = $1 AND quantity > 0`, [userId])).rows[0].s));
  const gain = marketValue + proceeds - invested;
  return {
    started: invested > 0 || pos.length > 0, positions: pos.length, marketValue, invested, investedNow, proceeds, gain,
    performancePct: invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0, simulatedYear: new Date(acc.simulatedAt).getUTCFullYear(),
    feesPaid: num(f.fees), taxPaid: num(f.tax), fxUnavailable,
  };
};

type Summary = Awaited<ReturnType<typeof tradingSummary>> & { fxUnavailable?: boolean };
// Crypto du joueur = ancienne Crypto (domaine « crypto », portefeuille virtuel) + nouveau marché (« crypto_market ») : les deux comptent, rien n'est perdu.
export const mergeCryptoSummaries = (old: Summary, market: Summary): Summary => {
  const invested = old.invested + market.invested;
  const gain = old.gain + market.gain;
  return {
    started: old.started || market.started, positions: old.positions + market.positions, marketValue: old.marketValue + market.marketValue,
    invested, investedNow: old.investedNow + market.investedNow, proceeds: old.proceeds + market.proceeds, gain, performancePct: invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0,
    simulatedYear: market.started ? market.simulatedYear : old.simulatedYear, feesPaid: old.feesPaid + market.feesPaid, taxPaid: old.taxPaid + market.taxPaid,
    fxUnavailable: !!market.fxUnavailable,
  };
};
export const cryptoSummary = async (userId: string): Promise<Summary> => mergeCryptoSummaries(await tradingSummary(userId, 'crypto'), await cryptoMarketSummary(userId));

// Immobilier NET DE REVENTE en InvestCoins (valeur de liquidation : agence, diagnostics, remboursement anticipé, impôt, décote d'un bien loué ; prêt immobilier déjà déduit).
export const realEstateNetCoins = async (userId: string): Promise<number> => {
  const game = (await query('SELECT id, user_id, profile, simulated_year, simulated_month, seed FROM re_games WHERE user_id = $1', [userId])).rows[0];
  if (!game) return 0;
  const w = await wealthMetrics({ query } as any, game);
  return Math.round(w.liquidationValueEuros / EUROS_PER_COIN);
};

export const overviewService = {
  async get(userId: string) {
    const user = (await query(`SELECT subscription_tier, pro_override, free_domain, username, created_at FROM users WHERE id = $1`, [userId])).rows[0];
    const coins = await investcoinsRepository.getBalance(userId);
    const stocks = await tradingSummary(userId, 'stocks');
    const crypto = await cryptoSummary(userId);

    let realEstate: any = { started: false };
    const game = (await query('SELECT id, user_id, profile, simulated_year, simulated_month, seed FROM re_games WHERE user_id = $1', [userId])).rows[0];
    if (game) {
      const w = await wealthMetrics({ query } as any, game);
      const props = (await query(`SELECT COUNT(*) FILTER (WHERE status <> 'sold')::int AS n FROM re_properties WHERE game_id = $1`, [game.id])).rows[0].n;
      realEstate = {
        started: true, profile: game.profile, year: game.simulated_year, month: game.simulated_month, properties: props,
        equityEuros: w.equity, investedEuros: w.investedEuros, performancePct: Math.round(w.performancePct * 10) / 10, leverage: w.leverage, bankDebtEuros: w.bankDebtEuros,
        equityCoinsApprox: Math.round(w.equity / EUROS_PER_COIN),
        // Tout en InvestCoins (1 pièce = 1 €) : valeur nette de revente, fonds propres, investi, dette.
        netLiquidationCoins: Math.round(w.liquidationValueEuros / EUROS_PER_COIN), equityCoins: Math.round(w.equity / EUROS_PER_COIN),
        investedCoins: Math.round(w.investedCurrentEuros / EUROS_PER_COIN), bankDebtCoins: Math.round(w.bankDebtEuros / EUROS_PER_COIN),
        // Explication de la performance (en pièces) : gain net de revente ÷ capital de départ ; mêmes chiffres que le Bilan Immobilier.
        performanceExplain: {
          startingCapitalCoins: w.startingCapitalCoins, gainCoins: Math.round(w.gainLiquidationEuros / EUROS_PER_COIN),
          investedTotalCoins: Math.round(w.investedEuros / EUROS_PER_COIN), rentCollectedCoins: Math.round(w.cumulativeCashFlow / EUROS_PER_COIN),
          salesAlreadyDoneCoins: Math.round(w.saleNetProceeds / EUROS_PER_COIN), personalLoanInterestCoins: Math.round(w.bankInterestPaidEuros / EUROS_PER_COIN),
          ...Object.fromEntries(Object.entries(w.detail).map(([k, v]) => [k.replace('Euros', 'Coins'), Math.round((v as number) / EUROS_PER_COIN)])),
        },
      };
    }

    const debtCoins = await outstandingCoins({ query } as any, userId);
    const wealth = wealthBreakdown({ coins, tradingValue: stocks.marketValue + crypto.marketValue, debtCoins, realEstateNetCoins: realEstate.started ? realEstate.netLiquidationCoins : 0 });
    const invested = stocks.invested + crypto.invested;
    const gain = stocks.gain + crypto.gain;

    // Risque du domaine de trading le plus important (si des positions existent).
    let risk: any = null;
    const oldCrypto = await tradingSummary(userId, 'crypto');
    const marketCrypto = await cryptoMarketSummary(userId);
    const candidates: [string, number][] = [['stocks', stocks.marketValue], ['crypto', oldCrypto.marketValue], ['crypto_market', marketCrypto.marketValue]];
    const [biggest, biggestValue] = candidates.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (biggestValue > 0) {
      const r: any = await riskService.portfolioRisk(userId, biggest);
      if (!r.empty) risk = { domain: biggest, score: r.score.score, label: r.score.label, volatilityPct: r.score.portfolioVolPct, worstCrisis: r.score.worstStress };
    }

    return {
      tier: user?.pro_override || user?.subscription_tier === 'pro' ? 'pro' : 'free',
      username: user?.username ?? null, memberSince: user?.created_at ?? null, freeDomain: user?.free_domain ?? null,
      coins, trading: { stocks, crypto },
      totals: {
        tradingValue: stocks.marketValue + crypto.marketValue,
        coinsAndTrading: coins + stocks.marketValue + crypto.marketValue,
        netWorth: wealth.financial,                       // patrimoine financier (nom conservé) : liquidités + titres − dettes
        financialWealth: wealth.financial, realEstateNetCoins: wealth.realEstateNet, totalWealth: wealth.total,
        invested, investedNow: stocks.investedNow + crypto.investedNow, gain, performancePct: invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0,
        feesPaid: stocks.feesPaid + crypto.feesPaid, taxPaid: stocks.taxPaid + crypto.taxPaid,
      },
      realEstate, bank: { debtCoins }, risk,
      notes: ['Patrimoine financier = liquidités + titres (Bourse, Crypto) − dettes bancaires. Patrimoine total = patrimoine financier + immobilier net de revente. Tout est en InvestCoins (1 InvestCoin = 1 €).'],
    };
  },
};
