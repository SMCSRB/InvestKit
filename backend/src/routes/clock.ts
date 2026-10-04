import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { walletEcho } from '../middleware/walletEcho';
import { clockController as c } from '../controllers/clockController';
import { profileWriteLimiter } from '../middleware/rateLimiter';

// Horloge de jeu unique. La date vient TOUJOURS du serveur ; le navigateur envoie seulement un pas (day, week, month, quarter, year, next_event).
export const clockRoutes = Router();
clockRoutes.use(walletEcho);
clockRoutes.get('/', authMiddleware, c.view);
clockRoutes.get('/modes', authMiddleware, c.modes);
clockRoutes.post('/start', authMiddleware, profileWriteLimiter, c.start);
clockRoutes.post('/advance', authMiddleware, c.advance);
