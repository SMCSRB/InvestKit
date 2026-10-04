import { query, getClient } from '../utils/db';
import { levelInfo, XP_DAILY_CAPS, XP_DOMAINS, XpDomain } from '../config/levelRules';

// Journal d'XP (6a) : le serveur décide de tout. Chaque gain est une ligne ajoutée (xp_events), avec une clé d'unicité par événement
// (aucun gain en boucle) et, pour certaines sources, un plafond quotidien. L'XP globale et par domaine se recalculent depuis le journal.
export class XpError extends Error { constructor(message: string) { super(message); this.name = 'XpError'; } }

export interface XpGrant { domain: XpDomain; source: string; key: string; amount: number; at?: Date }
export interface XpResult { granted: number; reason: 'ok' | 'duplicate' | 'capped' }

const validate = (g: XpGrant): void => {
  if (!XP_DOMAINS.includes(g.domain)) throw new XpError('Domaine d\'XP inconnu');
  if (typeof g.source !== 'string' || !/^[a-z0-9_]{1,30}$/.test(g.source)) throw new XpError('Source d\'XP invalide');
  if (typeof g.key !== 'string' || g.key.length < 1 || g.key.length > 120) throw new XpError('Clé d\'événement invalide');
  if (!Number.isInteger(g.amount) || g.amount <= 0 || g.amount > 100_000) throw new XpError('Montant d\'XP invalide');
};

export const xpService = {
  // Accorde de l'XP une seule fois par (joueur, source, clé) ; sous plafond quotidien si la source en a un. Atomique : le verrou du joueur
  // sérialise deux gains simultanés (deux onglets), donc ni double gain ni dépassement du plafond.
  async grant(userId: string, g: XpGrant): Promise<XpResult> {
    validate(g);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`xp:${userId}`]);
      const cap = XP_DAILY_CAPS[g.source];
      let amount = g.amount;
      if (cap !== undefined) {
        const today = (await client.query(
          `SELECT COALESCE(SUM(amount), 0)::int AS s FROM xp_events WHERE user_id = $1 AND source = $2 AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
          [userId, g.source])).rows[0].s as number;
        amount = Math.max(0, Math.min(amount, cap - today));
        if (amount === 0) { await client.query('ROLLBACK'); return { granted: 0, reason: 'capped' }; }
      }
      const res = await client.query(
        `INSERT INTO xp_events (user_id, domain, source, event_key, amount, created_at) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
         ON CONFLICT (user_id, source, event_key) DO NOTHING RETURNING id`,
        [userId, g.domain, g.source, g.key, amount, g.at ?? null]);
      await client.query('COMMIT');
      return res.rows.length ? { granted: amount, reason: 'ok' } : { granted: 0, reason: 'duplicate' };
    } catch (e) { await client.query('ROLLBACK').catch(() => undefined); throw e; } finally { client.release(); }
  },

  // XP totale et par domaine, recalculées depuis le journal.
  async totals(userId: string): Promise<{ total: number; byDomain: Record<XpDomain, number> }> {
    const rows = (await query('SELECT domain, COALESCE(SUM(amount), 0)::bigint AS s FROM xp_events WHERE user_id = $1 GROUP BY domain', [userId])).rows;
    const byDomain = Object.fromEntries(XP_DOMAINS.map((d) => [d, 0])) as Record<XpDomain, number>;
    let total = 0;
    for (const r of rows) { byDomain[r.domain as XpDomain] = Number(r.s); total += Number(r.s); }
    return { total, byDomain };
  },

  // Vue du joueur : XP, niveau global avec titre et progression, niveau par domaine (seulement les domaines où il a de l'XP).
  async me(userId: string) {
    const { total, byDomain } = await xpService.totals(userId);
    const domains = Object.entries(byDomain).filter(([, v]) => v > 0).map(([domain, xp]) => ({ domain, ...levelInfo(xp) }));
    const recent = (await query('SELECT domain, source, amount, created_at FROM xp_events WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 20', [userId])).rows
      .map((r: any) => ({ domain: r.domain, source: r.source, amount: r.amount, at: r.created_at }));
    return { ...levelInfo(total), byDomain, domains, recent };
  },
};
