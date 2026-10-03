import { query } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { getDomain } from '../data/marketData';
import { readTaxState } from '../engine/trading/costs';
import { outstandingCoins } from './bankService';
import { wealthMetrics } from './realEstateSaleService';
import { riskService } from './riskService';
import { EUROS_PER_COIN } from '../config/economy';
import { netWorthCoins } from '../engine/wealth';

// Vue d'ensemble RÉELLE du joueur (remplace les chiffres fictifs du tableau de bord). Chaque domaine garde son unité :
// Bourse et Crypto en pièces (InvestCoins ≈ 1 € de cours dans le jeu), Immobilier en euros (1 InvestCoin = 20 €) — volontairement non additionnés
// tant que l'unification des unités n'est pas faite (voir docs/banque.md).
export const tradingSummary = async (userId: string, domainId: 'stocks' | 'crypto') => {
  const domain = getDomain(domainId)!;
  const row = (await query(`SELECT positions, simulated_year, total_bought, total_proceeds, tax_state FROM virtual_portfolios WHERE user_id = $1 AND mode = 'accelerated' AND domain = $2`, [userId, domainId])).rows[0];
  if (!row) return { started: false, positions: 0, marketValue: 0, invested: 0, proceeds: 0, gain: 0, performancePct: 0, simulatedYear: domain.minYear, feesPaid: 0, taxPaid: 0 };
  let marketValue = 0, positions = 0;
  for (const p of row.positions as { symbol: string; quantity: number }[]) {
    const price = domain.getPrice(p.symbol, row.simulated_year) ?? 0;
    if (p.quantity > 1e-9) { marketValue += price * p.quantity; positions++; }
  }
  const invested = Number(row.total_bought), proceeds = Number(row.total_proceeds);
  const gain = marketValue + proceeds - invested;
  const ts = readTaxState(row.tax_state);
  return {
    started: invested > 0 || positions > 0, positions, marketValue: Math.round(marketValue), invested: Math.round(invested), proceeds: Math.round(proceeds),
    gain: Math.round(gain), performancePct: invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0,
    simulatedYear: row.simulated_year, feesPaid: ts.feesPaid, taxPaid: ts.taxPaid,
  };
};

export const overviewService = {
  async get(userId: string) {
    const user = (await query(`SELECT subscription_tier, pro_override, free_domain, username, created_at FROM users WHERE id = $1`, [userId])).rows[0];
    const coins = await investcoinsRepository.getBalance(userId);
    const stocks = await tradingSummary(userId, 'stocks');
    const crypto = await tradingSummary(userId, 'crypto');

    let realEstate: any = { started: false };
    const game = (await query('SELECT id, user_id, profile, simulated_year, simulated_month, seed FROM re_games WHERE user_id = $1', [userId])).rows[0];
    if (game) {
      const w = await wealthMetrics({ query } as any, game);
      const props = (await query(`SELECT COUNT(*) FILTER (WHERE status <> 'sold')::int AS n FROM re_properties WHERE game_id = $1`, [game.id])).rows[0].n;
      realEstate = {
        started: true, profile: game.profile, year: game.simulated_year, month: game.simulated_month, properties: props,
        equityEuros: w.equity, investedEuros: w.investedEuros, performancePct: Math.round(w.performancePct * 10) / 10, leverage: w.leverage, bankDebtEuros: w.bankDebtEuros,
        equityCoinsApprox: Math.round(w.equity / EUROS_PER_COIN),
      };
    }

    const debtCoins = await outstandingCoins({ query } as any, userId);
    const invested = stocks.invested + crypto.invested;
    const gain = stocks.gain + crypto.gain;

    // Risque du domaine de trading le plus important (si des positions existent).
    let risk: any = null;
    const biggest = stocks.marketValue >= crypto.marketValue ? 'stocks' : 'crypto';
    if (stocks.marketValue + crypto.marketValue > 0) {
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
        netWorth: netWorthCoins({ coins, tradingValue: stocks.marketValue + crypto.marketValue, debtCoins }),   // liquidités + titres − dettes
        invested, gain, performancePct: invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0,
        feesPaid: stocks.feesPaid + crypto.feesPaid, taxPaid: stocks.taxPaid + crypto.taxPaid,
      },
      realEstate, bank: { debtCoins }, risk,
      notes: ['Patrimoine = liquidités + titres (Bourse, Crypto) − dettes bancaires. Bourse et Crypto sont en pièces ; l\'Immobilier est en euros (1 InvestCoin = 20 €) : les deux ne sont pas additionnés.'],
    };
  },
};
