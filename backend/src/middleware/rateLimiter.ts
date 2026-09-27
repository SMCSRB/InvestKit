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
