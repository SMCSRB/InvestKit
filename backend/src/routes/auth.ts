import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { authLimiter, accountLimiter, checkEmailLimiter } from '../middleware/rateLimiter';
import { accountController } from '../controllers/accountController';

export const authRoutes = Router();

// Public routes (les routes sensibles au brute-force sont limitées à 5 tentatives/15min)
authRoutes.get('/signup-config', authController.getSignupConfig);
authRoutes.post('/register', authLimiter, authController.register);
authRoutes.post('/login', authLimiter, authController.login);
authRoutes.post('/verify-email', authLimiter, authController.verifyEmail);
authRoutes.post('/resend-code', authLimiter, authController.resendCode);
authRoutes.post('/save-preferences', authController.savePreferences);
authRoutes.post('/forgot-password', authLimiter, authController.forgotPassword);
authRoutes.post('/reset-password', authLimiter, authController.resetPassword);
authRoutes.get('/check-email/:email', checkEmailLimiter, authController.checkEmail);
authRoutes.post('/2fa/login-verify', authLimiter, authController.verifyLoginTwoFactor);
authRoutes.post('/logout', authController.logout);

// Protected routes
authRoutes.get('/me', authMiddleware, authController.getCurrentUser);
authRoutes.post('/session/upgrade', authMiddleware, authController.upgradeSession);
authRoutes.post('/set-free-domain', authMiddleware, authController.setFreeDomain);
authRoutes.post('/2fa/setup', authMiddleware, authController.setupTwoFactor);
authRoutes.post('/2fa/verify-setup', authMiddleware, authController.verifyTwoFactorSetup);
authRoutes.post('/2fa/disable', authMiddleware, authController.disableTwoFactor);

// Droits RGPD : export de ses données, suppression du compte
authRoutes.get('/me/export', authMiddleware, accountLimiter, accountController.exportData);
authRoutes.post('/me/delete', authMiddleware, accountLimiter, accountController.deleteAccount);
