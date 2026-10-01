import rateLimit from 'express-rate-limit';

// Limite stricte pour les endpoints sensibles (login, register, reset password...)
// 5 tentatives par 15 minutes par IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// Limite plus large pour l'ensemble de l'API (protection anti-abus générale)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez plus tard.' },
});

// Export et suppression de compte : opérations lourdes ou irréversibles, très limitées (5 par heure et par IP).
export const accountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes. Réessayez dans une heure.' },
});

// Vérification d'e-mail à l'inscription : évite de servir d'« oracle » pour lister les comptes existants (20 par 15 min et par IP).
export const checkEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de vérifications. Réessayez dans 15 minutes.' },
});

// Retours utilisateurs : 10 par heure et par IP (anti-spam).
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  skipFailedRequests: true, // une saisie refusée (400) ne consomme pas le quota
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de retours envoyés. Réessayez plus tard.' },
});

// Outils de calcul publics (Monte Carlo…) : 40 requêtes par 15 minutes et par IP.
export const toolsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de simulations. Réessayez dans quelques minutes.' },
});

// Ordres Crypto : 30 par minute et PAR JOUEUR (jeton déjà vérifié avant ce limiteur), une saisie refusée compte aussi (anti-martelage).
export const cryptoOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `crypto-order:${(req as any).user?.userId ?? req.ip}`,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'ordres en peu de temps. Réessaie dans une minute.' },
});

// Actions sociales (demandes d'amis, guildes) : 40 par 10 minutes et par IP, contre l'envoi en masse de demandes.
export const socialWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'actions sociales. Réessaie dans quelques minutes.' },
});
