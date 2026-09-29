import { Router } from 'express';
import { realEstateController as c } from '../controllers/realEstateController';
import { authMiddleware } from '../middleware/auth';

export const realEstateRoutes = Router();

realEstateRoutes.get('/state', authMiddleware, c.getState);
realEstateRoutes.post('/start', authMiddleware, c.start);
realEstateRoutes.get('/listings', authMiddleware, c.listings);
realEstateRoutes.get('/listings/:id', authMiddleware, c.listing);
realEstateRoutes.post('/listings/:id/expertise', authMiddleware, c.expertise);
realEstateRoutes.post('/purchase/preview', authMiddleware, c.preview);
realEstateRoutes.post('/purchase', authMiddleware, c.purchase);
realEstateRoutes.get('/properties', authMiddleware, c.properties);
realEstateRoutes.post('/properties/:id/pay-works', authMiddleware, c.payWorks);
realEstateRoutes.post('/properties/:id/list', authMiddleware, c.listForRent);
realEstateRoutes.post('/properties/:id/reprice', authMiddleware, c.reprice);
realEstateRoutes.get('/properties/:id/statements', authMiddleware, c.statements);
realEstateRoutes.post('/time/advance', authMiddleware, c.advance);
realEstateRoutes.get('/summary', authMiddleware, c.summary);
realEstateRoutes.post('/properties/:id/landlord-notice', authMiddleware, c.landlordNotice);
realEstateRoutes.get('/events', authMiddleware, c.events);
