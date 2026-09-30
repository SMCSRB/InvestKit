import { query } from './db';

// Un compte suspendu (users.disabled_at) est refusé par authMiddleware même avec un jeton encore valide.
// Petit cache (10 s) pour ne pas interroger la base à chaque requête ; invalidé immédiatement sur ce processus quand l'admin suspend ou réactive.
const TTL_MS = 10_000;
const cache = new Map<string, { disabled: boolean; at: number }>();

export const isDisabled = async (userId: string): Promise<boolean> => {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.disabled;
  const r = await query('SELECT disabled_at IS NOT NULL AS d FROM users WHERE id = $1', [userId]);
  const disabled = r.rows[0]?.d === true;
  cache.set(userId, { disabled, at: Date.now() });
  if (cache.size > 5000) cache.clear();
  return disabled;
};

export const invalidateUserStatus = (userId: string): void => { cache.delete(userId); };
export const clearUserStatusCache = (): void => cache.clear();
