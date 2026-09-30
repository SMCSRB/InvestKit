import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { notificationController } from '../controllers/notificationController';

export const notificationRoutes = Router();
notificationRoutes.get('/', authMiddleware, notificationController.list);
notificationRoutes.post('/read', authMiddleware, notificationController.markRead);
