import { virtualPortfolioRepository } from '../repositories/virtualPortfolioRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { getDomain, DOMAINS, DomainConfig } from '../data/marketData';
import { query } from '../utils/db';
import { portfolioDebtInfo } from './bankPortfolioService';
import { AssetClass, CLASS_LABELS } from '../config/riskRules';
import { riskScore, stressTest, correlationMatrix, annualReturns, RiskInputError } from '../engine/risk';
import { MODE } from './tradingService';
import { marketFor, toAccount, num } from './crypto/core';

export const CRYPTO_MARKET = 'crypto_market';

// Positions du nouveau marché Crypto en InvestCoins, au taux de change du jour de jeu (jamais une valeur devinée).
const cryptoMarketValues = async (userId: string) => {
  const accRow = (await query('SELECT * FROM crypto_accounts WHERE user_id = $1', [userId])).rows[0];
  if (!accRow) return { year: getDomain('crypto')!.minYear, values: [] as { name: string; cls: AssetClass; value: number }[], fxUnavailable: false };
  const acc = toAccount(accRow);
  const pos = (await query(`SELECT a.symbol, p.quantity::text AS q FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id WHERE p.user_id = $1 AND p.quantity > 0`, [userId])).rows;
  const values: { name: string; cls: AssetClass; value: number }[] = [];
  let fxUnavailable = false;
  for (const p of pos) {
    const m = await marketFor({ query }, p.symbol, acc.simulatedAt);
    if (!m) continue;
    if (m.fx === null) { fxUnavailable = true; continue; }
    const v = Math.floor((m.price * num(p.q)) / m.fx);
    if (v > 0) values.push({ name: p.symbol, cls: 'crypto', value: v });
  }
  return { year: new Date(acc.simulatedAt).getUTCFullYear(), values, fxUnavailable };
};

// Classe d'actifs d'un titre du jeu (pour le score de risque et les tests de résistance).
const classOf = (domain: DomainConfig, symbol: string): AssetClass => {
  if (domain.id === 'crypto') return 'crypto';
  if (symbol === 'SP500') return 'equity_world';
  return 'equity_fr';   // actions du CAC 40 et ETF CAC 40
};

export const riskService = {
  // Risque du portefeuille simulé d'un joueur dans un domaine (Bourse ou Crypto) : valeur des positions + liquidités (InvestCoins).
  async portfolioRisk(userId: string, domainId: unknown, horizonRaw?: unknown, capitalInvestedOnly = false) {
    const isMarket = domainId === CRYPTO_MARKET;
    const domain = getDomain(isMarket ? 'crypto' : domainId);
    if (!domain) throw new RiskInputError('Domaine inconnu');
    const horizon = horizonRaw === undefined || horizonRaw === '' ? 10 : Number(horizonRaw);
    if (!Number.isFinite(horizon) || horizon < 0 || horizon > 80) throw new RiskInputError('Horizon : nombre d\'années entre 0 et 80');

    const resultDomain = isMarket ? CRYPTO_MARKET : domain.id;
    const cash = await investcoinsRepository.getBalance(userId);
    let year: number;
    const values: { name: string; cls: AssetClass; value: number }[] = [];
    if (isMarket) {
      const m = await cryptoMarketValues(userId);
      year = m.year;
      values.push(...m.values);
    } else {
      const portfolio = await virtualPortfolioRepository.getOrCreate(userId, MODE, domain.id, domain.minYear);
      year = portfolio.simulated_year;
      for (const p of portfolio.positions) {
        const price = domain.getPrice(p.symbol, year) ?? 0;
        const v = price * p.quantity;
        if (v > 0) values.push({ name: p.symbol, cls: classOf(domain, p.symbol), value: v });
      }
    }
    const invested = values.reduce((s, x) => s + x.value, 0);
    if (invested <= 0) return { empty: true, message: 'Aucune position : achète des titres pour voir le score de risque de ton portefeuille.', domain: resultDomain, simulatedYear: year };

    const debt = await portfolioDebtInfo({ query } as any, userId, resultDomain);
    const equity = Math.max(1, invested + cash - debt.debt);
    const leverage = debt.debt > 0 ? debt.debt / equity : 0;

    const byClass: Partial<Record<AssetClass, number>> = {};
    for (const v of values) byClass[v.cls] = (byClass[v.cls] ?? 0) + v.value;
    if (!capitalInvestedOnly && cash > 0) byClass.cash = (byClass.cash ?? 0) + cash;
    const total = Object.values(byClass).reduce((a, b) => a + (b ?? 0), 0);

    const positionsTotal = values.reduce((s, x) => s + x.value, 0);
    const score = riskScore({ allocation: byClass, assets: values.map((v) => ({ name: v.name, weight: v.value })), horizonYears: horizon, leverage });
    const stress = stressTest(byClass, Math.round(total));
    return {
      empty: false, domain: resultDomain, simulatedYear: year, totalValue: Math.round(total), positionsValue: Math.round(positionsTotal), cash,
      leverage: Math.round(leverage * 100) / 100, horizonYears: horizon,
      allocation: Object.entries(byClass).map(([cls, v]) => ({ cls, label: CLASS_LABELS[cls as AssetClass], value: Math.round(v!), weightPct: Math.round((v! / total) * 1000) / 10 })),
      score, stress,
      disclaimer: 'Estimation pédagogique fondée sur des hypothèses simplifiées : ce n\'est pas un conseil en investissement.',
    };
  },

  // Corrélations entre les actifs du jeu, d'après les rendements annuels des séries de prix (Bourse, Crypto ou les deux).
  correlation(domainRaw: unknown) {
    const ids = domainRaw === 'all' || domainRaw === undefined || domainRaw === '' ? Object.keys(DOMAINS) : [String(domainRaw)];
    const series: Record<string, Record<number, number>> = {};
    for (const id of ids) {
      const d = getDomain(id);
      if (!d || !(id in DOMAINS)) throw new RiskInputError('Domaine inconnu');
      for (const a of d.assets) {
        const prices: Record<number, number> = {};
        for (let y = d.minYear; y <= d.maxYear; y++) { const p = d.getPrice(a.symbol, y); if (p !== null && p > 0) prices[y] = p; }
        series[a.symbol] = annualReturns(prices);
      }
    }
    const m = correlationMatrix(series);
    return {
      ...m, domains: ids,
      note: 'Corrélation de Pearson entre rendements ANNUELS (peu de points : 2010-2026 pour la Bourse, 2013-2026 pour la crypto). Jeu de données pédagogique simplifié ; le chiffre doit être lu comme un ordre de grandeur.',
    };
  },
};
