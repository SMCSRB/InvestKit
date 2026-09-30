import crypto from 'crypto';
import type { Request, Response, CookieOptions } from 'express';
import { env } from '../config/env';

// Session par cookie httpOnly (le jeton n'est plus lisible par le JavaScript de la page : un XSS ne peut plus le voler).
//
// - `ik_session` : le JWT, httpOnly, SameSite=Lax, Secure en production.
// - `ik_csrf`    : jeton anti-CSRF LISIBLE par la page, qu'elle renvoie dans l'en-tête `X-CSRF-Token` pour toute requête qui
//                  modifie des données. Il est dérivé du JWT par HMAC (clé dédiée) : il ne peut pas être forgé par un attaquant,
//                  même s'il parvient à déposer un cookie (injection depuis un sous-domaine).
// - Les clients sans navigateur (application mobile, scripts) continuent d'envoyer `Authorization: Bearer …` : pas de cookie
//   ambiant, donc pas de CSRF possible pour eux.

export const SESSION_COOKIE = 'ik_session';
export const CSRF_COOKIE = 'ik_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const csrfKey = crypto.createHash('sha256').update(`csrf:${env.jwtSecret}`).digest();

export const csrfTokenFor = (sessionJwt: string): string =>
  crypto.createHmac('sha256', csrfKey).update(sessionJwt).digest('hex');

// Durée du cookie alignée sur celle du JWT (« 7d », « 12h », « 30m » ou un nombre de secondes).
export const cookieMaxAgeMs = (expiresIn: string = env.jwtExpiresIn): number => {
  const m = /^(\d+)\s*([smhd]?)$/.exec(String(expiresIn).trim());
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2] as '' | 's' | 'm' | 'h' | 'd'];
  return n * unit * 1000;
};

const secure = (): boolean => (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : env.isProd);

const base = (): CookieOptions => ({
  sameSite: 'lax',
  secure: secure(),
  path: '/',
  maxAge: cookieMaxAgeMs(),
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
});

export const setSessionCookies = (res: Response, sessionJwt: string): void => {
  res.cookie(SESSION_COOKIE, sessionJwt, { ...base(), httpOnly: true });
  res.cookie(CSRF_COOKIE, csrfTokenFor(sessionJwt), { ...base(), httpOnly: false });
};

export const clearSessionCookies = (res: Response): void => {
  const { maxAge: _m, ...opts } = base();
  res.clearCookie(SESSION_COOKIE, { ...opts, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false });
};

// Lecture minimale du en-tête Cookie (évite une dépendance pour deux cookies).
export const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
};

export const isSafeMethod = (method: string): boolean => ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

export const csrfValid = (sessionJwt: string, provided: unknown): boolean => {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const expected = Buffer.from(csrfTokenFor(sessionJwt));
  const got = Buffer.from(provided);
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
};

// Défense en profondeur : une requête qui modifie des données, portée par le cookie, doit venir d'une origine autorisée
// quand le navigateur en indique une (en-tête Origin).
export const originAllowed = (req: Request): boolean => {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) return true;
  // Même hôte que l'API (proxy inverse sur un seul domaine).
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
};

// Faut-il encore renvoyer le jeton dans le corps des réponses de connexion ? (compatibilité : oui tant que tous les clients
// n'utilisent pas le cookie ; passer SESSION_TOKEN_IN_BODY=false ensuite.)
export const tokenInBody = (): boolean => process.env.SESSION_TOKEN_IN_BODY !== 'false';
