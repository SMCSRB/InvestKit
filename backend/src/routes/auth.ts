import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

export const authRoutes = Router();

// Public routes
authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);
authRoutes.post('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-code', authController.resendCode);
authRoutes.post('/save-preferences', authController.savePreferences);
authRoutes.post('/forgot-password', authController.forgotPassword);
authRoutes.post('/reset-password', authController.resetPassword);
authRoutes.get('/check-email/:email', authController.checkEmail);

// Protected routes
authRoutes.get('/me', authMiddleware, authController.getCurrentUser);
