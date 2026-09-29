import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { realEstateService, RealEstateError } from '../services/realEstateService';
import { realEstateLifeService as life } from '../services/realEstateLifeService';

const STATUS: Record<string, number> = {
  INVALID_INPUT: 400,
  INSUFFICIENT_FUNDS: 400,
  DOMAIN_LOCKED: 403,
  FREE_DOMAIN_NOT_CHOSEN: 403,
  UNKNOWN_LISTING: 404,
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  NO_GAME: 409,
  GAME_EXISTS: 409,
  ALREADY_OWNED: 409,
  BANK_REFUSED: 422,
};

// Toute la logique et tous les calculs sont côté serveur : les contrôleurs ne
// font que lire l'identité (jeton) et traduire les erreurs en réponses HTTP.
const handle = (fallback: string, fn: (req: AuthRequest, userId: string) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    try {
      res.json(await fn(req, req.user.userId));
    } catch (error) {
      if (error instanceof RealEstateError) {
        res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code, details: error.details });
        return;
      }
      console.error(fallback, error);
      res.status(500).json({ error: fallback });
    }
  };

export const realEstateController = {
  getState: handle('Erreur lors de la récupération de la partie', (_r, uid) => realEstateService.getState(uid)),
  start: handle('Erreur lors de la création de la partie', (r, uid) => realEstateService.startGame(uid, r.body?.profile)),
  listings: handle('Erreur lors de la récupération des annonces', (r, uid) =>
    realEstateService.listListings(uid, { cityId: r.query.cityId, type: r.query.type, maxPrice: r.query.maxPrice })),
  listing: handle('Erreur lors de la récupération de l\'annonce', (r, uid) => realEstateService.getListingDetail(uid, r.params.id)),
  expertise: handle('Erreur lors de l\'expertise', (r, uid) => realEstateService.buyExpertise(uid, r.params.id)),
  preview: handle('Erreur lors de la simulation d\'achat', (r, uid) => realEstateService.previewPurchase(uid, r.body)),
  purchase: handle('Erreur lors de l\'achat', (r, uid) => realEstateService.purchase(uid, r.body)),
  properties: handle('Erreur lors de la récupération des biens', (_r, uid) => life.getPortfolio(uid)),
  listForRent: handle('Erreur lors de la mise en location', (r, uid) => life.listForRent(uid, r.params.id, r.body?.askingRentRatio)),
  reprice: handle('Erreur lors de la modification du loyer', (r, uid) => life.repriceListing(uid, r.params.id, r.body?.askingRentRatio)),
  landlordNotice: handle('Erreur lors du congé', (r, uid) => life.landlordNotice(uid, r.params.id, r.body?.reason)),
  events: handle('Erreur lors de la récupération des événements', (r, uid) => life.listEvents(uid, r.query.limit)),
  advance: handle('Erreur lors de l\'avancée du temps', (r, uid) => life.advanceTime(uid, r.body?.months)),
  summary: handle('Erreur lors de la récupération du récapitulatif', (r, uid) => life.getMonthSummary(uid, r.query.year, r.query.month)),
  statements: handle('Erreur lors de la récupération des relevés', (r, uid) => life.getStatements(uid, r.params.id, r.query.limit)),
  payWorks: handle('Erreur lors du paiement des travaux', (r, uid) => realEstateService.payPendingWorks(uid, r.params.id)),
};
