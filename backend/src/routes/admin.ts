import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminController } from '../controllers/adminController';

// Tableau de bord administrateur (feuille de route 3G). Chaque route impose le rôle admin (lu en base) et la 2FA.
export const adminRoutes = Router();

adminRoutes.get('/users', authMiddleware, adminController.users);
adminRoutes.get('/users/:id', authMiddleware, adminController.user);
adminRoutes.post('/users/:id/pro', authMiddleware, adminController.setPro);
adminRoutes.post('/users/:id/disable', authMiddleware, adminController.disable);
adminRoutes.post('/users/:id/enable', authMiddleware, adminController.enable);
adminRoutes.post('/users/:id/coins', authMiddleware, adminController.coins);
adminRoutes.post('/users/:id/impersonate', authMiddleware, adminController.impersonate);
adminRoutes.get('/audit', authMiddleware, adminController.audit);
adminRoutes.get('/stats', authMiddleware, adminController.stats);
adminRoutes.get('/billing', authMiddleware, adminController.billing);
adminRoutes.get('/alerts', authMiddleware, adminController.alerts);
adminRoutes.get('/system', authMiddleware, adminController.system);
adminRoutes.get('/feedback', authMiddleware, adminController.feedback);
adminRoutes.post('/feedback/:id', authMiddleware, adminController.updateFeedback);
adminRoutes.get('/announcements', authMiddleware, adminController.announcements);
adminRoutes.post('/announcements', authMiddleware, adminController.createAnnouncement);
adminRoutes.put('/announcements/:id', authMiddleware, adminController.updateAnnouncement);
adminRoutes.delete('/announcements/:id', authMiddleware, adminController.deleteAnnouncement);
adminRoutes.get('/flags', authMiddleware, adminController.flags);
adminRoutes.put('/flags/:key', authMiddleware, adminController.setFlag);
adminRoutes.delete('/flags/:key', authMiddleware, adminController.deleteFlag);
