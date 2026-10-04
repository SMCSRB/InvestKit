import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { profileWriteLimiter } from '../middleware/rateLimiter';
import { dashboardLayoutService, LayoutError } from '../services/dashboardLayoutService';

export const dashboardLayoutRoutes = Router();

dashboardLayoutRoutes.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try { res.json(await dashboardLayoutService.get(req.user!.userId)); }
  catch (e) { console.error('Erreur lecture disposition', e); res.status(500).json({ error: 'Erreur lors de la lecture de la disposition' }); }
});

// L'identifiant du joueur vient du jeton, jamais du corps de la requête.
dashboardLayoutRoutes.put('/', authMiddleware, profileWriteLimiter, async (req: AuthRequest, res: Response) => {
  try { res.json(await dashboardLayoutService.save(req.user!.userId, { template: req.body?.template, widgets: req.body?.widgets })); }
  catch (e) {
    if (e instanceof LayoutError) { res.status(e.code === 'PRO_REQUIRED' ? 403 : 400).json({ error: e.message, code: e.code }); return; }
    console.error('Erreur enregistrement disposition', e); res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la disposition' });
  }
});
