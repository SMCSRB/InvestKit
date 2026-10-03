import { getClient, query } from '../utils/db';
import { auditLog } from './auditService';
import { SocialError } from './socialError';
import { TAG } from '../config/tagRules';
import { autoTagFor, checkTagFormat, customTagVisible, fold, identityOf } from '../engine/playerTag';
import { hasProAccess } from '../utils/entitlements';

// Identifiant « Pseudo#tag » : # automatique pour tous, # choisi pour les Pro. Le serveur décide de tout (règles : config/tagRules.ts).
// Les amitiés et les guildes pointent sur l'IDENTIFIANT DU JOUEUR (uuid), jamais sur le #, donc changer de # ne casse jamais un lien.
const DAY = 24 * 3600 * 1000;
const PRO_SQL = `(subscription_tier = 'pro' OR pro_override = TRUE)`;
type Db = { query: (sql: string, params?: unknown[]) => Promise<any> };

export interface TagCard { userId: string; username: string | null; tag: string | null; identity: string | null; pro: boolean }

// ─── Mise à jour des # après la fin (ou le retour) du Pro ───
// Règle (voir docs/pro-badge-tag.md) : le # choisi est gardé 30 jours après la fin du Pro (carte refusée, oubli : on ne casse rien tout de suite),
// puis le joueur revient à un # automatique ; son # choisi est mis de côté 90 jours et lui est rendu s'il se réabonne (et s'il est encore libre).
const autoFree = async (db: Db, userId: string, username: string): Promise<string> => {
  for (let salt = 0; salt < 60; salt += 1) {
    const cand = salt < 30 ? autoTagFor(userId, salt) : String(Math.floor(Math.random() * 10 ** TAG.autoDigits)).padStart(TAG.autoDigits, '0');
    const taken = await db.query('SELECT 1 FROM users WHERE id <> $1 AND ik_fold(username) = ik_fold($2) AND ik_fold(player_tag) = ik_fold($3)', [userId, username, cand]);
    if (!taken.rowCount) return cand;
  }
  throw new SocialError('CONFLICT', 'Impossible de créer ton #, réessaie');
};

const reconcileRow = async (db: Db, u: any, now: Date): Promise<void> => {
  const pro = hasProAccess(u);
  if (pro) {
    if (u.tag_grace_until) await db.query('UPDATE users SET tag_grace_until = NULL WHERE id = $1', [u.id]);
    if (!u.tag_custom && u.tag_restore && u.tag_restore_until && now < new Date(u.tag_restore_until) && u.username) {
      const taken = await db.query('SELECT 1 FROM users WHERE id <> $1 AND ik_fold(username) = ik_fold($2) AND ik_fold(player_tag) = ik_fold($3)', [u.id, u.username, u.tag_restore]);
      if (!taken.rowCount) {
        await db.query(`UPDATE users SET player_tag = $2, tag_custom = TRUE, tag_restore = NULL, tag_restore_until = NULL WHERE id = $1`, [u.id, u.tag_restore]);
        await db.query(`INSERT INTO player_tag_history (user_id, old_tag, new_tag, reason, username_key, old_tag_key) VALUES ($1,$2::text,$3,'restored',ik_fold($4::text),ik_fold($2::text))`, [u.id, u.player_tag, u.tag_restore, u.username]);
      }
    }
    return;
  }
  if (!u.tag_custom) return;
  if (!u.tag_grace_until) { await db.query('UPDATE users SET tag_grace_until = $2 WHERE id = $1 AND tag_grace_until IS NULL', [u.id, new Date(now.getTime() + TAG.graceDays * DAY)]); return; }
  if (now < new Date(u.tag_grace_until)) return;
  const auto = await autoFree(db, u.id, u.username);
  await db.query(`UPDATE users SET player_tag = $2, tag_custom = FALSE, tag_grace_until = NULL, tag_restore = $3, tag_restore_until = $4 WHERE id = $1`,
    [u.id, auto, u.player_tag, new Date(now.getTime() + TAG.restoreDays * DAY)]);
  await db.query(`INSERT INTO player_tag_history (user_id, old_tag, new_tag, reason, username_key, old_tag_key) VALUES ($1,$2::text,$3,'expired',ik_fold($4::text),ik_fold($2::text))`, [u.id, u.player_tag, auto, u.username]);
};

const COLS = 'id, username, player_tag, tag_custom, tag_grace_until, tag_restore, tag_restore_until, subscription_tier, pro_override';
let lastSweep = 0;

