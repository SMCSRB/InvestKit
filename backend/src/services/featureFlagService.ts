import crypto from 'crypto';
import { query } from '../utils/db';

// Drapeaux de fonctionnalité (table feature_flags) : activer/désactiver une fonction sans redéployer, ou la déployer progressivement.
// Règle : `enabled` est l'interrupteur général ; `rollout_percentage` (0-100) limite à une part des utilisateurs, répartie de façon stable
// (même utilisateur = même résultat) par une empreinte de « clé + identifiant ». enabled=false → personne. 100 → tout le monde.
export interface FlagRow { key: string; enabled: boolean; description: string | null; rollout_percentage: number; updated_at: Date }

export const bucketOf = (key: string, userId: string): number => {
  const h = crypto.createHash('sha256').update(`${key}:${userId}`).digest();
  return h.readUInt32BE(0) % 100;
};

export const evaluateFlag = (flag: Pick<FlagRow, 'key' | 'enabled' | 'rollout_percentage'>, userId?: string): boolean => {
  if (!flag.enabled) return false;
  if (flag.rollout_percentage >= 100) return true;
  if (flag.rollout_percentage <= 0 || !userId) return false;
  return bucketOf(flag.key, userId) < flag.rollout_percentage;
};

const KEY_RE = /^[a-z][a-z0-9_]{1,63}$/;
export class FlagError extends Error { constructor(public code: 'INVALID_INPUT' | 'NOT_FOUND', message: string) { super(message); this.name = 'FlagError'; } }

let cache: { at: number; rows: FlagRow[] } | null = null;
const TTL_MS = 15_000;
export const clearFlagCache = (): void => { cache = null; };

const loadAll = async (): Promise<FlagRow[]> => {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = (await query('SELECT key, enabled, description, rollout_percentage, updated_at FROM feature_flags ORDER BY key')).rows as FlagRow[];
  cache = { at: Date.now(), rows };
  return rows;
};

export const featureFlagService = {
  async list(): Promise<FlagRow[]> { clearFlagCache(); return loadAll(); },

  // Drapeaux évalués pour un utilisateur : { clé: vrai/faux }. Un drapeau inconnu est faux.
  async forUser(userId: string): Promise<Record<string, boolean>> {
    const out: Record<string, boolean> = {};
    for (const f of await loadAll()) out[f.key] = evaluateFlag(f, userId);
    return out;
  },

  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const f = (await loadAll()).find((x) => x.key === key);
    return f ? evaluateFlag(f, userId) : false;
  },

  async upsert(input: { key: unknown; enabled: unknown; rolloutPercentage?: unknown; description?: unknown }): Promise<FlagRow> {
    if (typeof input.key !== 'string' || !KEY_RE.test(input.key)) throw new FlagError('INVALID_INPUT', 'Clé invalide : minuscules, chiffres et _ (2 à 64 caractères, commence par une lettre)');
    if (typeof input.enabled !== 'boolean') throw new FlagError('INVALID_INPUT', '« enabled » doit être vrai ou faux');
    const pct = input.rolloutPercentage === undefined ? 100 : input.rolloutPercentage;
    if (typeof pct !== 'number' || !Number.isInteger(pct) || pct < 0 || pct > 100) throw new FlagError('INVALID_INPUT', 'Pourcentage invalide (entier de 0 à 100)');
    const desc = input.description === undefined || input.description === null ? null : String(input.description).slice(0, 300);
    const r = await query(
      `INSERT INTO feature_flags (key, enabled, description, rollout_percentage, updated_at) VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, rollout_percentage = EXCLUDED.rollout_percentage,
         description = COALESCE(EXCLUDED.description, feature_flags.description), updated_at = NOW()
       RETURNING key, enabled, description, rollout_percentage, updated_at`,
      [input.key, input.enabled, desc, pct]
    );
    clearFlagCache();
    return r.rows[0];
  },

  async remove(key: unknown): Promise<void> {
    if (typeof key !== 'string' || !KEY_RE.test(key)) throw new FlagError('INVALID_INPUT', 'Clé invalide');
    const r = await query('DELETE FROM feature_flags WHERE key = $1', [key]);
    if (!r.rowCount) throw new FlagError('NOT_FOUND', 'Drapeau introuvable');
    clearFlagCache();
  },
};
