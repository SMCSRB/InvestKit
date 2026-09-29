import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';
import { bankService, BankError } from '../services/bankService';
import { bankPersonalService } from '../services/bankPersonalService';
import { bankPortfolioService } from '../services/bankPortfolioService';
import { bankRecoveryService } from '../services/bankRecoveryService';
import { RealEstateError } from '../services/realEstateService';

const STATUS: Record<string, number> = {
  INVALID_INPUT: 400, INSUFFICIENT_FUNDS: 400, NOT_ALLOWED: 403, CREDIT_BLOCKED: 403, NOT_FOUND: 404, LIMIT_REACHED: 409,
};

// Les contrôleurs lisent seulement l'identité (jeton) et traduisent les erreurs : toutes les règles sont dans bankService.
export const handleBank = (fallback: string, fn: (req: AuthRequest, userId: string) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
    try {
      res.json(await fn(req, req.user.userId));
    } catch (error) {
      if (error instanceof RealEstateError) { res.status(error.code === 'NO_GAME' ? 409 : 400).json({ error: error.message, code: error.code }); return; }
      if (error instanceof BankError) { res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code, details: error.details }); return; }
      console.error(fallback, error);
      res.status(500).json({ error: fallback });
    }
  };

export const bankController = {
  overview: handleBank('Erreur lors de la lecture de la banque', (_r, uid) => bankService.overview(uid)),
  events: handleBank('Erreur lors de la lecture du journal', (r, uid) => bankService.events(uid, r.query.limit)),
  personalQuote: handleBank('Erreur lors de la simulation du prêt', (r, uid) => bankPersonalService.quote(uid, r.body)),
  personalBorrow: handleBank('Erreur lors de l\'emprunt', (r, uid) => bankPersonalService.borrow(uid, r.body)),
  portfolioQuote: handleBank('Erreur lors de la simulation du prêt', (r, uid) => bankPortfolioService.quote(uid, r.body)),
  portfolioBorrow: handleBank('Erreur lors de l\'emprunt', (r, uid) => bankPortfolioService.borrow(uid, r.body)),
  portfolioRepay: handleBank('Erreur lors du remboursement', (r, uid) => bankPortfolioService.repay(uid, r.params.id, r.body?.coins)),
  recoveryPreview: handleBank('Erreur lors de l\'aperçu du rétablissement', (r, uid) => bankRecoveryService.preview(uid, r.body)),
  recoveryStart: handleBank('Erreur lors du rétablissement', (r, uid) => bankRecoveryService.start(uid, r.body)),
  earlyRepay: handleBank('Erreur lors du remboursement', (r, uid) => bankService.earlyRepay(uid, r.params.id)),

  // Réservé aux administrateurs (rôle lu en base, jamais dans le jeton).
  adminStats: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
      const user = await userRepository.findById(req.user.userId);
      if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Réservé aux administrateurs' }); return; }
      res.json(await bankService.adminStats());
    } catch (error) {
      console.error('Bank admin stats error:', error);
      res.status(500).json({ error: 'Erreur lors du calcul de la statistique' });
    }
  },
};
