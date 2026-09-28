import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

export const authRoutes = Router();

// Public routes (les routes sensibles au brute-force sont limitées à 5 tentatives/15min)
authRoutes.post('/register', authLimiter, authController.register);
authRoutes.post('/login', authLimiter, authController.login);
authRoutes.post('/verify-email', authLimiter, authController.verifyEmail);
authRoutes.post('/resend-code', authLimiter, authController.resendCode);
authRoutes.post('/save-preferences', authController.savePreferences);
authRoutes.post('/forgot-password', authLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', authLimiter, authController.resetPassword);
authRoutes.get('/check-email/:email', authController.checkEmail);

// Protected routes
authRoutes.get('/me', authMiddleware, authController.getCurrentUser);
authRoutes.post('/set-free-domain', authMiddleware, authController.setFreeDomain);
