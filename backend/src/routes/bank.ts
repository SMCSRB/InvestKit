import { Router } from 'express';
import { bankController as c } from '../controllers/bankController';
import { authMiddleware } from '../middleware/auth';

export const bankRoutes = Router();

bankRoutes.get('/overview', authMiddleware, c.overview);
bankRoutes.get('/events', authMiddleware, c.events);
bankRoutes.post('/loans/:id/repay', authMiddleware, c.earlyRepay);
bankRoutes.get('/admin/stats', authMiddleware, c.adminStats);
