import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { wealthHistoryService } from '../services/wealthHistoryService';

export const wealthRoutes = Router();

// Historique de MON patrimoine (identifiant pris dans le jeton). Compte gratuit : points récents seulement (décidé par le serveur).
wealthRoutes.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try { res.json(await wealthHistoryService.forPlayer(req.user!.userId, req.query.limit)); }
  catch (e: any) {
    if (e?.message === 'INVALID_LIMIT') { res.status(400).json({ error: 'limit invalide' }); return; }
    console.error('Erreur historique du patrimoine', e); res.status(500).json({ error: 'Erreur lors de la lecture de l\'historique' });
  }
});
