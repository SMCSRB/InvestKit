import { query } from '../utils/db';
import { hasProAccess } from '../utils/entitlements';
import { START_SCENARIOS } from '../config/cryptoMarketRules';
import { PERIOD_UNLOCK_MONTHS, GAME_MODES } from '../config/clockRules';
import { decideAccess, scenarioPlayed, AccessDecision } from '../engine/modeAccess';
import { parseDay } from '../engine/clock';

// Accès aux modes (Histoire, Bac à sable, En ligne) : le droit est TOUJOURS lu en base ; aucune option de la requête ne l'élargit.
// Architecture prévue (non codée) : les lectures d'En ligne (classement, événements) auront leurs propres routes en lecture seule, ouvertes à un compte
// gratuit (`readOnly`), séparées des routes de participation réservées au Pro ; ici, `live.readOnlyForFree` reste donc faux tant que ce n'est pas construit.
const isPro = async (userId: string): Promise<boolean> => {
  const u = (await query('SELECT subscription_tier, pro_override FROM users WHERE id = $1', [userId])).rows[0];
  return !!u && hasProAccess(u);
};
const unlocked = async (userId: string): Promise<string[]> =>
  (await query('SELECT scenario_id FROM played_periods WHERE user_id = $1 ORDER BY scenario_id', [userId])).rows.map((r: any) => r.scenario_id as string);

export const modeAccessService = {
  async check(userId: string, req: { mode: unknown; scenarioId?: string | null; customStart?: boolean }): Promise<AccessDecision> {
    return decideAccess({ mode: req.mode, pro: await isPro(userId), scenarioId: req.scenarioId, customStart: req.customStart, unlockedScenarios: await unlocked(userId) });
  },

  // Appelée par l'horloge Histoire après chaque avance : débloque la période de départ du joueur si elle a été assez jouée. Idempotent.
  async recordProgress(userId: string, startDay: string, currentDay: string): Promise<string | null> {
    const sc = START_SCENARIOS.find((s) => s.date === startDay);
    const start = parseDay(startDay), cur = parseDay(currentDay);
    if (!sc || start === null || cur === null || !scenarioPlayed(start, cur, PERIOD_UNLOCK_MONTHS)) return null;
    const r = await query('INSERT INTO played_periods (user_id, scenario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING scenario_id', [userId, sc.id]);
    return r.rows.length ? sc.id : null;
  },

  // Vue pour le navigateur (information seulement : le serveur re-vérifie à chaque action).
  async view(userId: string) {
    const pro = await isPro(userId);
    const open = await unlocked(userId);
    return {
      modes: GAME_MODES.map((m) => ({
        id: m,
        available: m === 'history',                                                   // Bac à sable et En ligne : règles d'accès prêtes, jeu pas encore construit
        access: m === 'history' ? 'all' : m === 'live' ? 'pro' : pro ? 'all' : 'played_periods',
        allowedForYou: decideAccess({ mode: m, pro, scenarioId: open[0] ?? null, unlockedScenarios: open }).allowed,
        ...(m === 'sandbox' ? { unlockedPeriods: open, anyPeriodAndStart: pro } : {}),
        ...(m === 'live' ? { readOnlyForFree: false } : {}),
      })),
      unlockAfterMonths: PERIOD_UNLOCK_MONTHS,
    };
  },
};
