import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { educationProgressRepository } from '../repositories/educationProgressRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';

const CHAPTER_COINS = 20;
const DOMAIN_COMPLETE_COINS = 100;

export const educationController = {
  // Appelé quand l'utilisateur termine un chapitre (quiz réussi). Idempotent :
  // ne récompense qu'à la toute première complétion de ce chapitre.
  completeChapter: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { domainId, chapterId, score, xpEarned } = req.body;
      if (!domainId || !chapterId) {
        res.status(400).json({ error: 'domainId et chapterId requis' });
        return;
      }

      const isFirstCompletion = await educationProgressRepository.recordCompletion(
        req.user.userId,
        domainId,
        String(chapterId),
        score,
        xpEarned || 0,
        CHAPTER_COINS
      );

      let balance: number | null = null;
      if (isFirstCompletion) {
        balance = await investcoinsRepository.applyTransaction(
          req.user.userId,
          CHAPTER_COINS,
          'quiz_chapter',
          { domainId, chapterId }
        );
      }

      res.json({
        success: true,
        rewarded: isFirstCompletion,
        coinsEarned: isFirstCompletion ? CHAPTER_COINS : 0,
        balance,
      });
    } catch (error) {
      console.error('Complete chapter error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la progression' });
    }
  },

  // Appelé quand l'utilisateur termine tous les chapitres d'un domaine.
  completeDomain: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { domainId, score, xpEarned } = req.body;
      if (!domainId) {
        res.status(400).json({ error: 'domainId requis' });
        return;
      }

      const isFirstCompletion = await educationProgressRepository.recordCompletion(
        req.user.userId,
        domainId,
        undefined,
        score,
        xpEarned || 0,
        DOMAIN_COMPLETE_COINS
      );

      let balance: number | null = null;
      if (isFirstCompletion) {
        balance = await investcoinsRepository.applyTransaction(
          req.user.userId,
          DOMAIN_COMPLETE_COINS,
          'quiz_domain_complete',
          { domainId }
        );
      }

      res.json({
        success: true,
        rewarded: isFirstCompletion,
        coinsEarned: isFirstCompletion ? DOMAIN_COMPLETE_COINS : 0,
        balance,
      });
    } catch (error) {
      console.error('Complete domain error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la progression' });
    }
  },
};
