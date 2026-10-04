import { query, getClient } from '../utils/db';
import { BADGES, BadgeFacts, RARITY_MIN_PLAYERS } from '../config/badgeRules';
import { levelInfo } from '../config/levelRules';
import { xpService } from './xpService';
import { notify } from './notificationService';

// Badges (6a) : attribués par le serveur à partir de FAITS du serveur, jamais du navigateur. Évaluation idempotente : la clé unique
// (joueur, badge) garantit qu'un badge n'est donné qu'une fois, et la notification n'est créée qu'à l'attribution.
const one = async (sql: string, params: unknown[]) => (await query(sql, params as any[])).rows[0];

export const gatherFacts = async (userId: string): Promise<BadgeFacts> => {
  const edu = (await query(`SELECT domain_id, chapter_id FROM education_progress WHERE user_id = $1`, [userId])).rows;
  const chaptersDone = edu.filter((r: any) => r.chapter_id !== '__domain_complete__').length;
  const domainsCompleted = edu.filter((r: any) => r.chapter_id === '__domain_complete__').map((r: any) => String(r.domain_id));
  const stocks = await one(`SELECT 1 FROM virtual_portfolios WHERE user_id = $1 AND domain = 'stocks' AND total_bought > 0 LIMIT 1`, [userId]);
  const cryptoOld = await one(`SELECT 1 FROM virtual_portfolios WHERE user_id = $1 AND domain = 'crypto' AND total_bought > 0 LIMIT 1`, [userId]);
  const cryptoNew = await one(`SELECT 1 FROM crypto_fills WHERE user_id = $1 LIMIT 1`, [userId]);
  const property = await one(`SELECT 1 FROM re_properties p JOIN re_games g ON g.id = p.game_id WHERE g.user_id = $1 LIMIT 1`, [userId]);
  const user = await one('SELECT active_days FROM users WHERE id = $1', [userId]);
  const loans = await one(`SELECT COUNT(*)::int AS n FROM bank_loans WHERE user_id = $1 AND status = 'repaid'`, [userId]);
  const friends = await one(`SELECT COUNT(*)::int AS n FROM friendships WHERE (user_low = $1 OR user_high = $1) AND status = 'accepted'`, [userId]);
  const guild = await one('SELECT 1 FROM guild_members WHERE user_id = $1 LIMIT 1', [userId]);
  const { total } = await xpService.totals(userId);
  return {
    chaptersDone, domainsCompleted, tradedStocks: !!stocks, tradedCrypto: !!(cryptoOld || cryptoNew), boughtProperty: !!property,
    activeDays: Number(user?.active_days ?? 0), loansRepaid: Number(loans?.n ?? 0), friends: Number(friends?.n ?? 0), inGuild: !!guild, level: levelInfo(total).level,
  };
};

export const badgeService = {
  // Attribue les badges dont la condition est vraie et qui ne sont pas encore obtenus. Renvoie les badges NOUVELLEMENT obtenus.
  // Les récompenses d'XP des badges peuvent faire monter le niveau : on repasse jusqu'à ce que plus rien ne change (borné).
  async evaluate(userId: string): Promise<string[]> {
    const earnedNow: string[] = [];
    for (let pass = 0; pass < 4; pass++) {
      const facts = await gatherFacts(userId);
      const owned = new Set((await query('SELECT badge_id FROM user_badges WHERE user_id = $1', [userId])).rows.map((r: any) => String(r.badge_id)));
      const fresh = BADGES.filter((b) => !owned.has(b.id) && b.condition(facts));
      if (fresh.length === 0) break;
      for (const b of fresh) {
        const client = await getClient();
        let inserted = false;
        try {
          await client.query('BEGIN');
          const res = await client.query('INSERT INTO user_badges (user_id, badge_id, fact_ref) VALUES ($1, $2, $3) ON CONFLICT (user_id, badge_id) DO NOTHING RETURNING id', [userId, b.id, b.factRef(facts)]);
          inserted = res.rows.length > 0;
          if (inserted) {
            await notify(client as any, userId, { kind: 'badge', title: `Badge obtenu : ${b.title}`, body: b.description, link: '/profile' });   // notification unique, à l'attribution
          }
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => undefined); throw e; } finally { client.release(); }
        if (inserted) {
          earnedNow.push(b.id);
          await xpService.grant(userId, { domain: b.xpDomain, source: 'badge', key: `badge:${b.id}`, amount: b.xp });
        }
      }
    }
    return earnedNow;
  },

  // Catalogue complet avec l'état du joueur. Évalue d'abord (les badges sont donc toujours à jour). Rareté réelle, masquée sous 50 joueurs.
  async list(userId: string) {
    const newlyEarned = await badgeService.evaluate(userId);
    const mine = new Map((await query('SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1', [userId])).rows.map((r: any) => [String(r.badge_id), r.earned_at]));
    const players = Number((await query('SELECT COUNT(*)::int AS n FROM users WHERE verified IS TRUE')).rows[0].n);
    const counts = new Map((await query('SELECT badge_id, COUNT(*)::int AS n FROM user_badges GROUP BY badge_id')).rows.map((r: any) => [String(r.badge_id), Number(r.n)]));
    const showRarity = players >= RARITY_MIN_PLAYERS;
    return {
      newlyEarned, players,
      badges: BADGES.map((b) => ({
        id: b.id, category: b.category, rarity: b.rarity, title: b.title, description: b.description, xp: b.xp,
        earned: mine.has(b.id), earnedAt: mine.get(b.id) ?? null,
        rarityPct: showRarity ? Math.round(((counts.get(b.id) ?? 0) / players) * 1000) / 10 : null,
      })),
    };
  },
};
