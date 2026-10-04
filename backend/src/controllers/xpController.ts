import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { xpService } from '../services/xpService';
import { badgeService } from '../services/badgeService';

export const xpController = {
  badges: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await badgeService.list(req.user!.userId)); }
    catch (error) { console.error('Erreur lors de la lecture des badges', error); res.status(500).json({ error: 'Erreur lors de la lecture des badges' }); }
  },
  me: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await xpService.me(req.user!.userId)); }
    catch (error) { console.error('Erreur lors de la lecture de l\'XP', error); res.status(500).json({ error: 'Erreur lors de la lecture de l\'XP' }); }
  },
};
