import { GameMode, GAME_MODES } from '../config/clockRules';

// Règles d'accès aux modes de jeu : PURES (aucune base, aucune horloge), testées à fond. Le droit Pro est fourni par le serveur après lecture en base.
export interface AccessInput { mode: unknown; pro: boolean; scenarioId?: string | null; unlockedScenarios: string[]; customStart?: boolean }
export type AccessDecision = { allowed: true } | { allowed: false; code: 'UNKNOWN_MODE' | 'PRO_REQUIRED' | 'PERIOD_LOCKED'; message: string };

export const isGameMode = (v: unknown): v is GameMode => typeof v === 'string' && (GAME_MODES as readonly string[]).includes(v);

export const decideAccess = (i: AccessInput): AccessDecision => {
  if (!isGameMode(i.mode)) return { allowed: false, code: 'UNKNOWN_MODE', message: 'Mode de jeu inconnu.' };
  if (i.mode === 'history') return { allowed: true };
  if (i.mode === 'live') return i.pro ? { allowed: true } : { allowed: false, code: 'PRO_REQUIRED', message: 'Le mode En ligne est réservé au plan Pro.' };
  // Bac à sable
  if (i.pro) return { allowed: true };
  if (i.customStart) return { allowed: false, code: 'PRO_REQUIRED', message: 'Choisir librement la période et la date de départ est réservé au plan Pro.' };
  if (!i.scenarioId || !i.unlockedScenarios.includes(i.scenarioId)) return { allowed: false, code: 'PERIOD_LOCKED', message: 'Cette période se débloque en jouant son scénario en mode Histoire.' };
  return { allowed: true };
};

// Un scénario est débloqué quand la partie Histoire a avancé d'au moins `months` mois depuis son départ.
export const scenarioPlayed = (startMs: number, currentMs: number, months: number): boolean => {
  const s = new Date(startMs), c = new Date(currentMs);
  const diff = (c.getUTCFullYear() - s.getUTCFullYear()) * 12 + (c.getUTCMonth() - s.getUTCMonth()) - (c.getUTCDate() < s.getUTCDate() ? 1 : 0);
  return diff >= months;
};
