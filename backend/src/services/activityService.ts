import { query } from '../utils/db';

// Jours actifs : un jour (UTC) compte dès que le joueur utilise le site (une requête authentifiée de sa part).
// Le compteur ne baisse jamais (garde-fou en base : migration 044), n'est lié à aucune récompense et n'a aucune échéance :
// manquer un jour ne retire rien. Il sert seulement de repère (par exemple pour entrer au classement).
// Une session d'impersonation par l'administration ne compte pas (c'est lui qui regarde, pas le joueur).
const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

// Un seul écrit par joueur et par jour et par processus : la requête qui suit est de toute façon sans effet si le jour est déjà compté.
const seen = new Map<string, string>();

export const recordActiveDay = async (userId: string, now: Date = new Date()): Promise<void> => {
  const day = dayKey(now);
  if (seen.get(userId) === day) return;
  try {
    // Atomique : deux requêtes simultanées ne comptent le jour qu'une fois (la seconde ne trouve plus « jour différent »).
    await query(
      `UPDATE users SET active_days = active_days + 1, last_active_day = $2::date
       WHERE id = $1 AND last_active_day IS DISTINCT FROM $2::date`,
      [userId, day]
    );
    seen.set(userId, day);
    if (seen.size > 5000) seen.clear();
  } catch {
    // Ne jamais gêner une requête du joueur pour un compteur.
  }
};

export const getActiveDays = async (userId: string, db: { query: typeof query } = { query }): Promise<number> => {
  const r = await db.query('SELECT active_days FROM users WHERE id = $1', [userId]);
  return Number(r.rows[0]?.active_days ?? 0);
};

export const clearActiveDayCache = (): void => seen.clear();
