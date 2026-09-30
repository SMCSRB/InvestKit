import type { Queryable } from '../repositories/investcoinsRepository';
import { query } from '../utils/db';

// Notifications réelles : créées par le serveur quand quelque chose d'important se produit (appel de marge, prêt en défaut, locataire qui part,
// vente forcée, changement de sécurité du compte…). Chaque utilisateur ne voit que les siennes. Les 200 dernières sont conservées.
export interface Notification { id: string; kind: string; title: string; body: string; link: string | null; createdAt: Date; read: boolean }
const KEEP = 200;

export const notify = async (db: Queryable, userId: string, n: { kind: string; title: string; body?: string; link?: string }): Promise<void> => {
  await db.query(
    'INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5)',
    [userId, n.kind.slice(0, 40), n.title.slice(0, 140), (n.body ?? '').slice(0, 2000), n.link ? n.link.slice(0, 200) : null]
  );
  await db.query(
    'DELETE FROM notifications WHERE user_id = $1 AND id <= (SELECT id FROM notifications WHERE user_id = $1 ORDER BY id DESC OFFSET $2 LIMIT 1)',
    [userId, KEEP]
  );
};

// Événements Immobilier qui méritent une notification (les autres sont dans le journal du bien, pour ne pas inonder le joueur quand il avance de plusieurs mois).
const RE_NOTIFY: Record<string, string> = {
  default_started: 'Loyers impayés', tenant_left: 'Un locataire est parti', tenant_notice: 'Un locataire a donné son préavis', unexpected_works: 'Travaux imprévus',
  distress_warning: 'Alerte de ta banque', forced_sale: 'Vente forcée d\'un bien', property_sold: 'Bien vendu', dpe_ban: 'Location interdite (DPE)', gli_reimbursed: 'Assurance loyers impayés : remboursement',
};
export const notifyRealEstateEvent = async (db: Queryable, userId: string, kind: string, message: string): Promise<void> => {
  if (RE_NOTIFY[kind]) await notify(db, userId, { kind: `re_${kind}`, title: RE_NOTIFY[kind], body: message, link: '/immobilier' });
};

export class NotificationError extends Error { constructor(public code: 'INVALID_INPUT', message: string) { super(message); this.name = 'NotificationError'; } }

export const notificationService = {
  async list(userId: string, limitRaw?: unknown, unreadOnly = false): Promise<{ notifications: Notification[]; unread: number }> {
    const n = typeof limitRaw === 'string' && limitRaw !== '' ? Number(limitRaw) : typeof limitRaw === 'number' ? limitRaw : 50;
    const limit = Number.isFinite(n) ? Math.min(100, Math.max(1, Math.trunc(n))) : 50;
    const rows = (await query(
      `SELECT id, kind, title, body, link, created_at, read_at FROM notifications WHERE user_id = $1 ${unreadOnly ? 'AND read_at IS NULL' : ''} ORDER BY id DESC LIMIT ${limit}`, [userId])).rows;
    const unread = Number((await query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId])).rows[0].n);
    return { notifications: rows.map((r: any) => ({ id: String(r.id), kind: r.kind, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, read: !!r.read_at })), unread };
  },

  // Marque comme lues : une liste d'identifiants, ou tout (all: true). Uniquement celles de l'utilisateur.
  async markRead(userId: string, body: any): Promise<{ success: true; updated: number }> {
    if (body?.all === true) {
      const r = await query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [userId]);
      return { success: true, updated: r.rowCount ?? 0 };
    }
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((x: unknown) => typeof x === 'string' && /^\d{1,18}$/.test(x))) {
      throw new NotificationError('INVALID_INPUT', 'Indique « all: true » ou une liste « ids » (identifiants de notifications)');
    }
    const r = await query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL AND id = ANY($2::bigint[])', [userId, ids]);
    return { success: true, updated: r.rowCount ?? 0 };
  },
};
