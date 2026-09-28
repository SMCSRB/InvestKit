import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { virtualPortfolioRepository, Position } from '../repositories/virtualPortfolioRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { DOMAINS, DomainConfig, getDomain } from '../data/marketData';

const MODE = 'accelerated'; // seul mode disponible pour l'instant (décision produit)

// Le domaine vient de ?domain= (GET) ou du corps (POST). Absent = 'stocks',
// ce qui garde la compatibilité avec l'interface Bourse existante.
const resolveDomain = (req: AuthRequest): DomainConfig | null =>
  getDomain(req.query.domain ?? req.body?.domain);

const computePortfolioValue = (domain: DomainConfig, positions: Position[], year: number) => {
  let marketValue = 0;
  let costBasis = 0;
  for (const pos of positions) {
    const price = domain.getPrice(pos.symbol, year) ?? 0;
    marketValue += price * pos.quantity;
    costBasis += pos.avgBuyPrice * pos.quantity;
  }
  const performancePct = costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;
  return { marketValue, costBasis, performancePct };
};

export const tradingController = {
  getDomains: async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({
      domains: Object.values(DOMAINS).map((d) => ({
        id: d.id,
        label: d.label,
        minYear: d.minYear,
        maxYear: d.maxYear,
      })),
    });
  },

  getAssets: async (req: AuthRequest, res: Response): Promise<void> => {
    const domain = resolveDomain(req);
    if (!domain) {
      res.status(400).json({ error: 'Domaine inconnu' });
      return;
    }
    res.json({ assets: domain.assets, minYear: domain.minYear, maxYear: domain.maxYear });
  },

  getPortfolio: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }
      const domain = resolveDomain(req);
      if (!domain) {
        res.status(400).json({ error: 'Domaine inconnu' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(
        req.user.userId, MODE, domain.id, domain.minYear
      );
      const balance = await investcoinsRepository.getBalance(req.user.userId);
      const { marketValue, costBasis, performancePct } = computePortfolioValue(
        domain, portfolio.positions, portfolio.simulated_year
      );

      // Prix du jour (année simulée) de chaque actif : permet à l'interface
      // d'afficher le coût d'un achat avant de le valider, et d'indiquer
      // les actifs pas encore cotés à cette date.
      const prices: Record<string, number | null> = {};
      for (const asset of domain.assets) {
        prices[asset.symbol] = domain.getPrice(asset.symbol, portfolio.simulated_year);
      }

      res.json({
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
      const domain = resolveDomain(req);
      if (!domain) {
        res.status(400).json({ error: 'Domaine inconnu' });
        return;
      }

      const { symbol, quantity } = req.body;
      if (!symbol || !domain.isValidSymbol(symbol) || !quantity || quantity <= 0) {
        res.status(400).json({ error: 'Symbole ou quantité invalide' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(
        req.user.userId, MODE, domain.id, domain.minYear
      );
      const price = domain.getPrice(symbol, portfolio.simulated_year);
      if (price === null) {
        res.status(400).json({ error: `${symbol} n'existe pas encore en ${portfolio.simulated_year}` });
        return;
      }
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
        domain: domain.id,
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
      const domain = resolveDomain(req);
      if (!domain) {
        res.status(400).json({ error: 'Domaine inconnu' });
        return;
      }

      const { symbol, quantity } = req.body;
      if (!symbol || !quantity || quantity <= 0) {
        res.status(400).json({ error: 'Symbole ou quantité invalide' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(
        req.user.userId, MODE, domain.id, domain.minYear
      );
      const positions = [...portfolio.positions];
      const existing = positions.find((p) => p.symbol === symbol);

      if (!existing || existing.quantity < quantity) {
        res.status(400).json({ error: 'Quantité détenue insuffisante' });
        return;
      }

      const price = domain.getPrice(symbol, portfolio.simulated_year);
      if (price === null) {
        res.status(400).json({ error: `Pas de cours pour ${symbol} en ${portfolio.simulated_year}` });
        return;
      }
      const proceeds = Math.round(price * quantity * 100) / 100;

      existing.quantity -= quantity;
      // Tolérance flottante : une vente "de tout" sur une quantité fractionnaire
      // (crypto) ne doit pas laisser une position fantôme de 1e-16.
      const updatedPositions = positions.filter((p) => p.quantity > 1e-9);

      await investcoinsRepository.applyTransaction(req.user.userId, proceeds, 'trade_sell', {
        domain: domain.id,
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
      const domain = resolveDomain(req);
      if (!domain) {
        res.status(400).json({ error: 'Domaine inconnu' });
        return;
      }

      const portfolio = await virtualPortfolioRepository.getOrCreate(
        req.user.userId, MODE, domain.id, domain.minYear
      );
      if (portfolio.simulated_year >= domain.maxYear) {
        res.status(400).json({ error: `Déjà à la dernière année disponible (${domain.maxYear})` });
        return;
      }

      const newYear = portfolio.simulated_year + 1;
      await virtualPortfolioRepository.advanceYear(portfolio.id, newYear);

      const { marketValue, performancePct } = computePortfolioValue(domain, portfolio.positions, newYear);

      res.json({ success: true, simulatedYear: newYear, marketValue, performancePct });
    } catch (error) {
      console.error('Advance year error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'avancée dans le temps' });
    }
  },
};
