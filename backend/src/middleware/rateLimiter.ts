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
