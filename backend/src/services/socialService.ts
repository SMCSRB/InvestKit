import { randomInt } from 'crypto';
import { getClient, query } from '../utils/db';
import { notify } from './notificationService';
import { auditLog } from './auditService';
import { SOCIAL, levelFromXp } from '../config/socialRules';
import { SocialError } from './socialError';
import { playerTagService } from './playerTagService';
import { parseIdentity } from '../engine/playerTag';

// Amis et guildes RÉELS. Un joueur n'expose à ses amis et à sa guilde que : nom de joueur, niveau, XP d'éducation (valeurs du serveur).
// Aucune recherche par nom : on ne trouve quelqu'un qu'avec son code ami exact (pas de liste de joueurs à parcourir ni de harcèlement par recherche).
export { SocialError } from './socialError';
export type { SocialErrorCode } from './socialError';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I/L
const makeCode = (n = 8): string => Array.from({ length: n }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
const normCode = (raw: unknown): string => String(raw ?? '').replace(/^#/, '').trim().toUpperCase();
const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const lowerId = (v: string): string => v.toLowerCase(); // l'ordre des paires (comparaison de texte) doit suivre celui de la base : toujours en minuscules
const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

// Nom affichable : jamais d'e-mail ni de nom civil.
// Nom de repli : jamais le code ami (c'est le seul secret de découverte), mais un repère court tiré de l'identifiant.
const nameOf = (row: { id?: string; username: string | null }): string => row.username || `Joueur ${String(row.id ?? '').replace(/-/g, '').slice(0, 4).toUpperCase()}`.trim();

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
  const rows = (await query('SELECT user_id, COALESCE(SUM(LEAST(GREATEST(xp_earned, 0), $2)), 0)::bigint AS xp FROM education_progress WHERE user_id = ANY($1::uuid[]) GROUP BY user_id', [ids, SOCIAL.xpPerRowMax])).rows;
  for (const r of rows) m.set(r.user_id, Number(r.xp));
  return m;
};

type Card = { userId: string; name: string; tag: string | null; identity: string | null; pro: boolean; level: number; xp: number };
// Fiche publique : nom de joueur, # (Pseudo#tag), indicateur « Pro » (simple booléen, jamais de détail d'abonnement), niveau, XP.
const cardsFor = async (ids: string[], viewerId?: string) => {
  if (!ids.length) return new Map<string, Card>();
  const [users, xp, tags] = [(await query('SELECT id, username FROM users WHERE id = ANY($1::uuid[])', [ids])).rows, await xpFor(ids), await playerTagService.cards(ids, viewerId)];
  return new Map<string, Card>(users.map((u: any) => {
    const t = tags.get(u.id);
    return [u.id, { userId: u.id, name: nameOf(u), tag: t?.tag ?? null, identity: t?.identity ?? null, pro: t?.pro ?? false, level: levelFromXp(xp.get(u.id) ?? 0), xp: xp.get(u.id) ?? 0 }];
  }));
};

// Transaction avec verrous consultatifs sur les joueurs concernés (toujours dans le même ordre : pas d'interblocage).
// Sérialise les demandes croisées, les doubles clics et les plafonds (amis, demandes en attente).
type Db = { query: (sql: string, params?: unknown[]) => Promise<any> };
const withPlayers = async <T>(ids: string[], fn: (db: Db) => Promise<T>): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const id of [...new Set(ids)].sort()) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`social:${id}`]);
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
};

const isBlockedEitherWay = async (a: string, b: string): Promise<boolean> =>
  (await query('SELECT 1 FROM user_blocks WHERE (blocker = $1 AND blocked = $2) OR (blocker = $2 AND blocked = $1)', [a, b])).rowCount! > 0;

