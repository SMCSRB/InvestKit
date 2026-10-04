import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { xpController } from '../controllers/xpController';

export const xpRoutes = Router();
xpRoutes.get('/', authMiddleware, xpController.me);
