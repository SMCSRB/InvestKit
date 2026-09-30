import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { adminService, AdminError } from '../services/adminService';
import { featureFlagService, FlagError } from '../services/featureFlagService';
import { auditLog } from '../services/auditService';

const STATUS: Record<string, number> = { INVALID_INPUT: 400, NOT_FOUND: 404, FORBIDDEN: 403 };

// Toutes les routes d'administration exigent : un jeton valide, le rôle admin lu EN BASE et la 2FA activée (voir middleware/admin.ts).
const admin = (fallback: string, fn: (req: AuthRequest, adminId: string) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!(await requireAdmin(req, res))) return;
      res.json(await fn(req, req.user!.userId));
    } catch (error) {
      if (error instanceof AdminError || error instanceof FlagError) {
        res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code });
        return;
      }
      console.error(fallback, error);
      res.status(500).json({ error: fallback });
    }
  };

export const adminController = {
  users: admin('Erreur lors de la liste des utilisateurs', (r) => adminService.listUsers(r.query)),
  user: admin('Erreur lors de la lecture de l\'utilisateur', async (r, adminId) => {
    const data = await adminService.getUser(r.params.id);
    await auditLog({ userId: adminId, action: 'admin_view_user', entityType: 'user', entityId: r.params.id, ip: r.ip }); // toute consultation de fiche est tracée
    return data;
  }),
  setPro: admin('Erreur lors du changement de statut Pro', (r, a) => adminService.setProOverride(a, r.params.id, r.body?.proOverride, r.ip)),
  disable: admin('Erreur lors de la suspension', (r, a) => adminService.setDisabled(a, r.params.id, true, r.body?.reason, r.ip)),
  enable: admin('Erreur lors de la réactivation', (r, a) => adminService.setDisabled(a, r.params.id, false, null, r.ip)),
  coins: admin('Erreur lors de l\'ajustement de pièces', (r, a) => adminService.adjustCoins(a, r.params.id, r.body?.amount, r.body?.reason, r.ip)),
  audit: admin('Erreur lors de la lecture du journal', (r) => adminService.listAudit(r.query)),
  stats: admin('Erreur lors du calcul des statistiques', () => adminService.stats()),
  billing: admin('Erreur lors de la lecture de la facturation', () => adminService.billing()),
  alerts: admin('Erreur lors du calcul des alertes', () => adminService.alerts()),
  system: admin('Erreur lors de la lecture de l\'état du serveur', () => adminService.system()),

  flags: admin('Erreur lors de la lecture des drapeaux', async () => ({ flags: await featureFlagService.list() })),
  setFlag: admin('Erreur lors de l\'enregistrement du drapeau', async (r, a) => {
    const flag = await featureFlagService.upsert({ key: r.params.key, enabled: r.body?.enabled, rolloutPercentage: r.body?.rolloutPercentage, description: r.body?.description });
    await auditLog({ userId: a, action: 'admin_set_flag', entityType: 'feature_flag', entityId: null, metadata: { key: flag.key, enabled: flag.enabled, rollout: flag.rollout_percentage }, ip: r.ip });
    return { flag };
  }),
  deleteFlag: admin('Erreur lors de la suppression du drapeau', async (r, a) => {
    await featureFlagService.remove(r.params.key);
    await auditLog({ userId: a, action: 'admin_delete_flag', entityType: 'feature_flag', metadata: { key: r.params.key }, ip: r.ip });
    return { success: true };
  }),
};

// Drapeaux évalués pour l'utilisateur connecté (aucun rôle requis).
export const flagsController = {
  mine: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json({ flags: await featureFlagService.forUser(req.user!.userId) });
    } catch (error) {
      console.error('Flags error:', error);
      res.status(500).json({ error: 'Erreur lors de la lecture des drapeaux' });
    }
  },
};
