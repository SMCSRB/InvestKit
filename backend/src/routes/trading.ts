import { Router } from 'express';
import { walletEcho } from '../middleware/walletEcho';
import { tradingController } from '../controllers/tradingController';
import { authMiddleware } from '../middleware/auth';

export const tradingRoutes = Router();
tradingRoutes.use(walletEcho);   // chaque action qui réussit renvoie le portefeuille à jour (`wallet`)

tradingRoutes.get('/domains', authMiddleware, tradingController.getDomains);
tradingRoutes.get('/assets', authMiddleware, tradingController.getAssets);
tradingRoutes.get('/portfolio', authMiddleware, tradingController.getPortfolio);
tradingRoutes.get('/history', authMiddleware, tradingController.history);
tradingRoutes.get('/orders', authMiddleware, tradingController.orders);
tradingRoutes.post('/buy', authMiddleware, tradingController.buy);
tradingRoutes.post('/sell', authMiddleware, tradingController.sell);
tradingRoutes.post('/quote', authMiddleware, tradingController.quote);
tradingRoutes.post('/advance-year', authMiddleware, tradingController.advanceYear);
tradingRoutes.get('/leaderboard', authMiddleware, tradingController.getLeaderboard);