export const playerTagService = {
  // Balayage global (au plus toutes les 5 minutes par processus ; `force` pour les tests) : fin de Pro constatée, retours à l'automatique, re-abonnements.
  async sweep(force = false, now = new Date()): Promise<void> {
    if (!force && Date.now() - lastSweep < 5 * 60 * 1000) return;
    lastSweep = Date.now();
    const rows = (await query(
      `SELECT ${COLS} FROM users
       WHERE (tag_custom AND NOT ${PRO_SQL} AND (tag_grace_until IS NULL OR tag_grace_until <= $1))
          OR (${PRO_SQL} AND (tag_grace_until IS NOT NULL OR (NOT tag_custom AND tag_restore IS NOT NULL AND tag_restore_until > $1)))
       LIMIT 500`, [now])).rows;
    for (const u of rows) { try { await reconcileRow({ query }, u, now); } catch (e) { console.error('Tag reconcile error:', (e as Error).message); } }
  },

  async reconcile(userId: string, now = new Date()): Promise<void> {
    const u = (await query(`SELECT ${COLS} FROM users WHERE id = $1`, [userId])).rows[0];
    if (u) await reconcileRow({ query }, u, now);
  },

  // Assigne le # automatique la première fois qu'il est nécessaire (après le choix du pseudo). Renvoie le # courant, ou null sans pseudo.
  async ensureTag(userId: string): Promise<string | null> {
    const u = (await query('SELECT username, player_tag FROM users WHERE id = $1', [userId])).rows[0];
    if (!u?.username) return null;
    if (u.player_tag) return u.player_tag;
    for (let salt = 0; salt < 60; salt += 1) {
      const cand = salt < 30 ? autoTagFor(userId, salt) : String(Math.floor(Math.random() * 10 ** TAG.autoDigits)).padStart(TAG.autoDigits, '0');
      try {
        const r = await query('UPDATE users SET player_tag = $2 WHERE id = $1 AND player_tag IS NULL RETURNING player_tag', [userId, cand]);
        if (r.rows[0]) return r.rows[0].player_tag;
        return (await query('SELECT player_tag FROM users WHERE id = $1', [userId])).rows[0]?.player_tag ?? null;
      } catch (e: any) { if (e.code !== '23505') throw e; }
    }
    throw new SocialError('CONFLICT', 'Impossible de créer ton #, réessaie');
  },

  // Fiches publiques (pseudo, #, indicateur Pro) pour une liste de joueurs. L'indicateur est un simple booléen : jamais de détail d'abonnement.
  // `viewerId` : le joueur lui-même voit toujours son propre badge, même s'il l'a masqué aux autres.
  async cards(ids: string[], viewerId?: string): Promise<Map<string, TagCard>> {
    const out = new Map<string, TagCard>();
    if (!ids.length) return out;
    await this.sweep();
    const rows = (await query(`SELECT ${COLS}, show_pro_badge FROM users WHERE id = ANY($1::uuid[])`, [ids])).rows;
    const now = new Date();
    for (const u of rows) {
      const pro = hasProAccess(u);
      const customShown = !u.tag_custom || customTagVisible({ isPro: pro, graceUntil: u.tag_grace_until ? new Date(u.tag_grace_until) : null }, now);
      const tag = u.username ? (u.player_tag && customShown ? u.player_tag : autoTagFor(u.id)) : null;
      out.set(u.id, { userId: u.id, username: u.username, tag, identity: identityOf(u.username, tag), pro: pro && (u.show_pro_badge !== false || u.id === viewerId) });
    }
    return out;
  },

  async mine(userId: string) {
    await this.sweep();
    await this.reconcile(userId);
    const tag = await this.ensureTag(userId);
    const u = (await query(`SELECT ${COLS}, tag_changed_at, show_pro_badge FROM users WHERE id = $1`, [userId])).rows[0];
    if (!u) throw new SocialError('NOT_FOUND', 'Compte introuvable');
    const pro = hasProAccess(u);
    const next = u.tag_changed_at ? new Date(new Date(u.tag_changed_at).getTime() + TAG.changeIntervalDays * DAY) : null;
    const canChangeNow = pro && (!next || next <= new Date());
    return {
      username: u.username, tag, identity: identityOf(u.username, tag), isCustom: !!u.tag_custom, canCustomize: pro,
      canChangeNow, nextChangeAt: next && next > new Date() ? next.toISOString() : null,
      graceUntil: !pro && u.tag_custom && u.tag_grace_until ? new Date(u.tag_grace_until).toISOString() : null,
      restorable: !pro && !u.tag_custom && u.tag_restore && u.tag_restore_until && new Date(u.tag_restore_until) > new Date() ? u.tag_restore : null,
      showProBadge: u.show_pro_badge !== false, isPro: pro,
      rules: { min: TAG.min, max: TAG.max, changeIntervalDays: TAG.changeIntervalDays },
    };
  },

  async history(userId: string) {
    const rows = (await query('SELECT old_tag, new_tag, reason, changed_at, held_until FROM player_tag_history WHERE user_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 50', [userId])).rows;
    return { history: rows.map((r: any) => ({ oldTag: r.old_tag, newTag: r.new_tag, reason: r.reason, changedAt: r.changed_at })) };
  },

  async setProBadgeVisible(userId: string, visible: unknown) {
    if (typeof visible !== 'boolean') throw new SocialError('INVALID_INPUT', 'Valeur invalide');
    await query('UPDATE users SET show_pro_badge = $2 WHERE id = $1', [userId, visible]);
    return { showProBadge: visible };
  },

  // Changement du # (Pro seulement). Toutes les règles sont vérifiées ICI, côté serveur ; l'unicité l'est en plus par l'index unique de la base.
  async changeTag(userId: string, raw: unknown, ip?: string) {
    const check = checkTagFormat(raw);
    if (!check.ok) throw new SocialError('INVALID_INPUT', check.message, { reason: check.code });
    const wanted = check.tag;
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`tag:${userId}`]);   // deux demandes du même joueur : l'une après l'autre
      const u = (await client.query(`SELECT ${COLS}, tag_changed_at FROM users WHERE id = $1 FOR UPDATE`, [userId])).rows[0];
      if (!u) throw new SocialError('NOT_FOUND', 'Compte introuvable');
      if (!hasProAccess(u)) throw new SocialError('FORBIDDEN', 'Choisir son # est réservé aux membres Pro.', { reason: 'PRO_REQUIRED' });
      if (!u.username) throw new SocialError('INVALID_INPUT', 'Choisis d\'abord ton pseudo.', { reason: 'NO_USERNAME' });
      if (u.player_tag === wanted) throw new SocialError('CONFLICT', 'C\'est déjà ton #.', { reason: 'SAME' });
      if (u.tag_changed_at) {
        const next = new Date(new Date(u.tag_changed_at).getTime() + TAG.changeIntervalDays * DAY);
        if (next > new Date()) throw new SocialError('LIMIT', `Tu peux changer ton # une fois par mois : prochain changement possible le ${next.toLocaleDateString('fr-FR')}.`, { reason: 'RATE', nextChangeAt: next.toISOString() });
      }
      const f = fold(wanted);
      // Ressemblance trompeuse : le # ne doit pas se lire comme le pseudo d'un AUTRE joueur ni comme celui d'un administrateur.
      const lookalike = await client.query(`SELECT 1 FROM users WHERE id <> $1 AND username IS NOT NULL AND (ik_fold(username) = $2::text OR (role = 'admin' AND length(username) >= 3 AND position(ik_fold(username) in $2::text) > 0)) LIMIT 1`, [userId, f]);
      if (lookalike.rowCount) throw new SocialError('INVALID_INPUT', 'Ce # ressemble trop au pseudo d\'un autre joueur : choisis-en un autre.', { reason: 'LOOKALIKE' });
      // Ancien # d'un autre joueur encore réservé (délai de libération).
      const held = await client.query(`SELECT 1 FROM player_tag_history WHERE user_id <> $1 AND username_key = ik_fold($2) AND old_tag_key = $3 AND held_until > NOW() LIMIT 1`, [userId, u.username, f]);
      if (held.rowCount) throw new SocialError('CONFLICT', 'Ce # vient d\'être libéré et reste réservé quelque temps : choisis-en un autre.', { reason: 'HELD' });
      try {
        await client.query(`UPDATE users SET player_tag = $2, tag_custom = TRUE, tag_changed_at = NOW(), tag_grace_until = NULL, tag_restore = NULL, tag_restore_until = NULL WHERE id = $1`, [userId, wanted]);
      } catch (e: any) {
        if (e.code === '23505') throw new SocialError('CONFLICT', 'Ce # est déjà pris avec ton pseudo : choisis-en un autre.', { reason: 'TAKEN' });
        throw e;
      }
      await client.query(
        `INSERT INTO player_tag_history (user_id, old_tag, new_tag, reason, username_key, old_tag_key, held_until) VALUES ($1,$2::text,$3,'custom',ik_fold($4::text),ik_fold($2::text), NOW() + make_interval(days => $5::int))`,
        [userId, u.player_tag, wanted, u.username, TAG.holdDays]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    await auditLog({ userId, action: 'social.tag_change', entityType: 'user', entityId: userId, ip });
    return this.mine(userId);
  },
};
