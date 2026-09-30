import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { riskController } from '../controllers/riskController';
import { toolsLimiter } from '../middleware/rateLimiter';

// Outils de calcul (Monte Carlo, tests de résistance, score de risque, corrélations) : publics pour alimenter les simulateurs sans compte,
// limités par IP (calculs coûteux) ; aucune donnée personnelle, rien n'est enregistré.
export const toolsRoutes = Router();
toolsRoutes.post('/monte-carlo', toolsLimiter, riskController.monteCarlo);
toolsRoutes.post('/stress-test', toolsLimiter, riskController.stress);
toolsRoutes.post('/risk-score', toolsLimiter, riskController.score);
toolsRoutes.get('/correlation', toolsLimiter, riskController.correlation);

// Risque du portefeuille simulé du joueur connecté.
export const riskRoutes = Router();
riskRoutes.get('/portfolio', authMiddleware, riskController.portfolio);
