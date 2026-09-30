import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { cryptoController } from '../controllers/cryptoController';

// Domaine Crypto (marché simulé). Toutes les routes sont authentifiées ; la date simulée vient du compte (serveur), jamais du navigateur.
export const cryptoRoutes = Router();
cryptoRoutes.get('/state', authMiddleware, cryptoController.state);
cryptoRoutes.post('/account', authMiddleware, cryptoController.create);
cryptoRoutes.get('/assets', authMiddleware, cryptoController.assets);
cryptoRoutes.get('/assets/:symbol', authMiddleware, cryptoController.asset);
cryptoRoutes.get('/candles', authMiddleware, cryptoController.candles);
cryptoRoutes.get('/compare', authMiddleware, cryptoController.compare);
cryptoRoutes.post('/time/advance', authMiddleware, cryptoController.advance);
