import { query } from '../utils/db';
import type { Queryable } from '../repositories/investcoinsRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { canClaimDailyReward } from './dailyRewardService';
import { outstandingCoins } from './bankService';
import { tradingSummary } from './overviewService';
import { netWorthCoins } from '../engine/wealth';

// Portefeuille du joueur : l'UNIQUE source des chiffres d'InvestCoins affichés par le site (barre du haut, menu, carte Patrimoine,
// Liquidités). Renvoyé par GET /economy/balance et ajouté à la réponse de chaque action qui peut changer les pièces
// (voir middleware/walletEcho.ts). Le navigateur n'invente rien : il affiche ce que le serveur dit.
export interface WalletSnapshot {
  balance: number;          // liquidités
  tradingValue: number;     // valeur des titres (Bourse + Crypto)
  debtCoins: number;        // dettes bancaires
  netWorth: number;         // liquidités + titres − dettes
  dailyStreak: number;
  canClaimToday: boolean;
  at: number;               // instant (ms) où le serveur a lu ces chiffres : le navigateur ignore un instantané plus ancien que celui qu'il affiche
}

export const walletService = {
  async snapshot(userId: string, db: Queryable = { query }): Promise<WalletSnapshot> {
    const balance = await investcoinsRepository.getBalance(userId, db);
    const u = (await db.query('SELECT daily_streak, last_daily_claim_at FROM users WHERE id = $1', [userId])).rows[0];
    const stocks = await tradingSummary(userId, 'stocks');
    const crypto = await tradingSummary(userId, 'crypto');
    const debtCoins = await outstandingCoins(db as any, userId);
    const tradingValue = stocks.marketValue + crypto.marketValue;
    return {
      balance, tradingValue, debtCoins, netWorth: netWorthCoins({ coins: balance, tradingValue, debtCoins }),
      dailyStreak: u?.daily_streak ?? 0, canClaimToday: canClaimDailyReward(u?.last_daily_claim_at), at: Date.now(),
    };
  },
};
