import { Router } from 'express';
import { economyController } from '../controllers/economyController';
import { authMiddleware } from '../middleware/auth';

export const economyRoutes = Router();

economyRoutes.get('/balance', authMiddleware, economyController.getBalance);
economyRoutes.get('/history', authMiddleware, economyController.getHistory);
economyRoutes.post('/daily-reward', authMiddleware, economyController.claimDailyReward);
economyRoutes.get('/admin/coins-by-domain', authMiddleware, economyController.getCoinsByDomain);
