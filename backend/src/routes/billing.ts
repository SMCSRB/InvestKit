import { Router } from 'express';
import { billingController } from '../controllers/billingController';
import { authMiddleware } from '../middleware/auth';

export const billingRoutes = Router();

// Protégées : nécessitent d'être connecté
billingRoutes.post('/create-checkout-session', authMiddleware, billingController.createCheckoutSession);
billingRoutes.post('/create-portal-session', authMiddleware, billingController.createPortalSession);

// Le webhook n'est PAS protégé par authMiddleware (Stripe l'appelle
// directement) : la sécurité vient de la vérification de signature dans
// le controller, pas d'un JWT.
billingRoutes.post('/webhook', billingController.webhook);