// Acceptation (dans une transaction déjà verrouillée) : le plafond d'amis vaut pour LES DEUX joueurs.
const acceptIn = async (db: Db, userId: string, r: { id: string | number; user_low: string; user_high: string }) => {
  const other = r.user_low === userId ? r.user_high : r.user_low;
  const count = async (id: string) => (await db.query('SELECT COUNT(*)::int AS n FROM friendships WHERE status = \'accepted\' AND (user_low = $1 OR user_high = $1)', [id])).rows[0].n;
  if ((await count(userId)) >= SOCIAL.maxFriends) throw new SocialError('LIMIT', `Maximum ${SOCIAL.maxFriends} amis`);
  if ((await count(other)) >= SOCIAL.maxFriends) throw new SocialError('LIMIT', 'Ce joueur a atteint son maximum d\'amis');
  if (await isBlockedEitherWay(userId, other)) throw new SocialError('NOT_FOUND', 'Demande introuvable');
  const u = await db.query('UPDATE friendships SET status = \'accepted\', responded_at = NOW() WHERE id = $1 AND status = \'pending\' RETURNING id', [r.id]);
  if (!u.rowCount) throw new SocialError('NOT_FOUND', 'Demande introuvable');   // refusée ou annulée entre-temps
  const mine = (await db.query('SELECT id, username FROM users WHERE id = $1', [userId])).rows[0];
  await notify({ query: (sql: string, p?: unknown[]) => db.query(sql, p) } as any, other, { kind: 'friend_accepted', title: 'Demande acceptée', body: `${nameOf(mine)} est maintenant ton ami.`, link: '/friends' });
};

