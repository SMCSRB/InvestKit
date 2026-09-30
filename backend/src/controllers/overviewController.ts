import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { overviewService } from '../services/overviewService';

export const overviewController = {
  get: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await overviewService.get(req.user!.userId));
    } catch (error) {
      console.error('Overview error:', error);
      res.status(500).json({ error: 'Erreur lors de la lecture de la vue d\'ensemble' });
    }
  },
};
