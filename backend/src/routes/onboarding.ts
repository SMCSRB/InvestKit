import { Router } from 'express';
import { walletEcho } from '../middleware/walletEcho';
import { authMiddleware } from '../middleware/auth';
import { onboardingController } from '../controllers/onboardingController';

export const onboardingRoutes = Router();
onboardingRoutes.use(walletEcho);   // chaque action qui réussit renvoie le portefeuille à jour (`wallet`)
onboardingRoutes.get('/', authMiddleware, onboardingController.get);
onboardingRoutes.post('/claim', authMiddleware, onboardingController.claim);
onboardingRoutes.post('/profile', authMiddleware, onboardingController.profile);

import { overviewController } from '../controllers/overviewController';
export const overviewRoutes = Router();
overviewRoutes.get('/', authMiddleware, overviewController.get);
