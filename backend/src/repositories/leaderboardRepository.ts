import { query } from '../utils/db';
import type { Queryable } from './investcoinsRepository';
import { RANKING_MIN_ACTIVE_DAYS } from '../config/economy';

export interface BoardEntry {
  rank: number;
  username: string;
  avatarId: string | null; // identifiant secret de la photo de profil (null = pas de photo)
  pro: boolean; // indicateur « membre Pro » (booléen seulement ; masqué si le joueur a choisi de le cacher)
  performancePct: number;
  leverage: number | null; // levier utilisé (capital investi / capital propre) ; null = non applicable
  isMe: boolean;
}

export interface Board {
  entries: BoardEntry[];
  me: BoardEntry | null;
  totalRanked: number;
}

// Un classement compare des joueurs À DATE SIMULÉE ÉGALE : sans ça, quelqu'un
// arrivé en 2026 serait comparé à quelqu'un resté en 2012 et le classement ne
// voudrait rien dire. Chaque année simulée traversée a donc son propre
// instantané, stocké dans `period` sous la forme "Y2015". Le classement
// "arrivés au bout de la frise" est simplement celui de la dernière année.
export const periodForYear = (year: number): string => `Y${year}`;

export const leaderboardRepository = {
  // Capital engagé du joueur dans son instantané de la période (0 s'il n'en a pas encore) : sert à la barre de progression vers le classement.
  async committedBy(params: { mode: string; domain: string; period: string; userId: string }): Promise<number> {
    const r = await query(
      `SELECT capital_committed FROM leaderboard_rankings WHERE user_id = $1 AND mode = $2 AND domain = $3 AND period = $4`,
      [params.userId, params.mode, params.domain, params.period]
    );
    return r.rows.length ? Number(r.rows[0].capital_committed) : 0;
  },

  // Enregistre (ou met à jour) l'instantané du joueur pour cette année
  // simulée. Appelé dans la même transaction que l'ordre ou l'avancée qui
  // le modifie, pour que le classement ne diffère jamais du portefeuille.
  async upsertSnapshot(
    db: Queryable,
    snapshot: {
      userId: string;
      mode: string;
      domain: string;
      year: number;
      performancePct: number;
      capitalCommitted: number;
      leverage?: number | null;
      period?: string;   // période explicite (ex. "M2020-03" pour le marché Crypto) ; sinon l'année simulée
    }
  ): Promise<void> {
    await db.query(
      `INSERT INTO leaderboard_rankings
         (user_id, mode, domain, period, performance_pct, capital_committed, leverage, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, mode, domain, period)
       DO UPDATE SET performance_pct = EXCLUDED.performance_pct,
                     capital_committed = EXCLUDED.capital_committed,
                     leverage = EXCLUDED.leverage,
                     computed_at = NOW()`,
      [
        snapshot.userId,
        snapshot.mode,
        snapshot.domain,
        snapshot.period ?? periodForYear(snapshot.year),
        snapshot.performancePct,
        snapshot.capitalCommitted,
        snapshot.leverage ?? null,
      ]
    );
  },

  // Seuls les joueurs ayant engagé au moins `minCapital` ET ayant au moins RANKING_MIN_ACTIVE_DAYS jours actifs sont classés (règle unique, tous domaines).
  // (Avant : seuls les joueurs ayant engagé au moins `minCapital`)  (un %
  // sur un capital dérisoire n'a aucun sens). Le rang est calculé à la
  // lecture : il reste ainsi toujours cohérent avec les instantanés.
  async getBoard(params: {
    mode: string;
    domain: string;
    year: number;
    period?: string;
    minCapital: number;
    limit: number;
    callerId: string;
  }): Promise<Board> {
    const result = await query(
      `WITH ranked AS (
         SELECT lr.user_id,
                COALESCE(u.username, 'Investisseur anonyme') AS username,
                u.avatar_id,
                ((u.subscription_tier = 'pro' OR u.pro_override = TRUE) AND (u.show_pro_badge = TRUE OR lr.user_id = $6)) AS pro,
                lr.performance_pct,
                lr.leverage,
                RANK() OVER (ORDER BY lr.performance_pct DESC) AS rank,
                ROW_NUMBER() OVER (ORDER BY lr.performance_pct DESC, (lr.user_id = $6) DESC, u.username, lr.user_id) AS rn
         FROM leaderboard_rankings lr
         JOIN users u ON u.id = lr.user_id
         WHERE lr.mode = $1 AND lr.domain = $2 AND lr.period = $3
           AND lr.capital_committed >= $4
           AND u.active_days >= $7
       )
       SELECT user_id, username, avatar_id, pro, performance_pct, leverage, rank,
              (SELECT COUNT(*) FROM ranked) AS total
       FROM ranked
       WHERE (rank <= $5 AND rn <= $5) OR user_id = $6
       ORDER BY rank, (user_id = $6) DESC, username`,
      [params.mode, params.domain, params.period ?? periodForYear(params.year), params.minCapital, params.limit, params.callerId, RANKING_MIN_ACTIVE_DAYS]
    );

    const toEntry = (row: any): BoardEntry => ({
      rank: Number(row.rank),
      username: row.username,
      avatarId: row.avatar_id ?? null,
      pro: row.pro === true,
      performancePct: Number(row.performance_pct),
      leverage: row.leverage === null || row.leverage === undefined ? null : Number(row.leverage),
      isMe: row.user_id === params.callerId,
    });

    const all = result.rows.map(toEntry);
    return {
      // RANK() donne le même rang aux ex æquo : sans plafond, des centaines de joueurs à égalité (ex. 0 %) remplissaient la liste.
      entries: all.filter((e) => e.rank <= params.limit).slice(0, params.limit),
      me: all.find((e) => e.isMe) ?? null,
      totalRanked: result.rows.length ? Number(result.rows[0].total) : 0,
    };
  },
};
