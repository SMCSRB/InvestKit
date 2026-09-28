import {
  virtualPortfolioRepository,
  Position,
  VirtualPortfolio,
} from '../repositories/virtualPortfolioRepository';
import { investcoinsRepository, InsufficientFundsError, Queryable } from '../repositories/investcoinsRepository';
import { leaderboardRepository } from '../repositories/leaderboardRepository';
import { userRepository } from '../repositories/userRepository';
import { DomainConfig, getDomain } from '../data/marketData';
import { getBuyAccess, BuyAccess } from '../utils/entitlements';
import { computePerformancePct, chargeForBuy, creditForSell } from '../utils/performance';
import {
  MAX_TRADE_QUANTITY,
  MAX_QUANTITY_DECIMALS,
  MIN_RANKED_CAPITAL,
  LEADERBOARD_SIZE,
} from '../config/game';

export const MODE = 'accelerated'; // seul mode disponible pour l'instant (décision produit)

export type TradingErrorCode =
  | 'UNKNOWN_DOMAIN'
  | 'INVALID_INPUT'
  | 'DOMAIN_LOCKED'
  | 'FREE_DOMAIN_NOT_CHOSEN'
  | 'NOT_LISTED'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_QUANTITY'
  | 'MAX_YEAR_REACHED'
  | 'USER_NOT_FOUND';

export class TradingError extends Error {
  constructor(public code: TradingErrorCode, message: string) {
    super(message);
    this.name = 'TradingError';
  }
}

export const resolveDomainOrThrow = (id: unknown): DomainConfig => {
  const domain = getDomain(id);
  if (!domain) throw new TradingError('UNKNOWN_DOMAIN', 'Domaine inconnu');
  return domain;
};

const validateOrder = (domain: DomainConfig, symbol: unknown, quantity: unknown): { symbol: string; quantity: number } => {
  if (typeof symbol !== 'string' || !symbol || !domain.isValidSymbol(symbol)) {
    throw new TradingError('INVALID_INPUT', 'Symbole invalide');
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    throw new TradingError('INVALID_INPUT', 'Quantité invalide');
  }
  if (quantity > MAX_TRADE_QUANTITY) {
    throw new TradingError('INVALID_INPUT', 'Quantité trop élevée');
  }
  const scaled = Math.round(quantity * 10 ** MAX_QUANTITY_DECIMALS);
  if (Math.abs(scaled / 10 ** MAX_QUANTITY_DECIMALS - quantity) > 1e-12) {
    throw new TradingError('INVALID_INPUT', `Maximum ${MAX_QUANTITY_DECIMALS} décimales`);
  }
  return { symbol, quantity };
};

const valuePositions = (domain: DomainConfig, positions: Position[], year: number) => {
  let marketValue = 0;
  let costBasis = 0;
  for (const pos of positions) {
    const price = domain.getPrice(pos.symbol, year) ?? 0;
    marketValue += price * pos.quantity;
    costBasis += pos.avgBuyPrice * pos.quantity;
  }
  return { marketValue, costBasis };
};

const snapshot = async (
  tx: Queryable,
  userId: string,
  domain: DomainConfig,
  positions: Position[],
  totals: { totalBought: number; totalProceeds: number },
  year: number
): Promise<void> => {
  const { marketValue } = valuePositions(domain, positions, year);
  await leaderboardRepository.upsertSnapshot(tx, {
    userId,
    mode: MODE,
    domain: domain.id,
    year,
    performancePct: computePerformancePct({ marketValue, ...totals }),
    capitalCommitted: totals.totalBought,
  });
};

const loadUser = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new TradingError('USER_NOT_FOUND', 'Utilisateur non trouvé');
  return user;
};

const accessFor = (user: Awaited<ReturnType<typeof loadUser>>, domainId: string): BuyAccess =>
  getBuyAccess(user, domainId);

