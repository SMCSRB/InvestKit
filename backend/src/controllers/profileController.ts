import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { profileService, ProfileError } from '../services/profileService';
import { AvatarError } from '../utils/avatarImage';

const STATUS: Record<string, number> = { INVALID_INPUT: 400, BAD_CREDENTIALS: 401, TWO_FACTOR_REQUIRED: 401, NOT_FOUND: 404, RATE_LIMIT: 429 };
const AVATAR_STATUS: Record<string, number> = { EMPTY: 400, TOO_LARGE: 413, BAD_TYPE: 415, UNREADABLE: 422 };

const fail = (res: Response, fallback: string, error: unknown) => {
  if (error instanceof ProfileError) { res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code }); return; }
  if (error instanceof AvatarError) { res.status(AVATAR_STATUS[error.code] ?? 400).json({ error: error.message, code: error.code }); return; }
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
};

const run = (fallback: string, fn: (req: AuthRequest, userId: string) => Promise<unknown>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
    try { res.json(await fn(req, req.user.userId)); } catch (error) { fail(res, fallback, error); }
  };

export const profileController = {
  get: run('Erreur lors de la lecture du profil', (_r, u) => profileService.get(u)),
  update: run('Erreur lors de l\'enregistrement du profil', (r, u) => profileService.update(u, r.body, r.ip)),
  // Le corps n'est transmis que s'il s'agit d'octets (Buffer, produit par express.raw) : un JSON (tableau, texte, objet) est écarté dès l'entrée.
  setAvatar: run('Erreur lors de l\'envoi de la photo', (r, u) => profileService.setAvatar(u, Buffer.isBuffer(r.body) ? r.body : undefined, r.ip)),
  removeAvatar: run('Erreur lors de la suppression de la photo', (r, u) => profileService.removeAvatar(u, r.ip)),
  requestEmail: run('Erreur lors de la demande de changement d\'adresse', (r, u) => profileService.requestEmailChange(u, r.body ?? {}, r.ip)),
  confirmEmail: run('Erreur lors de la confirmation de l\'adresse', (r, u) => profileService.confirmEmailChange(u, r.body?.code, r.ip)),

  // Lecture publique d'une photo par son identifiant secret (jamais par identifiant de joueur : rien à énumérer).
  // Cross-Origin-Resource-Policy : le site (autre origine que l'API) doit pouvoir afficher l'image ; nosniff + CSP : le navigateur ne l'interprète jamais autrement que comme une image.
  image: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const found = await profileService.avatarImage(String(req.params.avatarId));
      if (!found) { res.status(404).json({ error: 'Image introuvable' }); return; }
      res.setHeader('Content-Type', found.contentType);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');   // l'identifiant change à chaque nouvelle photo
      res.end(found.image);
    } catch (error) { fail(res, 'Erreur lors de la lecture de l\'image', error); }
  },
};
