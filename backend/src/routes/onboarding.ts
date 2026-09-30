import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { onboardingController } from '../controllers/onboardingController';

export const onboardingRoutes = Router();
onboardingRoutes.get('/', authMiddleware, onboardingController.get);
onboardingRoutes.post('/claim', authMiddleware, onboardingController.claim);
onboardingRoutes.post('/profile', authMiddleware, onboardingController.profile);

import { overviewController } from '../controllers/overviewController';
export const overviewRoutes = Router();
overviewRoutes.get('/', authMiddleware, overviewController.get);
