import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DOMAINS } from '../data/marketData';
import { BankError } from '../services/bankService';
import { tradingService, TradingError, resolveDomainOrThrow } from '../services/tradingService';

// Le domaine vient de ?domain= (GET) ou du corps (POST). Absent = 'stocks',
// ce qui garde la compatibilité avec l'interface Bourse existante.
const domainOf = (req: AuthRequest): unknown => req.query.domain ?? req.body?.domain;

const STATUS: Record<string, number> = {
  UNKNOWN_DOMAIN: 400,
  INVALID_INPUT: 400,
  NOT_LISTED: 400,
  INSUFFICIENT_FUNDS: 400,
  INSUFFICIENT_QUANTITY: 400,
  INVALID_ACCOUNT: 400,
  PEA_CEILING: 400,
  MAX_YEAR_REACHED: 400,
  DOMAIN_LOCKED: 403,
  FREE_DOMAIN_NOT_CHOSEN: 403,
  USER_NOT_FOUND: 404,
};

const handle = (fallback: string, fn: (req: AuthRequest, userId: string) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    try {
      res.json(await fn(req, req.user.userId));
    } catch (error) {
      if (error instanceof BankError) {
        res.status(400).json({ error: error.message, code: error.code, details: error.details });
        return;
      }
      if (error instanceof TradingError) {
        res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code });
        return;
      }
      console.error(fallback, error);
      res.status(500).json({ error: fallback });
    }
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
    try {
      const domain = resolveDomainOrThrow(domainOf(req));
      res.json({ assets: domain.assets, minYear: domain.minYear, maxYear: domain.maxYear });
    } catch {
      res.status(400).json({ error: 'Domaine inconnu' });
    }
  },

  getPortfolio: handle('Erreur lors de la récupération du portefeuille', (req, uid) =>
    tradingService.getPortfolioView(uid, domainOf(req))),

  history: handle('Erreur lors de la récupération de l\'historique', (req, uid) =>
    tradingService.history(uid, domainOf(req), req.query.symbol)),

  buy: handle('Erreur lors de l\'achat', (req, uid) =>
    tradingService.buy(uid, domainOf(req), req.body?.symbol, req.body?.quantity, req.body?.account)),

  sell: handle('Erreur lors de la vente', (req, uid) =>
    tradingService.sell(uid, domainOf(req), req.body?.symbol, req.body?.quantity, req.body?.account)),

  quote: handle('Erreur lors de l\'aperçu de l\'ordre', (req, uid) =>
    tradingService.quote(uid, domainOf(req), req.body?.side, req.body?.symbol, req.body?.quantity, req.body?.account)),

  advanceYear: handle('Erreur lors de l\'avancée dans le temps', (req, uid) =>
    tradingService.advanceYear(uid, domainOf(req))),

  getLeaderboard: handle('Erreur lors de la récupération du classement', (req, uid) =>
    tradingService.getLeaderboard(uid, domainOf(req), req.query.year)),
};
