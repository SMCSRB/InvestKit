import { Router } from 'express';
import { walletEcho } from '../middleware/walletEcho';
import { realEstateController as c } from '../controllers/realEstateController';
import { watchLimiter } from '../middleware/rateLimiter';
import { authMiddleware } from '../middleware/auth';
import { clockController, clockGate } from '../controllers/clockController';

export const realEstateRoutes = Router();
realEstateRoutes.use(walletEcho);   // chaque action qui réussit renvoie le portefeuille à jour (`wallet`)
realEstateRoutes.use(authMiddleware, clockGate);   // horloge de jeu unique

realEstateRoutes.get('/state', authMiddleware, c.getState);
realEstateRoutes.post('/start', authMiddleware, c.start);
realEstateRoutes.get('/listings', authMiddleware, c.listings);
realEstateRoutes.get('/favorites', authMiddleware, c.favorites);
realEstateRoutes.put('/favorites/:id', authMiddleware, watchLimiter, c.addFavorite);
realEstateRoutes.delete('/favorites/:id', authMiddleware, watchLimiter, c.removeFavorite);
realEstateRoutes.get('/saved-searches', authMiddleware, c.savedSearches);
realEstateRoutes.post('/saved-searches', authMiddleware, watchLimiter, c.saveSearch);
realEstateRoutes.post('/saved-searches/:id/seen', authMiddleware, c.searchSeen);
realEstateRoutes.delete('/saved-searches/:id', authMiddleware, watchLimiter, c.deleteSearch);
realEstateRoutes.get('/listings/:id', authMiddleware, c.listing);
realEstateRoutes.post('/listings/:id/expertise', authMiddleware, c.expertise);
realEstateRoutes.post('/purchase/preview', authMiddleware, c.preview);
realEstateRoutes.post('/purchase', authMiddleware, c.purchase);
realEstateRoutes.get('/properties', authMiddleware, c.properties);
realEstateRoutes.post('/properties/:id/pay-works', authMiddleware, c.payWorks);
realEstateRoutes.post('/properties/:id/list', authMiddleware, c.listForRent);
realEstateRoutes.post('/properties/:id/reprice', authMiddleware, c.reprice);
realEstateRoutes.get('/properties/:id/statements', authMiddleware, c.statements);
realEstateRoutes.post('/time/advance', authMiddleware, clockController.legacyImmo);   // ancien bouton : avance l'horloge unique
realEstateRoutes.get('/summary', authMiddleware, c.summary);
realEstateRoutes.post('/properties/:id/gli', authMiddleware, c.setGli);
realEstateRoutes.post('/properties/:id/landlord-notice', authMiddleware, c.landlordNotice);
realEstateRoutes.get('/events', authMiddleware, c.events);
realEstateRoutes.post('/properties/:id/sell', authMiddleware, c.sell);
realEstateRoutes.get('/properties/:id/sell/options', authMiddleware, c.saleOptions);
realEstateRoutes.post('/properties/:id/sell/reprice', authMiddleware, c.repriceSale);
realEstateRoutes.get('/properties/:id/renovate/preview', authMiddleware, c.renovationPreview);
realEstateRoutes.post('/properties/:id/renovate', authMiddleware, c.renovate);
realEstateRoutes.post('/distress/sell', authMiddleware, c.distressSell);
realEstateRoutes.get('/sales', authMiddleware, c.listSales);
realEstateRoutes.get('/leaderboard', authMiddleware, c.leaderboard);
