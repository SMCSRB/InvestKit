import { Router } from 'express';
import { educationController } from '../controllers/educationController';
import { authMiddleware } from '../middleware/auth';
import { quizLimiter } from '../middleware/rateLimiter';

export const educationRoutes = Router();

// Le serveur corrige lui-même les quiz (par identifiant de réponse) : c'est la SEULE façon d'obtenir une récompense d'éducation.
educationRoutes.post('/submit-quiz', authMiddleware, quizLimiter, educationController.submitQuiz);
// Anciennes routes (« j'ai fini ») : elles récompensaient sans preuve. Elles répondent désormais 410 et ne donnent plus rien.
educationRoutes.post('/complete-chapter', authMiddleware, educationController.legacyCompletion);
educationRoutes.post('/complete-domain', authMiddleware, educationController.legacyCompletion);