export const socialService = {
  async me(userId: string) {
    const friendCode = await ensureFriendCode(userId);
    const c = (await query(
      `SELECT COUNT(*) FILTER (WHERE status = 'accepted')::int AS friends,
              COUNT(*) FILTER (WHERE status = 'pending' AND requested_by <> $1)::int AS incoming
       FROM friendships WHERE user_low = $1 OR user_high = $1`, [userId])).rows[0];
    const identity = await playerTagService.mine(userId);
    return { friendCode, identity, friends: c.friends, incoming: c.incoming, limits: { maxFriends: SOCIAL.maxFriends, maxPendingOut: SOCIAL.maxPendingOut } };
  },

  async friends(userId: string) {
    const rows = (await query(
      `SELECT user_low, user_high, responded_at FROM friendships WHERE status = 'accepted' AND (user_low = $1 OR user_high = $1)`, [userId])).rows;
    const ids = rows.map((r: any) => (r.user_low === userId ? r.user_high : r.user_low));
    const cards = await cardsFor(ids, userId);
    const friends = rows.map((r: any) => ({ ...cards.get(r.user_low === userId ? r.user_high : r.user_low)!, since: r.responded_at }))
      .filter((f: any) => f.userId).sort((a: any, b: any) => b.xp - a.xp || a.name.localeCompare(b.name));
    return { friends };
  },

  // Classement entre amis : moi + mes amis acceptés, par XP d'éducation (les mêmes valeurs serveur que la liste d'amis : nom, niveau, XP).
  // Les ex æquo partagent le même rang. Rien d'autre n'est exposé.
  async friendsRanking(userId: string) {
    const rows = (await query(
      `SELECT user_low, user_high FROM friendships WHERE status = 'accepted' AND (user_low = $1 OR user_high = $1)`, [userId])).rows;
    const ids = [userId, ...rows.map((r: any) => (r.user_low === userId ? r.user_high : r.user_low))];
    const cards = await cardsFor(ids, userId);
    const list = ids.map((id) => cards.get(id)).filter((c): c is Card => !!c)
      .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    let rank = 0;
    const entries = list.map((c, i) => {
      if (i === 0 || c.xp !== list[i - 1].xp) rank = i + 1;
      return { rank, userId: c.userId, name: c.name, tag: c.tag, identity: c.identity, pro: c.pro, level: c.level, xp: c.xp, isMe: c.userId === userId };
    });
    return { entries, total: entries.length, friendsCount: Math.max(0, entries.length - 1) };
  },

  async requests(userId: string) {
    const rows = (await query(
      `SELECT id, user_low, user_high, requested_by, created_at FROM friendships WHERE status = 'pending' AND (user_low = $1 OR user_high = $1) ORDER BY id DESC`, [userId])).rows;
    const other = (r: any) => (r.user_low === userId ? r.user_high : r.user_low);
    const cards = await cardsFor(rows.map(other), userId);
    const mk = (r: any) => ({ id: String(r.id), ...cards.get(other(r))!, createdAt: r.created_at });
    return { incoming: rows.filter((r: any) => r.requested_by !== userId).map(mk), outgoing: rows.filter((r: any) => r.requested_by === userId).map(mk) };
  },

  // Envoi d'une demande par code ami exact. Si l'autre joueur m'avait déjà écrit, la demande est acceptée (amitié réciproque).
  async sendRequest(userId: string, rawCode: unknown, ip?: string) {
    // Deux façons exactes de trouver quelqu'un : « Pseudo#tag » ou son code ami. Aucune recherche partielle (pas de liste de joueurs à parcourir).
    const ident = parseIdentity(rawCode);
    let target: { id: string; username: string | null } | undefined;
    if (ident) {
      await playerTagService.sweep();
      const cand = (await query('SELECT id, username FROM users WHERE lower(username) = lower($1)', [ident.name])).rows;
      const tags = await playerTagService.cards(cand.map((c: any) => c.id));
      target = cand.find((c: any) => (tags.get(c.id)?.tag ?? '').toLowerCase() === ident.tag.toLowerCase());
    } else {
      const code = normCode(rawCode);
      if (!/^[A-Z2-9]{6,10}$/.test(code)) throw new SocialError('INVALID_INPUT', 'Entre un Pseudo#1234 ou un code ami valide');
      target = (await query('SELECT id, username FROM users WHERE friend_code = $1', [code])).rows[0];
    }
    // Même message si le code n'existe pas ou si l'autre joueur nous a bloqué : on ne révèle pas un blocage.
    if (!target || (await isBlockedEitherWay(userId, target.id))) throw new SocialError('NOT_FOUND', 'Aucun joueur avec cet identifiant');
    const t = target;
    if (t.id === userId) throw new SocialError('INVALID_INPUT', 'C\'est ton propre code ami');
    const [lo, hi] = pair(userId, t.id);
    const outcome = await withPlayers([userId, t.id], async (db) => {
      const existing = (await db.query('SELECT id, status, requested_by FROM friendships WHERE user_low = $1 AND user_high = $2', [lo, hi])).rows[0];
      if (existing?.status === 'accepted') throw new SocialError('CONFLICT', 'Vous êtes déjà amis');
      if (existing && existing.requested_by === userId) throw new SocialError('CONFLICT', 'Demande déjà envoyée');
      if (existing) { await acceptIn(db, userId, { id: existing.id, user_low: lo, user_high: hi }); return 'accepted' as const; }   // demandes croisées : amitié immédiate
      const me = (await db.query('SELECT COUNT(*) FILTER (WHERE status = \'accepted\')::int AS f, COUNT(*) FILTER (WHERE status = \'pending\' AND requested_by = $1)::int AS o FROM friendships WHERE user_low = $1 OR user_high = $1', [userId])).rows[0];
      if (me.f >= SOCIAL.maxFriends) throw new SocialError('LIMIT', `Maximum ${SOCIAL.maxFriends} amis`);
      if (me.o >= SOCIAL.maxPendingOut) throw new SocialError('LIMIT', `Maximum ${SOCIAL.maxPendingOut} demandes en attente : annule-en une d'abord`);
      const them = (await db.query('SELECT COUNT(*) FILTER (WHERE status = \'pending\' AND requested_by <> $1)::int AS i FROM friendships WHERE user_low = $1 OR user_high = $1', [t.id])).rows[0];
      if (them.i >= SOCIAL.maxPendingIn) throw new SocialError('LIMIT', 'Ce joueur a trop de demandes en attente pour le moment');
      await db.query('INSERT INTO friendships (user_low, user_high, requested_by) VALUES ($1,$2,$3)', [lo, hi, userId]);
      return 'pending' as const;
    });
    if (outcome === 'pending') {
      const mine = (await query('SELECT id, username FROM users WHERE id = $1', [userId])).rows[0];
      const body = `${nameOf(mine)} voudrait devenir ton ami.`;
      // Pas de notification en double : une demande refusée puis renvoyée ne doit pas noyer les alertes importantes.
      const dup = (await query('SELECT 1 FROM notifications WHERE user_id = $1 AND kind = \'friend_request\' AND body = $2 AND created_at > NOW() - INTERVAL \'1 day\'', [t.id, body])).rowCount;
      if (!dup) await notify({ query }, t.id, { kind: 'friend_request', title: 'Nouvelle demande d\'ami', body, link: '/friends?tab=requests' });
      await auditLog({ userId, action: 'social.friend_request', entityType: 'user', entityId: t.id, ip });
    }
    return { status: outcome, name: nameOf(t) };
  },

  async respond(userId: string, rawId: string, action: 'accept' | 'decline' | 'cancel') {
    if (!/^\d{1,18}$/.test(String(rawId))) throw new SocialError('INVALID_INPUT', 'Demande invalide');
    const row = (await query('SELECT user_low, user_high FROM friendships WHERE id = $1 AND (user_low = $2 OR user_high = $2)', [rawId, userId])).rows[0];
    if (!row) throw new SocialError('NOT_FOUND', 'Demande introuvable');
    return withPlayers([row.user_low, row.user_high], async (db) => {
      const r = (await db.query('SELECT id, user_low, user_high, requested_by, status FROM friendships WHERE id = $1 FOR UPDATE', [rawId])).rows[0];
      if (!r || r.status !== 'pending') throw new SocialError('NOT_FOUND', 'Demande introuvable');
      if (action === 'cancel') {
        if (r.requested_by !== userId) throw new SocialError('FORBIDDEN', 'Seul l\'auteur peut annuler');
        await db.query('DELETE FROM friendships WHERE id = $1', [r.id]);
        return { ok: true };
      }
      if (r.requested_by === userId) throw new SocialError('FORBIDDEN', 'Tu ne peux pas répondre à ta propre demande');
      if (action === 'decline') { await db.query('DELETE FROM friendships WHERE id = $1', [r.id]); return { ok: true }; }
      await acceptIn(db, userId, r);
      return { ok: true };
    });
  },

  async removeFriend(userId: string, otherId: unknown) {
    if (!isUuid(otherId)) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const [lo, hi] = pair(userId, lowerId(otherId));
    const r = await query('DELETE FROM friendships WHERE user_low = $1 AND user_high = $2 AND status = \'accepted\'', [lo, hi]);
    if (!r.rowCount) throw new SocialError('NOT_FOUND', 'Ami introuvable');
    return { ok: true };
  },

  async block(userId: string, otherId: unknown, ip?: string) {
    if (!isUuid(otherId) || lowerId(otherId) === userId) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const other = lowerId(otherId);
    if (!(await query('SELECT 1 FROM users WHERE id = $1', [other])).rowCount) throw new SocialError('NOT_FOUND', 'Joueur introuvable');
    const [lo, hi] = pair(userId, other);
    await query('DELETE FROM friendships WHERE user_low = $1 AND user_high = $2', [lo, hi]);
    await query('INSERT INTO user_blocks (blocker, blocked) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, other]);
    await auditLog({ userId, action: 'social.block', entityType: 'user', entityId: other, ip });
    return { ok: true };
  },
  async unblock(userId: string, otherId: unknown) {
    if (!isUuid(otherId)) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    await query('DELETE FROM user_blocks WHERE blocker = $1 AND blocked = $2', [userId, lowerId(otherId)]);
    return { ok: true };
  },
  async blocks(userId: string) {
    const ids = (await query('SELECT blocked FROM user_blocks WHERE blocker = $1 ORDER BY created_at DESC', [userId])).rows.map((r: any) => r.blocked);
    const cards = await cardsFor(ids, userId);
    return { blocks: ids.map((id: string) => cards.get(id)).filter(Boolean).map((c: any) => ({ userId: c.userId, name: c.name })) };
  },

  // ───────────── Guildes ─────────────
  // Une guilde sans propriétaire (compte supprimé) passe au membre le plus ancien ; sans membre, elle est supprimée.
  // Verrou sur la guilde : une arrivée simultanée n'est jamais supprimée par erreur.
  async healGuild(guildId: string) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      if (!(await client.query('SELECT 1 FROM guilds WHERE id = $1 FOR UPDATE', [guildId])).rowCount) { await client.query('COMMIT'); return; }
      if (!(await client.query('SELECT 1 FROM guild_members WHERE guild_id = $1 AND role = \'owner\'', [guildId])).rowCount) {
        const next = (await client.query('SELECT user_id FROM guild_members WHERE guild_id = $1 ORDER BY joined_at, user_id LIMIT 1', [guildId])).rows[0];
        if (next) await client.query('UPDATE guild_members SET role = \'owner\' WHERE guild_id = $1 AND user_id = $2', [guildId, next.user_id]);
        else await client.query('DELETE FROM guilds WHERE id = $1', [guildId]);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  },

  async myGuild(userId: string) {
    const m = (await query('SELECT guild_id FROM guild_members WHERE user_id = $1', [userId])).rows[0];
    if (!m) return { guild: null };
    await this.healGuild(m.guild_id);
    const g = (await query('SELECT id, name, description, invite_code, created_at FROM guilds WHERE id = $1', [m.guild_id])).rows[0];
    if (!g) return { guild: null };
    const members = (await query('SELECT user_id, role, joined_at FROM guild_members WHERE guild_id = $1', [m.guild_id])).rows;
    const ids = members.map((x: any) => x.user_id);
    const cards = await cardsFor(ids, userId);
    // Un joueur lié à moi par un blocage (dans un sens ou l'autre) reste dans le classement mais devient anonyme : ni nom, ni niveau, ni XP.
    const blocked = new Set((await query('SELECT blocker, blocked FROM user_blocks WHERE (blocker = $1 AND blocked = ANY($2::uuid[])) OR (blocked = $1 AND blocker = ANY($2::uuid[]))', [userId, ids])).rows
      .map((r: any) => (r.blocker === userId ? r.blocked : r.blocker)));
    const list = members.map((x: any) => {
      const c = cards.get(x.user_id)!;
      const hidden = blocked.has(x.user_id);
      return { userId: x.user_id, name: hidden ? 'Joueur masqué' : c.name, tag: hidden ? null : c.tag, identity: hidden ? null : c.identity, pro: hidden ? false : c.pro, level: hidden ? undefined : c.level, xp: hidden ? undefined : c.xp, hidden, sortXp: c.xp,
        role: x.role as 'owner' | 'member', joinedAt: x.joined_at, isMe: x.user_id === userId };
    }).sort((a: any, b: any) => b.sortXp - a.sortXp || a.userId.localeCompare(b.userId)).map(({ sortXp, ...rest }: any, i: number) => ({ ...rest, rank: i + 1 }));
    const me = list.find((x: any) => x.isMe);
    const totalXp = members.reduce((sum: number, x: any) => sum + (cards.get(x.user_id)?.xp ?? 0), 0);
    return { guild: { id: g.id, name: g.name, description: g.description, createdAt: g.created_at, role: me?.role ?? 'member', inviteCode: me?.role === 'owner' ? g.invite_code : null,
      memberCap: SOCIAL.guildMembersMax, totalXp, members: list } };
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
      try { await client.query('INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1,$2,\'owner\')', [created.id, userId]); }
      catch (e: any) { if (e.code === '23505') throw new SocialError('CONFLICT', 'Tu fais déjà partie d\'une guilde'); throw e; }
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
      try { await client.query('INSERT INTO guild_members (guild_id, user_id) VALUES ($1,$2)', [g.id, userId]); }
      catch (e: any) { if (e.code === '23505') throw new SocialError('CONFLICT', 'Tu fais déjà partie d\'une guilde'); throw e; }
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
    if (!isUuid(targetId) || lowerId(targetId) === userId) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const target = lowerId(targetId);
    const gid = await this.ownerOf(userId);
    const r = await query('DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2', [gid, target]);
    if (!r.rowCount) throw new SocialError('NOT_FOUND', 'Ce joueur n\'est pas dans ta guilde');
    // Le code d'invitation est renouvelé : sinon la personne retirée pourrait revenir tout de suite avec l'ancien.
    await this.regenerateInvite(userId);
    await notify({ query }, target, { kind: 'guild_kick', title: 'Retiré d\'une guilde', body: 'Le propriétaire t\'a retiré de sa guilde.', link: '/friends?tab=guild' });
    await auditLog({ userId, action: 'social.guild_kick', entityType: 'guild', entityId: gid, metadata: { target }, ip });
    return { ok: true };
  },
  async transfer(userId: string, targetId: unknown) {
    if (!isUuid(targetId) || lowerId(targetId) === userId) throw new SocialError('INVALID_INPUT', 'Joueur invalide');
    const target = lowerId(targetId);
    const gid = await this.ownerOf(userId);
    if (!(await query('SELECT 1 FROM guild_members WHERE guild_id = $1 AND user_id = $2', [gid, target])).rowCount) throw new SocialError('NOT_FOUND', 'Ce joueur n\'est pas dans ta guilde');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE guild_members SET role = \'member\' WHERE guild_id = $1 AND user_id = $2', [gid, userId]);
      await client.query('UPDATE guild_members SET role = \'owner\' WHERE guild_id = $1 AND user_id = $2', [gid, target]);
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
