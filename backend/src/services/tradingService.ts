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
import { query } from '../utils/db';
import { computeNetPerformance } from '../engine/immo';
import { Account, AssetKind, brokerageFee, readTaxState, saleTax, TaxState } from '../engine/trading/costs';
import { TRADING_COSTS, TRADING_TAX } from '../config/tradingRules';
import { bankPortfolioService, portfolioLoanView, portfolioDebtInfo } from './bankPortfolioService';
import {
  MAX_TRADE_QUANTITY,
  MAX_QUANTITY_DECIMALS,
  LEADERBOARD_SIZE,
} from '../config/game';
import { RANKING_MIN_INVESTED } from '../config/economy';

export const MODE = 'accelerated'; // seul mode disponible pour l'instant (décision produit)

export type TradingErrorCode =
  | 'UNKNOWN_DOMAIN'
  | 'INVALID_INPUT'
  | 'DOMAIN_LOCKED'
  | 'FREE_DOMAIN_NOT_CHOSEN'
  | 'NOT_LISTED'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_QUANTITY'
  | 'INVALID_ACCOUNT'
  | 'PEA_CEILING'
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


// ── Enveloppes (PEA / compte-titres / crypto), frais et impôts ──
const defaultAccount = (domain: DomainConfig): Account => (domain.id === 'crypto' ? 'crypto' : 'cto');
const accountOf = (domain: DomainConfig, p: Position): Account => (p.account as Account) ?? defaultAccount(domain);

const kindOf = (domain: DomainConfig, symbol: string): AssetKind => {
  const t = domain.assets.find((a) => a.symbol === symbol)?.type;
  return t === 'etf' || t === 'crypto' ? t : 'stock';
};

// Enveloppe demandée. Achat : PEA par défaut en Bourse (c'est le plus avantageux, le joueur peut choisir le compte-titres).
const resolveAccount = (domain: DomainConfig, raw: unknown): Account | null => {
  if (raw === undefined || raw === null || raw === '') return null;
  const allowed: Account[] = domain.id === 'crypto' ? ['crypto'] : ['pea', 'cto'];
  if (typeof raw !== 'string' || !allowed.includes(raw as Account)) {
    throw new TradingError('INVALID_ACCOUNT', domain.id === 'crypto' ? 'La crypto n\'a pas d\'enveloppe à choisir' : 'Enveloppe inconnue : choisis « pea » ou « cto »');
  }
  return raw as Account;
};

const findPosition = (domain: DomainConfig, positions: Position[], symbol: string, account: Account) =>
  positions.find((p) => p.symbol === symbol && accountOf(domain, p) === account);

// Devis commun à l'aperçu et à l'exécution : frais, impôt et explication.
const saleQuote = (domain: DomainConfig, pos: Position, sold: number, price: number, year: number, ts: TaxState) => {
  const proceeds = creditForSell(price, sold);
  const account = accountOf(domain, pos);
  const fee = proceeds > 0 ? brokerageFee(kindOf(domain, pos.symbol), proceeds) : 0;
  const tax = saleTax({ account, year, proceeds, basis: pos.avgBuyPrice * sold, taxState: ts });
  return { account, proceeds, fee, tax, net: proceeds - fee - tax.total };
};

const pickSellAccount = (domain: DomainConfig, positions: Position[], symbol: string, requested: Account | null): Account => {
  if (requested) return requested;
  const held = positions.filter((p) => p.symbol === symbol).map((p) => accountOf(domain, p));
  if (held.length > 1) throw new TradingError('INVALID_ACCOUNT', 'Tu détiens ce titre sur plusieurs enveloppes : précise laquelle vendre (« pea » ou « cto »)');
  return held[0] ?? defaultAccount(domain);
};

