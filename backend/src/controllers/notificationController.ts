import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { notificationService, NotificationError } from '../services/notificationService';

export const notificationController = {
  list: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await notificationService.list(req.user!.userId, req.query.limit, req.query.unread === 'true'));
    } catch (error) {
      console.error('Notifications error:', error);
      res.status(500).json({ error: 'Erreur lors de la lecture des notifications' });
    }
  },
  markRead: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await notificationService.markRead(req.user!.userId, req.body));
    } catch (error) {
      if (error instanceof NotificationError) { res.status(400).json({ error: error.message, code: error.code }); return; }
      console.error('Notifications read error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
    }
  },
};
