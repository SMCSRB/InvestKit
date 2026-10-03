import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { claimDailyReward } from '../services/dailyRewardService';
import { firstStepsState } from '../services/firstStepsService';
import { walletService } from '../services/walletService';



export const economyController = {
  getCoinsByDomain: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!(await requireAdmin(req, res))) return;
      res.json({ domains: await investcoinsRepository.ledgerStatsByDomain(), sinks: await investcoinsRepository.sinksByDomainAndReason() });
    } catch (error) {
      console.error('Coins by domain error:', error);
      res.status(500).json({ error: 'Erreur lors du calcul de la statistique' });
    }
  },

  getBalance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      res.json(await walletService.snapshot(req.user.userId));   // une seule définition des chiffres d'InvestCoins : voir services/walletService.ts
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
      const result = await claimDailyReward(req.user.userId);
      if (!result.claimed) {
        if (result.reason === 'USER_NOT_FOUND') {
          res.status(404).json({ error: 'Utilisateur non trouvé' });
        } else if (result.reason === 'WEEKLY_CAP') {
          res.status(400).json({ error: `Tu as déjà reçu tes ${result.maxPerWeek} récompenses de la semaine. La prochaine est disponible lundi.`, code: 'WEEKLY_CAP', nextWeekStart: result.nextWeekStart });
        } else {
          res.status(400).json({ error: 'Récompense du jour déjà récupérée.', code: 'ALREADY_CLAIMED' });
        }
        return;
      }
      res.json({ success: true, reward: result.reward, balance: result.balance, claimedThisWeek: result.claimedThisWeek, maxPerWeek: result.maxPerWeek });
    } catch (error) {
      console.error('Claim daily reward error:', error);
      res.status(500).json({ error: 'Erreur lors de la réclamation de la récompense' });
    }
  },

  // État des bonus « premiers pas » (acquis ou non, montants) : lu par l'interface, jamais décidé par elle.
  getFirstSteps: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
      res.json(await firstStepsState(req.user.userId));
    } catch (error) {
      console.error('Get first steps error:', error);
      res.status(500).json({ error: 'Erreur lors de la lecture des premiers pas' });
    }
  },
};
