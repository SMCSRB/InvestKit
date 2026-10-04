import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { guideLimiter } from '../middleware/rateLimiter';
import { guideService, GuideError } from '../services/guideService';

export const guideRoutes = Router();

const fail = (res: Response, e: unknown, fallback: string): void => {
  if (e instanceof GuideError) { res.status(400).json({ error: e.message }); return; }
  console.error(fallback, e);
  res.status(500).json({ error: fallback });
};

// Avancement de MA visite guidée (identifiant pris dans le jeton, jamais dans la requête).
guideRoutes.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try { res.json(await guideService.get(req.user!.userId)); } catch (e) { fail(res, e, 'Erreur lors de la lecture de la visite guidée'); }
});
guideRoutes.put('/', authMiddleware, guideLimiter, async (req: AuthRequest, res: Response) => {
  try { res.json(await guideService.patch(req.user!.userId, req.body)); } catch (e) { fail(res, e, 'Erreur lors de l\'enregistrement de la visite guidée'); }
});
guideRoutes.post('/reset', authMiddleware, guideLimiter, async (req: AuthRequest, res: Response) => {
  try { res.json(await guideService.reset(req.user!.userId, req.body?.scope)); } catch (e) { fail(res, e, 'Erreur lors de la remise à zéro de la visite guidée'); }
});
