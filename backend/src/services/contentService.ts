import { query } from '../utils/db';
import { auditLog } from './auditService';

// Retours utilisateurs et annonces (mini-CMS). Tout le texte est stocké brut et affiché comme du TEXTE par le site (jamais du HTML).
export type ContentErrorCode = 'INVALID_INPUT' | 'NOT_FOUND';
export class ContentError extends Error { constructor(public code: ContentErrorCode, message: string) { super(message); this.name = 'ContentError'; } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: unknown): string => { if (typeof v !== 'string' || !UUID_RE.test(v)) throw new ContentError('INVALID_INPUT', 'Identifiant invalide'); return v; };
const text = (v: unknown, min: number, max: number, label: string): string => {
  if (typeof v !== 'string') throw new ContentError('INVALID_INPUT', `${label} invalide`);
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (t.length < min) throw new ContentError('INVALID_INPUT', `${label} : ${min} caractère(s) minimum`);
  if (t.length > max) throw new ContentError('INVALID_INPUT', `${label} : ${max} caractères maximum`);
  return t;
};
const clampInt = (v: unknown, def: number, min: number, max: number): number => {
  const n = typeof v === 'string' && v !== '' ? Number(v) : typeof v === 'number' ? v : def;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : def;
};

export const FEEDBACK_STATUSES = ['new', 'seen', 'done', 'wontfix'] as const;
export const ANNOUNCEMENT_KINDS = ['info', 'new', 'maintenance'] as const;

