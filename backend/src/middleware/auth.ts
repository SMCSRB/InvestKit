import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { isDisabled } from '../utils/userStatus';
import {
  SESSION_COOKIE, CSRF_COOKIE, CSRF_HEADER, readCookie, isSafeMethod, csrfValid, csrfTokenFor, originAllowed, setSessionCookies,
} from '../utils/session';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  authVia?: 'bearer' | 'cookie';
}

// Deux façons de s'authentifier :
// 1. `Authorization: Bearer <jwt>` (application mobile, scripts) : aucune protection CSRF nécessaire, le navigateur n'envoie
//    jamais cet en-tête tout seul.
// 2. Cookie de session httpOnly (navigateur) : toute requête qui modifie des données doit porter l'en-tête X-CSRF-Token
//    (jeton dérivé de la session) et, si présent, une Origin autorisée.
// Si un en-tête Bearer est présent il prime (un jeton invalide est refusé, sans repli sur le cookie).
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bearer = req.headers.authorization?.split(' ')[1];
    const cookieToken = bearer ? undefined : readCookie(req, SESSION_COOKIE);
    const token = bearer ?? cookieToken;

    if (!token) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Token invalide' });
      return;
    }

    if (payload.pending2fa) {
      res.status(401).json({ error: 'Vérification 2FA requise' });
      return;
    }

    if (cookieToken) {
      if (!isSafeMethod(req.method)) {
        if (!originAllowed(req)) {
          res.status(403).json({ error: 'Origine non autorisée', code: 'CSRF_ORIGIN' });
          return;
        }
        if (!csrfValid(cookieToken, req.headers[CSRF_HEADER])) {
          res.status(403).json({ error: 'Jeton anti-CSRF manquant ou invalide', code: 'CSRF_INVALID' });
          return;
        }
      } else if (readCookie(req, CSRF_COOKIE) !== csrfTokenFor(cookieToken)) {
        // Le cookie anti-CSRF a disparu ou ne correspond plus à la session : on le ré-émet (sans toucher à la session).
        setSessionCookies(res, cookieToken);
      }
    }

    if (await isDisabled(payload.userId)) {
      res.status(403).json({ error: 'Ce compte est suspendu.', code: 'ACCOUNT_DISABLED' });
      return;
    }

    req.user = payload;
    req.authVia = cookieToken ? 'cookie' : 'bearer';
    next();
  } catch (error) {
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};
