import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { simulateMonteCarlo, stressTest, riskScore, RiskInputError } from '../engine/risk';
import { riskService } from '../services/riskService';

const wrap = (fallback: string, fn: (req: AuthRequest) => unknown | Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await fn(req));
    } catch (error) {
      if (error instanceof RiskInputError) { res.status(400).json({ error: error.message, code: 'INVALID_INPUT' }); return; }
      console.error(fallback, error);
      res.status(500).json({ error: fallback });
    }
  };

const NOTE = 'Simulation pédagogique : les performances passées ne préjugent pas des performances futures. Ce n\'est pas un conseil en investissement.';

export const riskController = {
  monteCarlo: wrap('Erreur lors de la simulation', (r) => ({ ...simulateMonteCarlo(r.body), note: NOTE })),
  stress: wrap('Erreur lors du test de résistance', (r) => {
    const capital = r.body?.capital;
    if (capital !== undefined && (typeof capital !== 'number' || !Number.isFinite(capital) || capital < 0 || capital > 1e12)) throw new RiskInputError('Capital invalide');
    return { ...stressTest(r.body?.allocation, capital), note: NOTE };
  }),
  score: wrap('Erreur lors du calcul du score', (r) => ({ ...riskScore({ allocation: r.body?.allocation, horizonYears: r.body?.horizonYears, leverage: r.body?.leverage }), note: NOTE })),
  correlation: wrap('Erreur lors du calcul des corrélations', (r) => riskService.correlation(r.query.domain)),
  portfolio: wrap('Erreur lors du calcul du risque du portefeuille', (r) => riskService.portfolioRisk(r.user!.userId, r.query.domain, r.query.horizon)),
};
