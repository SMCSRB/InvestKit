import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  impersonatedBy?: string; // identifiant de l'administrateur qui « voit comme » cet utilisateur (session en lecture seule)
  pending2fa?: boolean; // true = jeton intermédiaire, valide UNIQUEMENT pour finaliser la 2FA
  iat?: number;
  exp?: number;
}

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

// Jeton de courte durée émis après un mot de passe correct quand le compte a
// la 2FA active : il ne donne accès à rien tant que /auth/2fa/login-verify
// n'a pas validé le code TOTP (voir authMiddleware qui le rejette partout
// ailleurs).
export const generatePending2FAToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, pending2fa: true },
    env.jwtSecret,
    { expiresIn: '5m' }
  );
};

// Session d'impersonation : l'administrateur voit le site comme l'utilisateur, en LECTURE SEULE, pendant 15 minutes.
export const IMPERSONATION_MINUTES = 15;
export const generateImpersonationToken = (userId: string, email: string, adminId: string): string =>
  jwt.sign({ userId, email, impersonatedBy: adminId }, env.jwtSecret, { expiresIn: `${IMPERSONATION_MINUTES}m` });

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
