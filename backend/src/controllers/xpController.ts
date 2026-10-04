import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { xpService } from '../services/xpService';

export const xpController = {
  me: async (req: AuthRequest, res: Response): Promise<void> => {
    try { res.json(await xpService.me(req.user!.userId)); }
    catch (error) { console.error('Erreur lors de la lecture de l\'XP', error); res.status(500).json({ error: 'Erreur lors de la lecture de l\'XP' }); }
  },
};
