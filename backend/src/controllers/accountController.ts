import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { exportUserData, deleteAccount, AccountError } from '../services/accountService';
import { clearSessionCookies } from '../utils/session';
import { auditLog } from '../services/auditService';

const STATUS: Record<string, number> = { INVALID_INPUT: 400, BAD_CREDENTIALS: 401, TWO_FACTOR_REQUIRED: 401, SUBSCRIPTION_CANCEL_FAILED: 502, NOT_FOUND: 404 };

const fail = (res: Response, fallback: string, error: unknown) => {
  if (error instanceof AccountError) { res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code }); return; }
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
};

export const accountController = {
  exportData: async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
    try {
      const data = await exportUserData(req.user.userId);
      await auditLog({ userId: req.user.userId, action: 'data_export', entityType: 'user', entityId: req.user.userId, ip: req.ip });
      res.setHeader('Content-Disposition', 'attachment; filename="investkit-mes-donnees.json"');
      res.json(data);
    } catch (error) { fail(res, 'Erreur lors de l\'export', error); }
  },
  deleteAccount: async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
    try { const done = await deleteAccount(req.user.userId, req.body ?? {}, undefined, req.ip); clearSessionCookies(res); res.json({ success: true, ...done }); }
    catch (error) { fail(res, 'Erreur lors de la suppression', error); }
  },
};
