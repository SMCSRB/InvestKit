import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { onboardingService, OnboardingError } from '../services/onboardingService';

const wrap = (fallback: string, fn: (req: AuthRequest) => Promise<unknown>) => async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json(await fn(req));
  } catch (error) {
    if (error instanceof OnboardingError) { res.status(400).json({ error: error.message, code: error.code }); return; }
    console.error(fallback, error);
    res.status(500).json({ error: fallback });
  }
};

export const onboardingController = {
  get: wrap('Erreur lors de la lecture de la checklist', (r) => onboardingService.get(r.user!.userId)),
  claim: wrap('Erreur lors de la récupération des récompenses', (r) => onboardingService.claim(r.user!.userId)),
  profile: wrap('Erreur lors de l\'enregistrement du profil', (r) => onboardingService.saveProfile(r.user!.userId, r.body)),
};
