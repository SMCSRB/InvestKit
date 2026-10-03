import { Router } from 'express';
import { walletEcho } from '../middleware/walletEcho';
import { economyController } from '../controllers/economyController';
import { authMiddleware } from '../middleware/auth';

export const economyRoutes = Router();
economyRoutes.use(walletEcho);   // chaque action qui réussit renvoie le portefeuille à jour (`wallet`)

economyRoutes.get('/balance', authMiddleware, economyController.getBalance);
economyRoutes.get('/history', authMiddleware, economyController.getHistory);
economyRoutes.post('/daily-reward', authMiddleware, economyController.claimDailyReward);
economyRoutes.get('/admin/coins-by-domain', authMiddleware, economyController.getCoinsByDomain);
