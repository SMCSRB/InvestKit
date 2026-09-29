import { Router } from 'express';
import { bankController as c } from '../controllers/bankController';
import { authMiddleware } from '../middleware/auth';

export const bankRoutes = Router();

bankRoutes.get('/overview', authMiddleware, c.overview);
bankRoutes.get('/events', authMiddleware, c.events);
bankRoutes.post('/personal/quote', authMiddleware, c.personalQuote);
bankRoutes.post('/personal/borrow', authMiddleware, c.personalBorrow);
bankRoutes.post('/portfolio/quote', authMiddleware, c.portfolioQuote);
bankRoutes.post('/portfolio/borrow', authMiddleware, c.portfolioBorrow);
bankRoutes.post('/portfolio/loans/:id/repay', authMiddleware, c.portfolioRepay);
bankRoutes.post('/recovery/preview', authMiddleware, c.recoveryPreview);
bankRoutes.post('/recovery/start', authMiddleware, c.recoveryStart);
bankRoutes.post('/loans/:id/repay', authMiddleware, c.earlyRepay);
bankRoutes.get('/admin/stats', authMiddleware, c.adminStats);
