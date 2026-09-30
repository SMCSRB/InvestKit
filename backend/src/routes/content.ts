import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { contentController } from '../controllers/adminController';
import { feedbackLimiter } from '../middleware/rateLimiter';

export const contentRoutes = Router();
contentRoutes.post('/feedback', authMiddleware, feedbackLimiter, contentController.submitFeedback);
contentRoutes.get('/announcements', contentController.announcements);
