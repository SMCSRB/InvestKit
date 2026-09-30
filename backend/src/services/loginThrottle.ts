import crypto from 'crypto';
import { query } from '../utils/db';
import { LOGIN_THROTTLE } from '../config/securityRules';

// Verrouillage temporaire par compte (anti credential-stuffing / force brute distribuée).
// La limite par adresse IP (express-rate-limit) ne voit pas une attaque répartie sur de nombreuses IP : celle-ci compte les échecs
// PAR COMPTE. La clé est l'empreinte de l'e-mail, y compris pour un e-mail inconnu : le comportement est identique, aucun compte n'est révélé.

const hashKey = (key: string): string => crypto.createHash('sha256').update(key.trim().toLowerCase()).digest('hex');

export interface LockState { locked: boolean; retryAfterSeconds: number }

export const checkLock = async (key: string): Promise<LockState> => {
  const r = await query(
    `SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (locked_until - NOW()))))::int AS s FROM login_throttle WHERE key_hash = $1 AND locked_until > NOW()`,
    [hashKey(key)]
  );
  const s = r.rows[0]?.s ?? 0;
  return { locked: s > 0, retryAfterSeconds: s };
};

// Enregistre un échec ; renvoie true si CET échec vient de déclencher un verrouillage.
export const recordFailure = async (key: string, maxFailures: number = LOGIN_THROTTLE.maxFailures): Promise<boolean> => {
  const h = hashKey(key);
  const r = await query(
    `INSERT INTO login_throttle (key_hash, failures, window_started_at, updated_at) VALUES ($1, 1, NOW(), NOW())
     ON CONFLICT (key_hash) DO UPDATE SET
       failures = CASE WHEN login_throttle.window_started_at < NOW() - make_interval(mins => $2) THEN 1 ELSE login_throttle.failures + 1 END,
       window_started_at = CASE WHEN login_throttle.window_started_at < NOW() - make_interval(mins => $2) THEN NOW() ELSE login_throttle.window_started_at END,
       updated_at = NOW()
     RETURNING failures`,
    [h, LOGIN_THROTTLE.windowMinutes]
  );
  if (r.rows[0].failures < maxFailures) return false;
  // Seuil atteint : verrouillage, durée doublée à chaque verrouillage consécutif (plafonnée), compteur remis à zéro.
  await query(
    `UPDATE login_throttle SET
       lock_count = lock_count + 1,
       locked_until = NOW() + make_interval(mins => LEAST($2::int, $3::int * (2 ^ LEAST(lock_count, 10))::int)),
       failures = 0, window_started_at = NOW(), updated_at = NOW()
     WHERE key_hash = $1`,
    [h, LOGIN_THROTTLE.maxLockMinutes, LOGIN_THROTTLE.baseLockMinutes]
  );
  return true;
};

export const recordSuccess = async (key: string): Promise<void> => {
  await query('DELETE FROM login_throttle WHERE key_hash = $1', [hashKey(key)]);
};

// Nettoyage des lignes anciennes (à appeler périodiquement ou à l'occasion).
export const purgeOldThrottle = async (): Promise<number> => {
  const r = await query(`DELETE FROM login_throttle WHERE updated_at < NOW() - INTERVAL '7 days' AND (locked_until IS NULL OR locked_until < NOW())`);
  return r.rowCount ?? 0;
};
