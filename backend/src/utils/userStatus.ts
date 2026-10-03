import { query } from './db';

// Un compte suspendu (users.disabled_at) est refusé par authMiddleware même avec un jeton encore valide.
// Petit cache (10 s) pour ne pas interroger la base à chaque requête ; invalidé immédiatement sur ce processus quand l'admin suspend ou réactive.
const TTL_MS = 10_000;
const cache = new Map<string, { disabled: boolean; gone: boolean; at: number }>();

// État du compte derrière un jeton : suspendu, ou DISPARU (compte supprimé : un jeton encore valide ne doit plus rien ouvrir).
export const userStatus = async (userId: string): Promise<{ disabled: boolean; gone: boolean }> => {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const r = await query('SELECT disabled_at IS NOT NULL AS d FROM users WHERE id = $1', [userId]);
  const status = { disabled: r.rows[0]?.d === true, gone: r.rows.length === 0, at: Date.now() };
  cache.set(userId, status);
  if (cache.size > 5000) cache.clear();
  return status;
};
export const isDisabled = async (userId: string): Promise<boolean> => (await userStatus(userId)).disabled;

export const invalidateUserStatus = (userId: string): void => { cache.delete(userId); };
export const clearUserStatusCache = (): void => cache.clear();
