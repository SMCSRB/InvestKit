import { Router } from 'express';
import { educationController } from '../controllers/educationController';
import { authMiddleware } from '../middleware/auth';

export const educationRoutes = Router();

educationRoutes.post('/complete-chapter', authMiddleware, educationController.completeChapter);
educationRoutes.post('/complete-domain', authMiddleware, educationController.completeDomain);
