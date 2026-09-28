import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { userRepository } from '../repositories/userRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';

const STARTING_CAPITAL = 500;
const DAILY_BASE_REWARD = 50;
const DAILY_STREAK_BONUS = 10; // par jour de streak, plafonné
const DAILY_STREAK_CAP = 30;
const REFERRAL_BONUS = 100;

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const isYesterday = (last: Date, now: Date): boolean => {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return dayKey(new Date(last.getTime() + oneDayMs)) === dayKey(now);
};

// Accorde le capital de départ en InvestCoins - appelé une fois, à la
// vérification de l'email (voir authController.verifyEmail).
export const grantStartingCapital = async (userId: string): Promise<void> => {
  await investcoinsRepository.applyTransaction(userId, STARTING_CAPITAL, 'starting_capital');
};

// Récompense le parrain quand son filleul vérifie son email. Note : comme
// tout programme de parrainage sans vérification d'identité forte, un
// utilisateur pourrait créer plusieurs comptes avec son propre code pour
// farmer le bonus - accepté pour l'instant (Phase 2B), à durcir plus tard
// (Phase 6 sécurité) si l'abus devient réel.
export const rewardReferrer = async (referrerUserId: string, referredUserId: string): Promise<void> => {
  await investcoinsRepository.applyTransaction(referrerUserId, REFERRAL_BONUS, 'referral_bonus', {
    referredUserId,
  });
};

export const economyController = {
  getBalance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const balance = await investcoinsRepository.getBalance(req.user.userId);
      const user = await userRepository.findById(req.user.userId);

      res.json({
        balance,
        dailyStreak: user?.daily_streak ?? 0,
        canClaimToday: canClaimDailyReward(user?.last_daily_claim_at),
      });
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du solde' });
    }
  },

  getHistory: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const transactions = await investcoinsRepository.getRecentTransactions(req.user.userId);
      res.json({ transactions });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }
  },

  claimDailyReward: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
        return;
      }

      const now = new Date();

      if (!canClaimDailyReward(user.last_daily_claim_at)) {
        res.status(400).json({ error: 'Récompense déjà réclamée aujourd\'hui' });
        return;
      }

      const newStreak = user.last_daily_claim_at && isYesterday(new Date(user.last_daily_claim_at), now)
        ? user.daily_streak + 1
        : 1;

      const bonusStreak = Math.min(newStreak, DAILY_STREAK_CAP);
      const reward = DAILY_BASE_REWARD + (bonusStreak - 1) * DAILY_STREAK_BONUS;

      const newBalance = await investcoinsRepository.applyTransaction(user.id, reward, 'daily_reward', {
        streak: newStreak,
      });
      await userRepository.setDailyStreak(user.id, newStreak, now);

      res.json({ success: true, reward, newStreak, balance: newBalance });
    } catch (error) {
      console.error('Claim daily reward error:', error);
      res.status(500).json({ error: 'Erreur lors de la réclamation de la récompense' });
    }
  },
};

function canClaimDailyReward(lastClaimAt?: Date): boolean {
  if (!lastClaimAt) return true;
  return dayKey(new Date(lastClaimAt)) !== dayKey(new Date());
}
