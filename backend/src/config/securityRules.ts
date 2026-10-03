// Paramètres de sécurité réglables sans toucher à la logique. VALEURS DE JEU/PRODUIT, NON SOURCÉES, À RECONFIRMER :
// inspirées des recommandations OWASP (verrouillage temporaire plutôt que définitif, pour ne pas permettre de bloquer un compte à vie).
export const LOGIN_THROTTLE = {
  maxFailures: 8,              // échecs tolérés dans la fenêtre avant verrouillage (par compte, toutes adresses IP confondues)
  windowMinutes: 15,           // fenêtre de comptage
  baseLockMinutes: 15,         // première durée de verrouillage ; doublée à chaque verrouillage consécutif
  maxLockMinutes: 240,         // plafond (4 h)
  totpMaxFailures: 5,          // codes 2FA erronés tolérés avant verrouillage
};

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,              // au-delà, bcrypt ne lit de toute façon que 72 octets ; on borne pour éviter les abus
  common: ['password', 'motdepasse', 'azerty123', 'qwerty123', '12345678', '123456789', 'password1', 'motdepasse1', 'investkit', 'azertyuiop', 'iloveyou', 'azerty1234', 'qwertyuiop'],
};

// Réponses d'authentification à durée minimale constante : la durée ne doit pas révéler si une adresse a déjà un compte.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER (réglable par AUTH_MIN_RESPONSE_MS, bornée entre 0 et 3000 ms ; 0 en test).
export const AUTH_RESPONSE_LIMITS = { defaultMs: 700, maxMs: 3000 };
export const authMinResponseMs = (): number => {
  const raw = process.env.AUTH_MIN_RESPONSE_MS;
  const n = raw === undefined || raw === '' ? NaN : Number(raw);
  if (!Number.isFinite(n)) return AUTH_RESPONSE_LIMITS.defaultMs;
  return Math.min(AUTH_RESPONSE_LIMITS.maxMs, Math.max(0, n));
};

// Plafond d'e-mails automatiques par adresse (anti-harcèlement par boîte mail) : VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const MAIL_THROTTLE = { accountExists: { max: 1, windowMs: 60 * 60 * 1000 }, passwordReset: { max: 3, windowMs: 60 * 60 * 1000 }, welcome: { max: 1, windowMs: 24 * 60 * 60 * 1000, maxAttempts: 3, retryDelayMs: 5 * 60 * 1000 } };
// Mail de bienvenue : un envoi réussi par adresse et par jour ; en cas d'échec, 3 essais au plus, espacés d'au moins 5 minutes. VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
