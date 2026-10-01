import { randomInt } from 'crypto';
import { getClient, query } from '../utils/db';
import { notify } from './notificationService';
import { auditLog } from './auditService';
import { SOCIAL, levelFromXp } from '../config/socialRules';

// Amis et guildes RÉELS. Un joueur n'expose à ses amis et à sa guilde que : nom de joueur, niveau, XP d'éducation (valeurs du serveur).
// Aucune recherche par nom : on ne trouve quelqu'un qu'avec son code ami exact (pas de liste de joueurs à parcourir ni de harcèlement par recherche).
export type SocialErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'LIMIT';
export class SocialError extends Error {
  constructor(public code: SocialErrorCode, message: string) { super(message); this.name = 'SocialError'; }
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I/L
const makeCode = (n = 8): string => Array.from({ length: n }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
const normCode = (raw: unknown): string => String(raw ?? '').replace(/^#/, '').trim().toUpperCase();
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

// Nom affichable : jamais d'e-mail ni de nom civil.
const nameOf = (row: { username: string | null; friend_code: string | null }): string => row.username || `Joueur ${row.friend_code ?? ''}`.trim();

const ensureFriendCode = async (userId: string): Promise<string> => {
  const cur = (await query('SELECT friend_code FROM users WHERE id = $1', [userId])).rows[0];
  if (!cur) throw new SocialError('NOT_FOUND', 'Compte introuvable');
  if (cur.friend_code) return cur.friend_code;
  for (let i = 0; i < 8; i++) {
    const code = makeCode();
    const r = await query('UPDATE users SET friend_code = $2 WHERE id = $1 AND friend_code IS NULL AND NOT EXISTS (SELECT 1 FROM users WHERE friend_code = $2) RETURNING friend_code', [userId, code]);
    if (r.rows[0]) return r.rows[0].friend_code;
    const again = (await query('SELECT friend_code FROM users WHERE id = $1', [userId])).rows[0];
    if (again?.friend_code) return again.friend_code;
  }
  throw new SocialError('CONFLICT', 'Impossible de créer ton code ami, réessaie');
};

// XP d'éducation (réel, côté serveur) pour une liste de joueurs.
const xpFor = async (ids: string[]): Promise<Map<string, number>> => {
  const m = new Map<string, number>();
  if (!ids.length) return m;
  const rows = (await query('SELECT user_id, COALESCE(SUM(xp_earned), 0)::int AS xp FROM education_progress WHERE user_id = ANY($1::uuid[]) GROUP BY user_id', [ids])).rows;
  for (const r of rows) m.set(r.user_id, Number(r.xp));
  return m;
};

const cardsFor = async (ids: string[]) => {
  if (!ids.length) return new Map<string, { userId: string; name: string; level: number; xp: number }>();
  const [users, xp] = [(await query('SELECT id, username, friend_code FROM users WHERE id = ANY($1::uuid[])', [ids])).rows, await xpFor(ids)];
  return new Map(users.map((u: any) => [u.id, { userId: u.id, name: nameOf(u), level: levelFromXp(xp.get(u.id) ?? 0), xp: xp.get(u.id) ?? 0 }]));
};

const isBlockedEitherWay = async (a: string, b: string): Promise<boolean> =>
  (await query('SELECT 1 FROM user_blocks WHERE (blocker = $1 AND blocked = $2) OR (blocker = $2 AND blocked = $1)', [a, b])).rowCount! > 0;

export const socialService = {
  async me(userId: string) {
    const friendCode = await ensureFriendCode(userId);
    const c = (await query(
      `SELECT COUNT(*) FILTER (WHERE status = 'accepted')::int AS friends,
              COUNT(*) FILTER (WHERE status = 'pending' AND requested_by <> $1)::int AS incoming
       FROM friendships WHERE user_low = $1 OR user_high = $1`, [userId])).rows[0];
    return { friendCode, friends: c.friends, incoming: c.incoming, limits: { maxFriends: SOCIAL.maxFriends, maxPendingOut: SOCIAL.maxPendingOut } };
  },

  async friends(userId: string) {
    const rows = (await query(
      `SELECT user_low, user_high, responded_at FROM friendships WHERE status = 'accepted' AND (user_low = $1 OR user_high = $1)`, [userId])).rows;
    const ids = rows.map((r: any) => (r.user_low === userId ? r.user_high : r.user_low));
    const cards = await cardsFor(ids);
    const friends = rows.map((r: any) => ({ ...cards.get(r.user_low === userId ? r.user_high : r.user_low)!, since: r.responded_at }))
      .filter((f: any) => f.userId).sort((a: any, b: any) => b.xp - a.xp || a.name.localeCompare(b.name));
    return { friends };
  },

  async requests(userId: string) {
    const rows = (await query(
      `SELECT id, user_low, user_high, requested_by, created_at FROM friendships WHERE status = 'pending' AND (user_low = $1 OR user_high = $1) ORDER BY id DESC`, [userId])).rows;
    const other = (r: any) => (r.user_low === userId ? r.user_high : r.user_low);
    const cards = await cardsFor(rows.map(other));
    const mk = (r: any) => ({ id: String(r.id), ...cards.get(other(r))!, createdAt: r.created_at });
    return { incoming: rows.filter((r: any) => r.requested_by !== userId).map(mk), outgoing: rows.filter((r: any) => r.requested_by === userId).map(mk) };
  },

  // Envoi d'une demande par code ami exact. Si l'autre joueur m'avait déjà écrit, la demande est acceptée (amitié réciproque).
  async sendRequest(userId: string, rawCode: unknown, ip?: string) {
    const code = normCode(rawCode);
    if (!/^[A-Z2-9]{6,10}$/.test(code)) throw new SocialError('INVALID_INPUT', 'Code ami invalide');
    const target = (await query('SELECT id, username, friend_code FROM users WHERE friend_code = $1', [code])).rows[0];
    // Même message si le code n'existe pas ou si l'autre joueur nous a bloqué : on ne révèle pas un blocage.
    if (!target || (await isBlockedEitherWay(userId, target.id))) throw new SocialError('NOT_FOUND', 'Aucun joueur avec ce code');
    if (target.id === userId) throw new SocialError('INVALID_INPUT', 'C\'est ton propre code ami');
    const [lo, hi] = pair(userId, target.id);
    const existing = (await query('SELECT id, status, requested_by FROM friendships WHERE user_low = $1 AND user_high = $2', [lo, hi])).rows[0];
    if (existing?.status === 'accepted') throw new SocialError('CONFLICT', 'Vous êtes déjà amis');
    if (existing && existing.requested_by === userId) throw new SocialError('CONFLICT', 'Demande déjà envoyée');
    if (existing) { await this.respond(userId, String(existing.id), 'accept'); return { status: 'accepted' as const, name: nameOf(target) }; }
    const me = (await query('SELECT COUNT(*) FILTER (WHERE status = \'accepted\')::int AS f, COUNT(*) FILTER (WHERE status = \'pending\' AND requested_by = $1)::int AS o FROM friendships WHERE user_low = $1 OR user_high = $1', [userId])).rows[0];
    if (me.f >= SOCIAL.maxFriends) throw new SocialError('LIMIT', `Maximum ${SOCIAL.maxFriends} amis`);
    if (me.o >= SOCIAL.maxPendingOut) throw new SocialError('LIMIT', `Maximum ${SOCIAL.maxPendingOut} demandes en attente : annule-en une d'abord`);
    const them = (await query('SELECT COUNT(*) FILTER (WHERE status = \'pending\' AND requested_by <> $1)::int AS i FROM friendships WHERE user_low = $1 OR user_high = $1', [target.id])).rows[0];
    if (them.i >= SOCIAL.maxPendingIn) throw new SocialError('LIMIT', 'Ce joueur a trop de demandes en attente pour le moment');
    await query('INSERT INTO friendships (user_low, user_high, requested_by) VALUES ($1,$2,$3)', [lo, hi, userId]);
    const mine = (await query('SELECT username, friend_code FROM users WHERE id = $1', [userId])).rows[0];
    await notify({ query }, target.id, { kind: 'friend_request', title: 'Nouvelle demande d\'ami', body: `${nameOf(mine)} voudrait devenir ton ami.`, link: '/friends?tab=requests' });
    await auditLog({ userId, action: 'social.friend_request', entityType: 'user', entityId: target.id, ip });
    return { status: 'pending' as const, name: nameOf(target) };
  },

  async respond(userId: string, rawId: string, action: 'accept' | 'decline' | 'cancel') {
    if (!/^\d{1,18}$/.test(String(rawId))) throw new SocialError('INVALID_INPUT', 'Demande invalide');
    const r = (await query('SELECT id, user_low, user_high, requested_by, status FROM friendships WHERE id = $1 AND (user_low = $2 OR user_high = $2)', [rawId, userId])).rows[0];
    if (!r || r.status !== 'pending') throw new SocialError('NOT_FOUND', 'Demande introuvable');
    const other = r.user_low === userId ? r.user_high : r.user_low;
    if (action === 'cancel') {
      if (r.requested_by !== userId) throw new SocialError('FORBIDDEN', 'Seul l\'auteur peut annuler');
      await query('DELETE FROM friendships WHERE id = $1', [r.id]);
      return { ok: true };
    }
    if (r.requested_by === userId) throw new SocialError('FORBIDDEN', 'Tu ne peux pas répondre à ta propre demande');
    if (action === 'decline') { await query('DELETE FROM friendships WHERE id = $1', [r.id]); return { ok: true }; }
    const f = (await query('SELECT COUNT(*)::int AS n FROM friendships WHERE status = \'accepted\' AND (user_low = $1 OR user_high = $1)', [userId])).rows[0].n;
    if (f >= SOCIAL.maxFriends) throw new SocialError('LIMIT', `Maximum ${SOCIAL.maxFriends} amis`);
    if (await isBlockedEitherWay(userId, other)) throw new SocialError('NOT_FOUND', 'Demande introuvable');
    await query('UPDATE friendships SET status = \'accepted\', responded_at = NOW() WHERE id = $1', [r.id]);
    const mine = (await query('SELECT username, friend_code FROM users WHERE id = $1', [userId])).rows[0];
    await notify({ query }, other, { kind: 'friend_accepted', title: 'Demande acceptée', body: `${nameOf(mine)} est maintenant ton ami.`, link: '/friends' });
    return { ok: true };
  },

  async removeFriend(userId: string, otherId: unknown) {
    if (!isUuid(otherId)) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const [lo, hi] = pair(userId, otherId);
    const r = await query('DELETE FROM friendships WHERE user_low = $1 AND user_high = $2 AND status = \'accepted\'', [lo, hi]);
    if (!r.rowCount) throw new SocialError('NOT_FOUND', 'Ami introuvable');
    return { ok: true };
  },

  async block(userId: string, otherId: unknown, ip?: string) {
    if (!isUuid(otherId) || otherId === userId) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    if (!(await query('SELECT 1 FROM users WHERE id = $1', [otherId])).rowCount) throw new SocialError('NOT_FOUND', 'Joueur introuvable');
    const [lo, hi] = pair(userId, otherId);
    await query('DELETE FROM friendships WHERE user_low = $1 AND user_high = $2', [lo, hi]);
    await query('INSERT INTO user_blocks (blocker, blocked) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, otherId]);
    await auditLog({ userId, action: 'social.block', entityType: 'user', entityId: otherId, ip });
    return { ok: true };
  },
  async unblock(userId: string, otherId: unknown) {
    if (!isUuid(otherId)) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    await query('DELETE FROM user_blocks WHERE blocker = $1 AND blocked = $2', [userId, otherId]);
    return { ok: true };
  },
  async blocks(userId: string) {
    const ids = (await query('SELECT blocked FROM user_blocks WHERE blocker = $1 ORDER BY created_at DESC', [userId])).rows.map((r: any) => r.blocked);
    const cards = await cardsFor(ids);
    return { blocks: ids.map((id: string) => cards.get(id)).filter(Boolean).map((c: any) => ({ userId: c.userId, name: c.name })) };
  },

  // ───────────── Guildes ─────────────
  // Une guilde sans propriétaire (compte supprimé) passe au membre le plus ancien ; sans membre, elle est supprimée.
  async healGuild(guildId: string) {
    const owners = (await query('SELECT 1 FROM guild_members WHERE guild_id = $1 AND role = \'owner\'', [guildId])).rowCount;
    if (owners) return;
    const next = (await query('SELECT user_id FROM guild_members WHERE guild_id = $1 ORDER BY joined_at, user_id LIMIT 1', [guildId])).rows[0];
    if (next) await query('UPDATE guild_members SET role = \'owner\' WHERE guild_id = $1 AND user_id = $2', [guildId, next.user_id]);
    else await query('DELETE FROM guilds WHERE id = $1', [guildId]);
  },

  async myGuild(userId: string) {
    const m = (await query('SELECT guild_id FROM guild_members WHERE user_id = $1', [userId])).rows[0];
    if (!m) return { guild: null };
    await this.healGuild(m.guild_id);
    const g = (await query('SELECT id, name, description, invite_code, created_at FROM guilds WHERE id = $1', [m.guild_id])).rows[0];
    const members = (await query('SELECT user_id, role, joined_at FROM guild_members WHERE guild_id = $1', [m.guild_id])).rows;
    const cards = await cardsFor(members.map((x: any) => x.user_id));
    const list = members.map((x: any) => ({ ...cards.get(x.user_id)!, role: x.role as 'owner' | 'member', joinedAt: x.joined_at, isMe: x.user_id === userId }))
      .sort((a: any, b: any) => b.xp - a.xp || a.name.localeCompare(b.name)).map((x: any, i: number) => ({ ...x, rank: i + 1 }));
    const me = list.find((x: any) => x.isMe);
    return { guild: { id: g.id, name: g.name, description: g.description, createdAt: g.created_at, role: me?.role ?? 'member', inviteCode: me?.role === 'owner' ? g.invite_code : null,
      memberCap: SOCIAL.guildMembersMax, totalXp: list.reduce((s: number, x: any) => s + x.xp, 0), members: list } };
  },

  async createGuild(userId: string, rawName: unknown, rawDesc: unknown, ip?: string) {
    const name = String(rawName ?? '').replace(/\s+/g, ' ').trim();
    const description = String(rawDesc ?? '').replace(/\s+/g, ' ').trim();
    if (name.length < SOCIAL.guildNameMin || name.length > SOCIAL.guildNameMax || !/^[\p{L}\p{N}][\p{L}\p{N} '_-]*$/u.test(name)) {
      throw new SocialError('INVALID_INPUT', `Nom de guilde : ${SOCIAL.guildNameMin} à ${SOCIAL.guildNameMax} caractères (lettres, chiffres, espace, ' _ -)`);
    }
    if (description.length > SOCIAL.guildDescMax) throw new SocialError('INVALID_INPUT', `Description : ${SOCIAL.guildDescMax} caractères au maximum`);
    const key = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
    if (key.length < 3) throw new SocialError('INVALID_INPUT', 'Nom de guilde trop court');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      if ((await client.query('SELECT 1 FROM guild_members WHERE user_id = $1', [userId])).rowCount) throw new SocialError('CONFLICT', 'Tu fais déjà partie d\'une guilde : quitte-la d\'abord');
      let created: any = null;
      for (let i = 0; i < 6 && !created; i++) {
        try {
          created = (await client.query('INSERT INTO guilds (name, name_key, description, invite_code) VALUES ($1,$2,$3,$4) RETURNING id', [name, key, description, makeCode()])).rows[0];
        } catch (e: any) {
          if (e.code === '23505' && String(e.constraint).includes('name_key')) throw new SocialError('CONFLICT', 'Ce nom de guilde est déjà pris');
          if (e.code !== '23505') throw e;
          await client.query('ROLLBACK'); await client.query('BEGIN'); // collision de code d'invitation : on retente
          if ((await client.query('SELECT 1 FROM guild_members WHERE user_id = $1', [userId])).rowCount) throw new SocialError('CONFLICT', 'Tu fais déjà partie d\'une guilde');
        }
      }
      if (!created) throw new SocialError('CONFLICT', 'Création impossible, réessaie');
      await client.query('INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1,$2,\'owner\')', [created.id, userId]);
      await client.query('COMMIT');
      await auditLog({ userId, action: 'social.guild_create', entityType: 'guild', entityId: created.id, ip });
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    return this.myGuild(userId);
  },

  async joinGuild(userId: string, rawCode: unknown) {
    const code = normCode(rawCode);
    if (!/^[A-Z2-9]{6,10}$/.test(code)) throw new SocialError('INVALID_INPUT', 'Code d\'invitation invalide');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const g = (await client.query('SELECT id FROM guilds WHERE invite_code = $1 FOR UPDATE', [code])).rows[0];
      if (!g) throw new SocialError('NOT_FOUND', 'Code d\'invitation inconnu');
      if ((await client.query('SELECT 1 FROM guild_members WHERE user_id = $1', [userId])).rowCount) throw new SocialError('CONFLICT', 'Tu fais déjà partie d\'une guilde');
      const n = (await client.query('SELECT COUNT(*)::int AS n FROM guild_members WHERE guild_id = $1', [g.id])).rows[0].n;
      if (n >= SOCIAL.guildMembersMax) throw new SocialError('LIMIT', 'Cette guilde est complète');
      await client.query('INSERT INTO guild_members (guild_id, user_id) VALUES ($1,$2)', [g.id, userId]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    return this.myGuild(userId);
  },

  async leaveGuild(userId: string) {
    const m = (await query('SELECT guild_id, role FROM guild_members WHERE user_id = $1', [userId])).rows[0];
    if (!m) throw new SocialError('NOT_FOUND', 'Tu n\'as pas de guilde');
    await query('DELETE FROM guild_members WHERE user_id = $1', [userId]);
    await this.healGuild(m.guild_id); // le propriétaire parti : le membre le plus ancien reprend ; guilde vide : supprimée
    return { ok: true };
  },

  async ownerOf(userId: string): Promise<string> {
    const m = (await query('SELECT guild_id FROM guild_members WHERE user_id = $1 AND role = \'owner\'', [userId])).rows[0];
    if (!m) throw new SocialError('FORBIDDEN', 'Réservé au propriétaire de la guilde');
    return m.guild_id;
  },
  async kick(userId: string, targetId: unknown, ip?: string) {
    if (!isUuid(targetId) || targetId === userId) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const gid = await this.ownerOf(userId);
    const r = await query('DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2', [gid, targetId]);
    if (!r.rowCount) throw new SocialError('NOT_FOUND', 'Ce joueur n\'est pas dans ta guilde');
    await notify({ query }, targetId, { kind: 'guild_kick', title: 'Retiré d\'une guilde', body: 'Le propriétaire t\'a retiré de sa guilde.', link: '/friends?tab=guild' });
    await auditLog({ userId, action: 'social.guild_kick', entityType: 'guild', entityId: gid, metadata: { target: targetId }, ip });
    return { ok: true };
  },
  async transfer(userId: string, targetId: unknown) {
    if (!isUuid(targetId) || targetId === userId) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const gid = await this.ownerOf(userId);
    if (!(await query('SELECT 1 FROM guild_members WHERE guild_id = $1 AND user_id = $2', [gid, targetId])).rowCount) throw new SocialError('NOT_FOUND', 'Ce joueur n\'est pas dans ta guilde');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE guild_members SET role = \'member\' WHERE guild_id = $1 AND user_id = $2', [gid, userId]);
      await client.query('UPDATE guild_members SET role = \'owner\' WHERE guild_id = $1 AND user_id = $2', [gid, targetId]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    return { ok: true };
  },
  async regenerateInvite(userId: string) {
    const gid = await this.ownerOf(userId);
    for (let i = 0; i < 6; i++) {
      try { const r = await query('UPDATE guilds SET invite_code = $2 WHERE id = $1 RETURNING invite_code', [gid, makeCode()]); return { inviteCode: r.rows[0].invite_code }; }
      catch (e: any) { if (e.code !== '23505') throw e; }
    }
    throw new SocialError('CONFLICT', 'Réessaie');
  },
  async disband(userId: string, ip?: string) {
    const gid = await this.ownerOf(userId);
    await query('DELETE FROM guilds WHERE id = $1', [gid]);
    await auditLog({ userId, action: 'social.guild_disband', entityType: 'guild', entityId: gid, ip });
    return { ok: true };
  },
};
