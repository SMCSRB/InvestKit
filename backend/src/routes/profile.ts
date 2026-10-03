import express, { Router } from 'express';
import { profileController as c } from '../controllers/profileController';
import { authMiddleware } from '../middleware/auth';
import { profileWriteLimiter, avatarLimiter, emailChangeLimiter } from '../middleware/rateLimiter';
import { AVATAR_MAX_BYTES } from '../utils/avatarImage';

export const profileRoutes = Router();

// Lecture publique d'une photo par identifiant secret (voir profileController.image).
profileRoutes.get('/avatar/:avatarId', c.image);

profileRoutes.get('/', authMiddleware, c.get);
profileRoutes.patch('/', authMiddleware, profileWriteLimiter, c.update);
// Corps brut (octets de l'image), 3 Mo au plus : le type annoncé par le navigateur n'est jamais cru, le contenu est relu et ré-encodé côté serveur.
profileRoutes.post('/avatar', authMiddleware, avatarLimiter, express.raw({ type: () => true, limit: AVATAR_MAX_BYTES }), c.setAvatar);
profileRoutes.delete('/avatar', authMiddleware, avatarLimiter, c.removeAvatar);
profileRoutes.post('/email/request', authMiddleware, emailChangeLimiter, c.requestEmail);
profileRoutes.post('/email/confirm', authMiddleware, emailChangeLimiter, c.confirmEmail);
