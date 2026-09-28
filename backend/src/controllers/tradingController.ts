import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { virtualPortfolioRepository, Position } from '../repositories/virtualPortfolioRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { getAvailableAssets, getPriceAtYear, isValidSymbol, MIN_YEAR, MAX_YEAR } from '../data/stockPrices';

const MODE = 'accelerated'; // seul mode disponible pour l'instant (décision produit)
const DOMAIN = 'stocks'; // Bourse/PEA en premier (décision produit)

const computePortfolioValue = (positions: Position[], year: number) => {
  let marketValue = 0;
  let costBasis = 0;
  for (const pos of positions) {
    const price = getPriceAtYear(pos.symbol, year) ?? 0;
    marketValue += price * pos.quantity;
    costBasis += pos.avgBuyPrice * pos.quantity;
  }
  const performancePct = costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;
  return { marketValue, costBasis, performancePct };
};

export const tradingController = {
  getAssets: async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ assets: getAvailableAssets(), minYear: MIN_YEAR, maxYear: MAX_YEAR });
  },

  getPortfolio: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(req.user.userId, MODE, DOMAIN);
      const balance = await investcoinsRepository.getBalance(req.user.userId);
      const { marketValue, costBasis, performancePct } = computePortfolioValue(
        portfolio.positions,
        portfolio.simulated_year
      );

      res.json({
        positions: portfolio.positions,
        simulatedYear: portfolio.simulated_year,
        minYear: MIN_YEAR,
        maxYear: MAX_YEAR,
        cashBalance: balance,
        marketValue,
        costBasis,
        performancePct,
        totalValue: balance + marketValue,
      });
    } catch (error) {
      console.error('Get portfolio error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du portefeuille' });
    }
  },

  buy: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { symbol, quantity } = req.body;
      if (!symbol || !isValidSymbol(symbol) || !quantity || quantity <= 0) {
        res.status(400).json({ error: 'Symbole ou quantité invalide' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(req.user.userId, MODE, DOMAIN);
      const price = getPriceAtYear(symbol, portfolio.simulated_year)!;
      const cost = Math.round(price * quantity * 100) / 100;

      const balance = await investcoinsRepository.getBalance(req.user.userId);
      if (balance < cost) {
        res.status(400).json({ error: 'Solde InvestCoins insuffisant' });
        return;
      }

      const positions = [...portfolio.positions];
      const existing = positions.find((p) => p.symbol === symbol);
      if (existing) {
        const totalQuantity = existing.quantity + quantity;
        existing.avgBuyPrice =
          (existing.avgBuyPrice * existing.quantity + price * quantity) / totalQuantity;
        existing.quantity = totalQuantity;
      } else {
        positions.push({ symbol, quantity, avgBuyPrice: price });
      }

      await investcoinsRepository.applyTransaction(req.user.userId, -cost, 'trade_buy', {
        symbol,
        quantity,
        price,
        year: portfolio.simulated_year,
      });
      await virtualPortfolioRepository.updatePositions(portfolio.id, positions);

      res.json({ success: true, cost, price, positions });
    } catch (error) {
      console.error('Buy error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'achat' });
    }
  },

  sell: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { symbol, quantity } = req.body;
      if (!symbol || !quantity || quantity <= 0) {
        res.status(400).json({ error: 'Symbole ou quantité invalide' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(req.user.userId, MODE, DOMAIN);
      const positions = [...portfolio.positions];
      const existing = positions.find((p) => p.symbol === symbol);

      if (!existing || existing.quantity < quantity) {
        res.status(400).json({ error: 'Quantité détenue insuffisante' });
        return;
      }

      const price = getPriceAtYear(symbol, portfolio.simulated_year)!;
      const proceeds = Math.round(price * quantity * 100) / 100;

      existing.quantity -= quantity;
      const updatedPositions = positions.filter((p) => p.quantity > 0);

      await investcoinsRepository.applyTransaction(req.user.userId, proceeds, 'trade_sell', {
        symbol,
        quantity,
        price,
        year: portfolio.simulated_year,
      });
      await virtualPortfolioRepository.updatePositions(portfolio.id, updatedPositions);

      res.json({ success: true, proceeds, price, positions: updatedPositions });
    } catch (error) {
      console.error('Sell error:', error);
      res.status(500).json({ error: 'Erreur lors de la vente' });
    }
  },

  advanceYear: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(req.user.userId, MODE, DOMAIN);
      if (portfolio.simulated_year >= MAX_YEAR) {
        res.status(400).json({ error: `Déjà à la dernière année disponible (${MAX_YEAR})` });
        return;
      }

      const newYear = portfolio.simulated_year + 1;
      await virtualPortfolioRepository.advanceYear(portfolio.id, newYear);

      const { marketValue, performancePct } = computePortfolioValue(portfolio.positions, newYear);

      res.json({ success: true, simulatedYear: newYear, marketValue, performancePct });
    } catch (error) {
      console.error('Advance year error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'avancée dans le temps' });
    }
  },
};
