import { Response } from 'express';
import { AuthRequest } from './auth';
import { userRepository } from '../repositories/userRepository';

// Réservé aux administrateurs (rôle lu en base, jamais dans le jeton) ET seulement avec la 2FA activée (roadmap 3G).
// Renvoie true si l'accès est accordé ; sinon la réponse d'erreur est déjà envoyée.
export const requireAdmin = async (req: AuthRequest, res: Response): Promise<boolean> => {
  if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return false; }
  const user = await userRepository.findById(req.user.userId);
  if (!user || user.role !== 'admin') { res.status(403).json({ error: 'Réservé aux administrateurs' }); return false; }
  if (!user.enable_2fa) {
    res.status(403).json({ error: 'Active d\'abord la double authentification (2FA) : elle est obligatoire pour les comptes administrateur.', code: 'ADMIN_2FA_REQUIRED' });
    return false;
  }
  return true;
};