const PEA_YEARS = TRADING_TAX.pea.exemptAfterYears;

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
  // Classement net de dettes : un prêt sur portefeuille déduit ses intérêts, le gain est rapporté au capital propre, et le levier est affiché.
  const debt = await portfolioDebtInfo(tx, userId, domain.id);
  const borrowed = debt.debt > 0 || debt.interestPaid > 0;
  const net = borrowed
    ? computeNetPerformance({ equity: marketValue, cumulativeCashFlow: totals.totalProceeds, invested: totals.totalBought, interestPaid: debt.interestPaid, borrowedInvested: Math.min(totals.totalBought, Math.max(0, debt.debt - debt.reserve)) })
    : null;
  await leaderboardRepository.upsertSnapshot(tx, {
    userId,
    mode: MODE,
    domain: domain.id,
    year,
    performancePct: net ? net.performancePct : computePerformancePct({ marketValue, ...totals }),
    capitalCommitted: totals.totalBought,
    leverage: net ? net.leverage : null,
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
  // Historique d'un titre, BORNÉ à l'année simulée du joueur : aucune année postérieure n'est jamais renvoyée.
  // Cours de clôture annuels du jeu de données simplifié (illustratifs, pas des cours réels).
  async history(userId: string, domainId: unknown, rawSymbol: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    if (typeof rawSymbol !== 'string' || !rawSymbol || !domain.isValidSymbol(rawSymbol)) {
      throw new TradingError('INVALID_INPUT', 'Symbole invalide');
    }
    await loadUser(userId);
    // Lecture seule : aucun portefeuille n'est créé par une simple consultation.
    const row = (await query('SELECT simulated_year FROM virtual_portfolios WHERE user_id = $1 AND mode = $2 AND domain = $3', [userId, MODE, domain.id])).rows[0];
    const simulatedYear: number = row ? Number(row.simulated_year) : domain.minYear;
    const points: { year: number; close: number }[] = [];
    for (let y = domain.minYear; y <= simulatedYear; y++) {
      const close = domain.getPrice(rawSymbol, y);
      if (close !== null) points.push({ year: y, close });
    }
    return { symbol: rawSymbol, domain: domain.id, simulatedYear, illustrative: true, points };
  },

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
    const ts = readTaxState(portfolio.tax_state);
    const positions = portfolio.positions.map((p) => ({ ...p, account: accountOf(domain, p) }));
    const bank = ['stocks', 'crypto'].includes(domain.id) ? await portfolioLoanView({ query } as any, userId, domain, portfolio.positions, portfolio.simulated_year) : null;
    return {
      bank,
      domain: domain.id,
      positions,
      costs: {
        brokeragePct: Object.fromEntries(Object.entries(TRADING_COSTS.brokerage).map(([k, v]) => [k, v.ratePct])),
        feesPaid: ts.feesPaid,
        taxPaid: ts.taxPaid,
        pea: domain.id === 'stocks' ? {
          openedYear: ts.peaOpenedYear,
          exemptFromYear: ts.peaOpenedYear === null ? null : ts.peaOpenedYear + PEA_YEARS,
          deposits: ts.peaDeposits,
          depositCeiling: TRADING_TAX.pea.depositCeiling,
        } : null,
        cryptoDisposalsThisYear: domain.id === 'crypto' ? (ts.cryptoSales[String(portfolio.simulated_year)] ?? 0) : null,
        cryptoThreshold: TRADING_TAX.cryptoDisposalThreshold,
      },
      simulatedYear: portfolio.simulated_year,
      minYear: domain.minYear,
      maxYear: domain.maxYear,
      cashBalance: balance,
      marketValue,
      costBasis,
      performancePct,
      totalValue: balance + marketValue,
      prices,
      freeDomain: user.free_domain ?? null,
      canChangeFreeDomain: !!user.free_domain && user.free_domain_change_allowed === true,
      access: access.allowed
        ? { canBuy: true, reason: null }
        : { canBuy: false, reason: access.reason },
    };
  },

  async buy(userId: string, domainId: unknown, rawSymbol: unknown, rawQuantity: unknown, rawAccount?: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    const { symbol, quantity } = validateOrder(domain, rawSymbol, rawQuantity);
    const account: Account = resolveAccount(domain, rawAccount) ?? (domain.id === 'crypto' ? 'crypto' : 'pea');

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
            throw new TradingError('INVALID_INPUT', 'Montant trop faible (minimum 1 InvestCoin)');
          }

          const fee = brokerageFee(kindOf(domain, symbol), cost);
          const ts = readTaxState(portfolio.tax_state);
          if (account === 'pea') {
            if (ts.peaDeposits + cost > TRADING_TAX.pea.depositCeiling) {
              throw new TradingError('PEA_CEILING', `Plafond de versements du PEA (${TRADING_TAX.pea.depositCeiling.toLocaleString('fr-FR')} InvestCoins) dépassé : utilise le compte-titres`);
            }
            ts.peaDeposits += cost;
            if (ts.peaOpenedYear === null) ts.peaOpenedYear = year;
          }

          await investcoinsRepository.applyTransaction(userId, -cost, 'trade_buy', {
            domain: domain.id, symbol, quantity, price, year, account,
          }, tx);
          // Courtage : pièces détruites (puits d'InvestCoins).
          if (fee > 0) {
            await investcoinsRepository.applyTransaction(userId, -fee, 'fee_brokerage', { domain: domain.id, symbol, side: 'buy', year, account }, tx);
            ts.feesPaid += fee;
          }

          const positions = portfolio.positions.map((p) => ({ ...p, account: accountOf(domain, p) }));
          const existing = findPosition(domain, positions, symbol, account);
          if (existing) {
            const total = existing.quantity + quantity;
            existing.avgBuyPrice = (existing.avgBuyPrice * existing.quantity + price * quantity) / total;
            existing.quantity = total;
          } else {
            positions.push({ symbol, quantity, avgBuyPrice: price, account });
          }

          const totals = {
            totalBought: portfolio.total_bought + cost + fee,
            totalProceeds: portfolio.total_proceeds,
          };
          await virtualPortfolioRepository.save(tx, portfolio.id, { positions, ...totals, taxState: ts });
          await snapshot(tx, userId, domain, positions, totals, year);

          return { success: true, cost, fee, account, price, positions };
        }
      );
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw new TradingError('INSUFFICIENT_FUNDS', 'Solde InvestCoins insuffisant');
      }
      throw error;
    }
  },

  async sell(userId: string, domainId: unknown, rawSymbol: unknown, rawQuantity: unknown, rawAccount?: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    const { symbol, quantity } = validateOrder(domain, rawSymbol, rawQuantity);
    const requested = resolveAccount(domain, rawAccount);
    // La vente est toujours autorisée (même sur un domaine verrouillé) :
    // on ne piège jamais un joueur dans une position.
    await loadUser(userId);

    return virtualPortfolioRepository.withLock(
      userId, MODE, domain.id, domain.minYear,
      async (portfolio, tx) => {
        const year = portfolio.simulated_year;
        const positions = portfolio.positions.map((p) => ({ ...p, account: accountOf(domain, p) }));
        const account = pickSellAccount(domain, positions, symbol, requested);
        const existing = findPosition(domain, positions, symbol, account);
        // Tolérance flottante pour une vente "de tout" sur une quantité fractionnaire.
        if (!existing || existing.quantity < quantity - 1e-9) {
          throw new TradingError('INSUFFICIENT_QUANTITY', 'Quantité détenue insuffisante');
        }
        const price = domain.getPrice(symbol, year);
        if (price === null) {
          throw new TradingError('NOT_LISTED', `Pas de cours pour ${symbol} en ${year}`);
        }

        const sold = Math.min(quantity, existing.quantity);
        const ts = readTaxState(portfolio.tax_state);
        const q = saleQuote(domain, existing, sold, price, year, ts);
        const { proceeds, fee, tax } = q;
        existing.quantity -= sold;
        const remaining = positions.filter((p) => p.quantity > 1e-9);

        // Poussière : une vente qui vaut moins d'1 InvestCoin est créditée 0 (arrondi
        // contre le joueur) ; le ledger refuse les montants nuls, donc on
        // n'écrit pas de ligne dans ce cas.
        if (proceeds > 0) {
          await investcoinsRepository.applyTransaction(userId, proceeds, 'trade_sell', {
            domain: domain.id, symbol, quantity: sold, price, year, account,
          }, tx);
          // Courtage puis impôt sur la plus-value : pièces détruites (puits d'InvestCoins).
          if (fee > 0) await investcoinsRepository.applyTransaction(userId, -fee, 'fee_brokerage', { domain: domain.id, symbol, side: 'sell', year, account }, tx);
          if (tax.total > 0) {
            await investcoinsRepository.applyTransaction(userId, -tax.total, 'tax_capital_gains', {
              domain: domain.id, symbol, year, account, gain: tax.gain, incomeTax: tax.incomeTax, social: tax.social,
            }, tx);
          }
        }
        ts.feesPaid += fee;
        ts.taxPaid += tax.total;
        if (account === 'crypto') ts.cryptoSales[String(year)] = (ts.cryptoSales[String(year)] ?? 0) + proceeds;
        const net = Math.max(0, q.net);

        // Titres en garantie d'un prêt : ce qui manque à la garantie est remboursé sur le produit net de la vente, sinon la vente est refusée.
        const release = await bankPortfolioService.releaseCollateral(tx as any, userId, domain, remaining, year, net);

        const totals = {
          totalBought: portfolio.total_bought,
          totalProceeds: portfolio.total_proceeds + net,
        };
        await virtualPortfolioRepository.save(tx, portfolio.id, { positions: remaining, ...totals, taxState: ts });
        await snapshot(tx, userId, domain, remaining, totals, year);

        return { success: true, proceeds, fee, tax: tax.total, taxDetails: tax, netProceeds: net, account, price, positions: remaining, loanAutoRepaid: release.autoRepaid, loanMessage: release.message };
      }
    );
  },


  // Aperçu d'un ordre SANS l'exécuter : frais, impôt sur la plus-value et explication (affichés avant validation).
  async quote(userId: string, domainId: unknown, rawSide: unknown, rawSymbol: unknown, rawQuantity: unknown, rawAccount?: unknown) {
    const domain = resolveDomainOrThrow(domainId);
    const { symbol, quantity } = validateOrder(domain, rawSymbol, rawQuantity);
    if (rawSide !== 'buy' && rawSide !== 'sell') throw new TradingError('INVALID_INPUT', 'Sens de l\'ordre invalide (buy ou sell)');
    await loadUser(userId);
    const portfolio = await virtualPortfolioRepository.getOrCreate(userId, MODE, domain.id, domain.minYear);
    const year = portfolio.simulated_year;
    const price = domain.getPrice(symbol, year);
    if (price === null) throw new TradingError('NOT_LISTED', `${symbol} n'existe pas encore en ${year}`);
    const ts = readTaxState(portfolio.tax_state);
    const requested = resolveAccount(domain, rawAccount);
    if (rawSide === 'buy') {
      const account: Account = requested ?? (domain.id === 'crypto' ? 'crypto' : 'pea');
      const cost = chargeForBuy(price, quantity);
      const fee = brokerageFee(kindOf(domain, symbol), cost);
      return { side: 'buy', account, price, amount: cost, fee, total: cost + fee,
        note: account === 'pea' ? `PEA : gains exonérés d'impôt sur le revenu après ${PEA_YEARS} ans${ts.peaOpenedYear === null ? ' (le compteur démarre à ton premier achat)' : ` (ouvert en ${ts.peaOpenedYear})`}.` : null };
    }
    const positions = portfolio.positions.map((p) => ({ ...p, account: accountOf(domain, p) }));
    const account = pickSellAccount(domain, positions, symbol, requested);
    const pos = findPosition(domain, positions, symbol, account);
    if (!pos || pos.quantity < quantity - 1e-9) throw new TradingError('INSUFFICIENT_QUANTITY', 'Quantité détenue insuffisante');
    const q = saleQuote(domain, pos, Math.min(quantity, pos.quantity), price, year, ts);
    return { side: 'sell', account, price, amount: q.proceeds, fee: q.fee, tax: q.tax.total, gain: q.tax.gain,
      incomeTax: q.tax.incomeTax, social: q.tax.social, net: q.net, note: q.tax.note };
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

        // Prêt sur portefeuille : intérêts, nouveau taux, appel de marge ou vente forcée aux cours de la nouvelle année.
        const bank = await bankPortfolioService.processYearStep(tx as any, userId, domain, portfolio, newYear);
        const positions = bank.positions;
        const totals = {
          totalBought: portfolio.total_bought,
          totalProceeds: portfolio.total_proceeds + bank.proceedsCoins,
        };
        if (bank.changed) await virtualPortfolioRepository.save(tx, portfolio.id, { positions, ...totals });
        await snapshot(tx, userId, domain, positions, totals, newYear);

        const { marketValue } = valuePositions(domain, positions, newYear);
        return {
          success: true,
          simulatedYear: newYear,
          marketValue,
          performancePct: computePerformancePct({ marketValue, ...totals }),
          bankEvents: bank.events,
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
      minCapital: RANKING_MIN_INVESTED,
      limit: LEADERBOARD_SIZE,
      callerId: userId,
    });
    return { domain: domain.id, year, minCapital: RANKING_MIN_INVESTED, ...board };
  },
};