export const tradingService = {
  async getPortfolioView(userId: string, domainId: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    const user = await loadUser(userId);
    const portfolio: VirtualPortfolio = await virtualPortfolioRepository.getOrCreate(
      userId, MODE, domain.id, domain.minYear
    );
    const balance = await investcoinsRepository.getBalance(userId);
    const { marketValue, costBasis } = valuePositions(domain, portfolio.positions, portfolio.simulated_year);
    const performancePct = computePerformancePct({
      marketValue,
      totalBought: portfolio.total_bought,
      totalProceeds: portfolio.total_proceeds,
    });

    const prices: Record<string, number | null> = {};
    for (const asset of domain.assets) {
      prices[asset.symbol] = domain.getPrice(asset.symbol, portfolio.simulated_year);
    }

    const access = accessFor(user, domain.id);
    return {
      domain: domain.id,
      positions: portfolio.positions,
      simulatedYear: portfolio.simulated_year,
      minYear: domain.minYear,
      maxYear: domain.maxYear,
      cashBalance: balance,
      marketValue,
      costBasis,
      performancePct,
      totalValue: balance + marketValue,
      prices,
      access: access.allowed
        ? { canBuy: true, reason: null }
        : { canBuy: false, reason: access.reason },
    };
  },

  async buy(userId: string, domainId: unknown, rawSymbol: unknown, rawQuantity: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    const { symbol, quantity } = validateOrder(domain, rawSymbol, rawQuantity);

    const user = await loadUser(userId);
    const access = accessFor(user, domain.id);
    if (!access.allowed) {
      throw new TradingError(
        access.reason,
        access.reason === 'FREE_DOMAIN_NOT_CHOSEN'
          ? 'Choisissez d\'abord votre domaine gratuit'
          : 'Ce domaine nécessite l\'abonnement Pro'
      );
    }

    try {
      return await virtualPortfolioRepository.withLock(
        userId, MODE, domain.id, domain.minYear,
        async (portfolio, tx) => {
          const year = portfolio.simulated_year;
          const price = domain.getPrice(symbol, year);
          if (price === null) {
            throw new TradingError('NOT_LISTED', `${symbol} n'existe pas encore en ${year}`);
          }
          const cost = chargeForBuy(price, quantity);
          if (cost < 1) {
            throw new TradingError('INVALID_INPUT', 'Montant trop faible (minimum 1 🪙)');
          }

          await investcoinsRepository.applyTransaction(userId, -cost, 'trade_buy', {
            domain: domain.id, symbol, quantity, price, year,
          }, tx);

          const positions = portfolio.positions.map((p) => ({ ...p }));
          const existing = positions.find((p) => p.symbol === symbol);
          if (existing) {
            const total = existing.quantity + quantity;
            existing.avgBuyPrice = (existing.avgBuyPrice * existing.quantity + price * quantity) / total;
            existing.quantity = total;
          } else {
            positions.push({ symbol, quantity, avgBuyPrice: price });
          }

          const totals = {
            totalBought: portfolio.total_bought + cost,
            totalProceeds: portfolio.total_proceeds,
          };
          await virtualPortfolioRepository.save(tx, portfolio.id, { positions, ...totals });
          await snapshot(tx, userId, domain, positions, totals, year);

          return { success: true, cost, price, positions };
        }
      );
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw new TradingError('INSUFFICIENT_FUNDS', 'Solde InvestCoins insuffisant');
      }
      throw error;
    }
  },

  async sell(userId: string, domainId: unknown, rawSymbol: unknown, rawQuantity: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    const { symbol, quantity } = validateOrder(domain, rawSymbol, rawQuantity);
    // La vente est toujours autorisée (même sur un domaine verrouillé) :
    // on ne piège jamais un joueur dans une position.
    await loadUser(userId);

    return virtualPortfolioRepository.withLock(
      userId, MODE, domain.id, domain.minYear,
      async (portfolio, tx) => {
        const year = portfolio.simulated_year;
        const positions = portfolio.positions.map((p) => ({ ...p }));
        const existing = positions.find((p) => p.symbol === symbol);
        // Tolérance flottante pour une vente "de tout" sur une quantité fractionnaire.
        if (!existing || existing.quantity < quantity - 1e-9) {
          throw new TradingError('INSUFFICIENT_QUANTITY', 'Quantité détenue insuffisante');
        }
        const price = domain.getPrice(symbol, year);
        if (price === null) {
          throw new TradingError('NOT_LISTED', `Pas de cours pour ${symbol} en ${year}`);
        }

        const sold = Math.min(quantity, existing.quantity);
        const proceeds = creditForSell(price, sold);
        existing.quantity -= sold;
        const remaining = positions.filter((p) => p.quantity > 1e-9);

        // Poussière : une vente qui vaut moins d'1 🪙 est créditée 0 (arrondi
        // contre le joueur) ; le ledger refuse les montants nuls, donc on
        // n'écrit pas de ligne dans ce cas.
        if (proceeds > 0) {
          await investcoinsRepository.applyTransaction(userId, proceeds, 'trade_sell', {
            domain: domain.id, symbol, quantity: sold, price, year,
          }, tx);
        }

        const totals = {
          totalBought: portfolio.total_bought,
          totalProceeds: portfolio.total_proceeds + proceeds,
        };
        await virtualPortfolioRepository.save(tx, portfolio.id, { positions: remaining, ...totals });
        await snapshot(tx, userId, domain, remaining, totals, year);

        return { success: true, proceeds, price, positions: remaining };
      }
    );
  },

  async advanceYear(userId: string, domainId: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    await loadUser(userId);

    return virtualPortfolioRepository.withLock(
      userId, MODE, domain.id, domain.minYear,
      async (portfolio, tx) => {
        if (portfolio.simulated_year >= domain.maxYear) {
          throw new TradingError('MAX_YEAR_REACHED', `Déjà à la dernière année disponible (${domain.maxYear})`);
        }
        const newYear = portfolio.simulated_year + 1;
        await virtualPortfolioRepository.setYear(tx, portfolio.id, newYear);

        const totals = {
          totalBought: portfolio.total_bought,
          totalProceeds: portfolio.total_proceeds,
        };
        await snapshot(tx, userId, domain, portfolio.positions, totals, newYear);

        const { marketValue } = valuePositions(domain, portfolio.positions, newYear);
        return {
          success: true,
          simulatedYear: newYear,
          marketValue,
          performancePct: computePerformancePct({ marketValue, ...totals }),
        };
      }
    );
  },

  async getLeaderboard(userId: string, domainId: unknown, rawYear: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    let year: number;
    if (rawYear === undefined || rawYear === '') {
      const portfolio = await virtualPortfolioRepository.getOrCreate(userId, MODE, domain.id, domain.minYear);
      year = portfolio.simulated_year;
    } else {
      year = Number(rawYear);
      if (!Number.isInteger(year) || year < domain.minYear || year > domain.maxYear) {
        throw new TradingError('INVALID_INPUT', 'Année invalide');
      }
    }
    const board = await leaderboardRepository.getBoard({
      mode: MODE,
      domain: domain.id,
      year,
      minCapital: MIN_RANKED_CAPITAL,
      limit: LEADERBOARD_SIZE,
      callerId: userId,
    });
    return { domain: domain.id, year, minCapital: MIN_RANKED_CAPITAL, ...board };
  },
};
