import type { Queryable } from '../repositories/investcoinsRepository';
import { STARTING_CAPITAL, RANKING_MIN_INVESTED, RANKING_MIN_ACTIVE_DAYS } from '../config/economy';
import { getActiveDays } from './activityService';

// Capital de départ RÉEL du compte : 10 000 en gratuit ; avec Pro, le bonus de départ (versé une seule fois) s'y ajoute.
// On le lit dans le registre (ledger), jamais dans un statut qui peut changer : c'est le capital réellement reçu.
export const startingCapitalOf = async (db: Queryable, userId: string): Promise<number> => {
  const r = await db.query(`SELECT COALESCE(SUM(amount), 0)::bigint AS s FROM investcoins_transactions WHERE user_id = $1 AND reason = 'pro_starting_bonus'`, [userId]);
  return STARTING_CAPITAL + Number(r.rows[0].s);
};

export interface RankingProgress {
  investedCoins: number;
  minInvestedCoins: number;
  activeDays: number;
  minActiveDays: number;
  ranked: boolean;   // seuil atteint (les deux conditions)
}

// Progression vers le classement : une seule règle pour tous les domaines (Bourse, Crypto, Immobilier et les suivants).
// Aucune échéance ni pression : le classement est ouvert dès que les deux seuils sont atteints, et rien n'est perdu en attendant.
export const rankingProgress = async (db: Queryable, userId: string, investedCoins: number): Promise<RankingProgress> => {
  const activeDays = await getActiveDays(userId, db as any);
  return {
    investedCoins: Math.max(0, Math.floor(investedCoins)), minInvestedCoins: RANKING_MIN_INVESTED,
    activeDays, minActiveDays: RANKING_MIN_ACTIVE_DAYS,
    ranked: investedCoins >= RANKING_MIN_INVESTED && activeDays >= RANKING_MIN_ACTIVE_DAYS,
  };
};
