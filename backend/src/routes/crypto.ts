import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { cryptoOrderLimiter } from '../middleware/rateLimiter';
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
cryptoRoutes.get('/quote', authMiddleware, cryptoController.quote);
cryptoRoutes.get('/portfolio', authMiddleware, cryptoController.portfolio);
cryptoRoutes.get('/orders', authMiddleware, cryptoController.orders);
cryptoRoutes.post('/orders', authMiddleware, cryptoOrderLimiter, cryptoController.placeOrder);
cryptoRoutes.delete('/orders/:id', authMiddleware, cryptoOrderLimiter, cryptoController.cancelOrder);
cryptoRoutes.post('/swap', authMiddleware, cryptoOrderLimiter, cryptoController.swap);
cryptoRoutes.get('/events', authMiddleware, cryptoController.events);
cryptoRoutes.get('/loan', authMiddleware, cryptoController.loan);
cryptoRoutes.post('/loan/quote', authMiddleware, cryptoController.loanQuote);
cryptoRoutes.post('/loan/borrow', authMiddleware, cryptoOrderLimiter, cryptoController.loanBorrow);
cryptoRoutes.post('/loan/repay', authMiddleware, cryptoOrderLimiter, cryptoController.loanRepay);
cryptoRoutes.get('/leaderboard', authMiddleware, cryptoController.leaderboard);
