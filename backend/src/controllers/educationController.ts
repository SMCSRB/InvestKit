import { badgeService } from '../services/badgeService';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { educationProgressRepository } from '../repositories/educationProgressRepository';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { EDUCATION_CATALOG } from '../data/educationCatalog';
import { EDUCATION_QUIZZES } from '../data/educationQuizzes';
import { EDUCATION_CHAPTER_XP, EDUCATION_DOMAIN_XP } from '../config/game';
import { EDUCATION_CHAPTER_COINS, EDUCATION_DOMAIN_COMPLETE_COINS } from '../config/economy';
import { grantFirstStep } from '../services/firstStepsService';

const CHAPTER_COINS = EDUCATION_CHAPTER_COINS;
const DOMAIN_COMPLETE_COINS = EDUCATION_DOMAIN_COMPLETE_COINS;
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export const educationController = {
  // Le SERVEUR corrige le quiz. Le client envoie, pour chaque question, l'IDENTIFIANT de l'option choisie (jamais sa position, jamais un score).
  // Récompense (pièces + XP, montants fixés ici) : une seule fois par chapitre, et une seule fois par domaine (quiz final, après tous les chapitres).
  // Plafond total par joueur = (nombre de chapitres × 20) + (nombre de domaines × 100) : refaire un quiz déjà validé ne rapporte rien.
  submitQuiz: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
      const userId = req.user.userId;
      const { domainId, scope, answers } = req.body ?? {};

      if (typeof domainId !== 'string' || !has(EDUCATION_QUIZZES, domainId)) { res.status(400).json({ error: 'Domaine inconnu' }); return; }
      const scopeKey = String(scope ?? '');
      const domain = EDUCATION_QUIZZES[domainId];
      const isFinal = scopeKey === 'final';
      if (!isFinal && !has(domain.chapters, scopeKey)) { res.status(400).json({ error: 'Chapitre inconnu' }); return; }
      const spec = isFinal ? domain.final : domain.chapters[scopeKey];

      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) { res.status(400).json({ error: 'Réponses manquantes' }); return; }
      // Toutes les questions doivent avoir une réponse valide (un identifiant d'option de CETTE question) : sinon on refuse, on ne devine rien.
      for (const q of spec.questions) {
        const a = (answers as Record<string, unknown>)[q.id];
        if (typeof a !== 'string' || !q.options.includes(a)) { res.status(400).json({ error: 'Réponds à toutes les questions avec une des options proposées.' }); return; }
      }

      const good = spec.questions.filter((q) => (answers as Record<string, string>)[q.id] === q.correct).length;
      const score = Math.round((good / spec.questions.length) * 100);
      const passed = score >= spec.passingScore;
      // Quand le quiz est raté on dit quelles réponses sont fausses, mais on ne donne pas la bonne option : on invite à relire le chapitre.
      const results = spec.questions.map((q) => {
        const ok = (answers as Record<string, string>)[q.id] === q.correct;
        return passed ? { questionId: q.id, correct: ok, correctOptionId: q.correct } : { questionId: q.id, correct: ok };
      });
      const base = { success: true, scope: scopeKey, score, passed, passingScore: spec.passingScore, results };

      if (!passed) { res.json({ ...base, rewarded: false, coinsEarned: 0, xpEarned: 0, balance: null }); return; }

      let coins = CHAPTER_COINS;
      let xp = EDUCATION_CHAPTER_XP;
      let chapterId: string | undefined = scopeKey;
      let reason: 'quiz_chapter' | 'quiz_domain_complete' = 'quiz_chapter';
      if (isFinal) {
        // Le quiz final ne compte que si tous les chapitres du domaine ont été validés par le serveur.
        const done = new Set(await educationProgressRepository.completedChapterIds(userId, domainId));
        const missing = EDUCATION_CATALOG[domainId].filter((c) => !done.has(c));
        if (missing.length) {
          res.status(409).json({ error: 'Termine d\'abord tous les chapitres du parcours : le quiz final se valide après.', code: 'CHAPTERS_MISSING', missing });
          return;
        }
        coins = DOMAIN_COMPLETE_COINS; xp = EDUCATION_DOMAIN_XP; chapterId = undefined; reason = 'quiz_domain_complete';
      }

      const first = await educationProgressRepository.recordCompletion(userId, domainId, chapterId, score, xp, coins);
      let balance: number | null = null;
      let firstStepBonus = 0;
      if (first) {
        balance = await investcoinsRepository.applyTransaction(userId, coins, reason, isFinal ? { domainId } : { domainId, chapterId });
        // Bonus uniques « premiers pas » : premier chapitre validé, premier quiz final réussi (versés une seule fois par compte).
        firstStepBonus = await grantFirstStep(userId, isFinal ? 'first_quiz' : 'first_lesson');
        if (firstStepBonus > 0) balance = await investcoinsRepository.getBalance(userId);
      }
      // Les badges ne doivent jamais faire échouer une récompense déjà versée : en cas d'erreur, on les évaluera à la prochaine lecture.
      let newBadges: string[] = [];
      if (first) { try { newBadges = await badgeService.evaluate(userId); } catch (e) { console.error('Évaluation des badges :', e); } }
      res.json({ ...base, rewarded: first, coinsEarned: first ? coins : 0, xpEarned: first ? xp : 0, firstStepBonus, balance, newBadges });
    } catch (error) {
      console.error('Submit quiz error:', error);
      res.status(500).json({ error: 'Erreur lors de la correction du quiz' });
    }
  },

  // Ancien « j'ai fini » envoyé par le navigateur : il rapportait des pièces sans aucune preuve. Il ne donne plus rien.
  legacyCompletion: async (_req: AuthRequest, res: Response): Promise<void> => {
    res.status(410).json({ error: 'Route remplacée : le serveur corrige désormais les quiz lui-même (POST /education/submit-quiz).', code: 'GONE' });
  },
};