export const contentService = {
  // ── Retours ───────────────────────────────────────────────────────────
  async submitFeedback(userId: string, body: any) {
    const kind = body?.kind;
    if (kind !== 'bug' && kind !== 'idea' && kind !== 'thumb') throw new ContentError('INVALID_INPUT', 'Type de retour invalide (bug, idea ou thumb)');
    let page: string | null = null;
    if (body?.page !== undefined && body.page !== null && body.page !== '') {
      page = text(body.page, 1, 200, 'Page');
      if (!page.startsWith('/')) throw new ContentError('INVALID_INPUT', 'Page invalide');
    }
    let rating: number | null = null, message: string | null = null;
    if (kind === 'thumb') {
      if (body?.rating !== 1 && body?.rating !== -1) throw new ContentError('INVALID_INPUT', 'Note invalide (1 ou -1)');
      rating = body.rating;
      if (body.message !== undefined && body.message !== null && body.message !== '') message = text(body.message, 1, 500, 'Message');
    } else {
      message = text(body?.message, 5, 2000, 'Message');
    }
    const r = await query(`INSERT INTO feedback (user_id, kind, rating, message, page) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [userId, kind, rating, message, page]);
    return { success: true, id: r.rows[0].id };
  },

  async listFeedback(params: { status?: unknown; kind?: unknown; page?: unknown; pageSize?: unknown }) {
    const page = clampInt(params.page, 1, 1, 100000), pageSize = clampInt(params.pageSize, 25, 1, 100);
    const where: string[] = []; const args: any[] = [];
    if (typeof params.status === 'string' && (FEEDBACK_STATUSES as readonly string[]).includes(params.status)) { args.push(params.status); where.push(`f.status = $${args.length}`); }
    if (params.kind === 'bug' || params.kind === 'idea' || params.kind === 'thumb') { args.push(params.kind); where.push(`f.kind = $${args.length}`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number((await query(`SELECT COUNT(*)::int AS n FROM feedback f ${w}`, args)).rows[0].n);
    const rows = (await query(
      `SELECT f.id, f.kind, f.rating, f.message, f.page, f.status, f.admin_note, f.created_at, u.email AS user_email
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id ${w} ORDER BY f.created_at DESC, f.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, args)).rows;
    const summary = (await query(`SELECT kind, status, COUNT(*)::int AS n FROM feedback GROUP BY 1, 2 ORDER BY 1, 2`)).rows;
    const thumbs = (await query(`SELECT COUNT(*) FILTER (WHERE rating = 1)::int AS up, COUNT(*) FILTER (WHERE rating = -1)::int AS down FROM feedback WHERE kind = 'thumb'`)).rows[0];
    return { feedback: rows, total, page, pageSize, summary, thumbs };
  },

  async updateFeedback(adminId: string, idRaw: unknown, body: any, ip?: string | null) {
    const id = uuid(idRaw);
    if (!(FEEDBACK_STATUSES as readonly string[]).includes(body?.status)) throw new ContentError('INVALID_INPUT', 'Statut invalide');
    const note = body?.note === undefined || body.note === null || body.note === '' ? null : text(body.note, 1, 1000, 'Note');
    const r = await query(`UPDATE feedback SET status = $2, admin_note = COALESCE($3, admin_note), updated_at = NOW() WHERE id = $1 RETURNING id`, [id, body.status, note]);
    if (!r.rowCount) throw new ContentError('NOT_FOUND', 'Retour introuvable');
    await auditLog({ userId: adminId, action: 'admin_update_feedback', entityType: 'feedback', entityId: id, metadata: { status: body.status }, ip });
    return { success: true };
  },

  // ── Annonces ──────────────────────────────────────────────────────────
  async publicAnnouncements() {
    const rows = (await query(`SELECT id, kind, title, body, published_at FROM announcements WHERE published = TRUE ORDER BY published_at DESC, id LIMIT 30`)).rows;
    return { announcements: rows };
  },

  async listAnnouncements() {
    return { announcements: (await query(`SELECT id, kind, title, body, published, published_at, created_at, updated_at FROM announcements ORDER BY created_at DESC LIMIT 100`)).rows };
  },

  async saveAnnouncement(adminId: string, idRaw: unknown | undefined, body: any, ip?: string | null) {
    const kind = body?.kind ?? 'info';
    if (!(ANNOUNCEMENT_KINDS as readonly string[]).includes(kind)) throw new ContentError('INVALID_INPUT', 'Type invalide (info, new ou maintenance)');
    const title = text(body?.title, 3, 120, 'Titre');
    const content = body?.body === undefined || body.body === '' ? '' : text(body.body, 0, 2000, 'Texte');
    if (typeof body?.published !== 'boolean') throw new ContentError('INVALID_INPUT', '« published » doit être vrai ou faux');
    let row;
    if (idRaw === undefined) {
      row = (await query(`INSERT INTO announcements (kind, title, body, published, published_at, created_by) VALUES ($1,$2,$3,$4, CASE WHEN $4 THEN NOW() END, $5) RETURNING id, published`,
        [kind, title, content, body.published, adminId])).rows[0];
    } else {
      const id = uuid(idRaw);
      row = (await query(`UPDATE announcements SET kind = $2, title = $3, body = $4, published = $5,
          published_at = CASE WHEN $5 AND published_at IS NULL THEN NOW() WHEN NOT $5 THEN NULL ELSE published_at END, updated_at = NOW()
          WHERE id = $1 RETURNING id, published`, [id, kind, title, content, body.published])).rows[0];
      if (!row) throw new ContentError('NOT_FOUND', 'Annonce introuvable');
    }
    await auditLog({ userId: adminId, action: idRaw === undefined ? 'admin_create_announcement' : 'admin_update_announcement', entityType: 'announcement', entityId: row.id, metadata: { kind, title, published: body.published }, ip });
    return { success: true, id: row.id };
  },

  async deleteAnnouncement(adminId: string, idRaw: unknown, ip?: string | null) {
    const id = uuid(idRaw);
    const r = await query('DELETE FROM announcements WHERE id = $1', [id]);
    if (!r.rowCount) throw new ContentError('NOT_FOUND', 'Annonce introuvable');
    await auditLog({ userId: adminId, action: 'admin_delete_announcement', entityType: 'announcement', entityId: id, ip });
    return { success: true };
  },
};
