import { Router } from 'express';
import { tradingController } from '../controllers/tradingController';
import { authMiddleware } from '../middleware/auth';

export const tradingRoutes = Router();

tradingRoutes.get('/domains', authMiddleware, tradingController.getDomains);
tradingRoutes.get('/assets', authMiddleware, tradingController.getAssets);
tradingRoutes.get('/portfolio', authMiddleware, tradingController.getPortfolio);
tradingRoutes.post('/buy', authMiddleware, tradingController.buy);
tradingRoutes.post('/sell', authMiddleware, tradingController.sell);
tradingRoutes.post('/quote', authMiddleware, tradingController.quote);
tradingRoutes.post('/advance-year', authMiddleware, tradingController.advanceYear);
tradingRoutes.get('/leaderboard', authMiddleware, tradingController.getLeaderboard);
