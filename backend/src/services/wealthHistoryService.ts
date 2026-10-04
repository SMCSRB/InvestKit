import { query } from '../utils/db';
import type { Queryable } from '../repositories/investcoinsRepository';

// Historique du patrimoine (6g, G1) : une ligne par joueur et par jour (UTC), écrite par le serveur à partir du portefeuille qu'il vient de calculer.
// Les montants sont en InvestCoins entiers. Le navigateur n'écrit jamais ici.
export interface WealthPoint {
  liquidity: number;
  stocks: number;
  crypto: number;
  realEstateNet: number;   // peut être négatif (revente qui ne couvre pas la dette)
  debts: number;           // dettes bancaires, nombre positif
  financial: number;       // liquidités + titres − dettes
  total: number;           // financier + immobilier net de revente
  gameClock?: Record<string, number | string | null>;   // date de jeu de chaque domaine à cet instant (information, pas un tri)
}

const int = (v: number): number => (Number.isFinite(v) ? Math.round(v) : 0);

export const wealthHistoryService = {
  // Enregistre (ou met à jour) le point du jour. N'écrit rien si rien n'a changé depuis le dernier point du jour (pas de bruit en base).
  // Une erreur ici ne doit jamais empêcher l'affichage du portefeuille : l'appelant l'ignore.
  async record(userId: string, p: WealthPoint, db: Queryable = { query }): Promise<boolean> {
    const v = [int(p.liquidity), int(p.stocks), int(p.crypto), int(p.realEstateNet), int(p.debts), int(p.financial), int(p.total)];
    const clock = JSON.stringify(p.gameClock ?? {});
    const res = await db.query(
      `INSERT INTO wealth_snapshots (user_id, day, liquidity, stocks, crypto, real_estate_net, debts, financial, total, game_clock)
       VALUES ($1, (NOW() AT TIME ZONE 'UTC')::date, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (user_id, day) DO UPDATE
         SET liquidity = EXCLUDED.liquidity, stocks = EXCLUDED.stocks, crypto = EXCLUDED.crypto, real_estate_net = EXCLUDED.real_estate_net,
             debts = EXCLUDED.debts, financial = EXCLUDED.financial, total = EXCLUDED.total, game_clock = EXCLUDED.game_clock, updated_at = NOW()
         WHERE (wealth_snapshots.liquidity, wealth_snapshots.stocks, wealth_snapshots.crypto, wealth_snapshots.real_estate_net, wealth_snapshots.debts,
                wealth_snapshots.financial, wealth_snapshots.total, wealth_snapshots.game_clock)
               IS DISTINCT FROM (EXCLUDED.liquidity, EXCLUDED.stocks, EXCLUDED.crypto, EXCLUDED.real_estate_net, EXCLUDED.debts, EXCLUDED.financial, EXCLUDED.total, EXCLUDED.game_clock)
       RETURNING 1`,
      [userId, ...v, clock]);
    return res.rows.length > 0;
  },

  // Série du joueur, du plus ancien au plus récent (au plus `limit` points : les plus récents).
  async series(userId: string, limit = 365) {
    const n = Math.max(1, Math.min(Math.floor(limit) || 365, 3650));
    const rows = (await query(
      `SELECT * FROM (SELECT day, liquidity, stocks, crypto, real_estate_net, debts, financial, total, game_clock FROM wealth_snapshots
                      WHERE user_id = $1 ORDER BY day DESC LIMIT $2) t ORDER BY day`, [userId, n])).rows;
    return rows.map((r: any) => ({
      day: new Date(r.day).toISOString().slice(0, 10), liquidity: Number(r.liquidity), stocks: Number(r.stocks), crypto: Number(r.crypto),
      realEstateNet: Number(r.real_estate_net), debts: Number(r.debts), financial: Number(r.financial), total: Number(r.total), gameClock: r.game_clock,
    }));
  },
};
