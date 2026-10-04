import { query, getClient } from '../utils/db';
import { GUIDE_TOURS, GUIDE_STATUSES, GUIDE_SECTIONS, GUIDE_STEP_IDS, MAX_SEEN_PER_REQUEST, GuideTour, GuideStatus } from '../config/guideRules';

export class GuideError extends Error { constructor(message: string) { super(message); this.name = 'GuideError'; } }

export interface TourState { status: GuideStatus; step: string | null }
export interface GuideState { tours: Record<GuideTour, TourState>; seen: string[] }

const empty = (): GuideState => ({
  tours: Object.fromEntries(GUIDE_TOURS.map((t) => [t, { status: 'new', step: null }])) as Record<GuideTour, TourState>,
  seen: [],
});

// Lit ce qui est en base en ignorant tout ce qui ne fait pas partie des listes fermées (jamais de confiance aveugle, même envers nos propres anciennes données).
export const normalize = (raw: any): GuideState => {
  const out = empty();
  const tours = raw && typeof raw === 'object' ? raw.tours : null;
  if (tours && typeof tours === 'object') {
    for (const t of GUIDE_TOURS) {
      const s = tours[t];
      if (s && typeof s === 'object' && (GUIDE_STATUSES as readonly string[]).includes(s.status)) {
        out.tours[t] = { status: s.status, step: typeof s.step === 'string' && GUIDE_STEP_IDS.includes(s.step) ? s.step : null };
      }
    }
  }
  if (raw && Array.isArray(raw.seen)) out.seen = GUIDE_SECTIONS.filter((x) => raw.seen.includes(x));
  return out;
};

export interface GuidePatch { tour?: unknown; status?: unknown; step?: unknown; seen?: unknown }

const parse = (p: GuidePatch) => {
  if (p === null || typeof p !== 'object') throw new GuideError('Requête invalide');
  const out: { tour?: GuideTour; status?: GuideStatus; step?: string | null; seen?: string[] } = {};
  if (p.tour !== undefined) {
    if (typeof p.tour !== 'string' || !(GUIDE_TOURS as readonly string[]).includes(p.tour)) throw new GuideError('Visite inconnue');
    out.tour = p.tour as GuideTour;
  }
  if (p.status !== undefined) {
    if (typeof p.status !== 'string' || !(GUIDE_STATUSES as readonly string[]).includes(p.status)) throw new GuideError('État inconnu');
    out.status = p.status as GuideStatus;
  }
  if (p.step !== undefined) {
    if (p.step !== null && (typeof p.step !== 'string' || !GUIDE_STEP_IDS.includes(p.step))) throw new GuideError('Étape inconnue');
    out.step = p.step as string | null;
  }
  if (p.seen !== undefined) {
    if (!Array.isArray(p.seen) || p.seen.length > MAX_SEEN_PER_REQUEST || p.seen.some((x) => typeof x !== 'string' || !(GUIDE_SECTIONS as readonly string[]).includes(x))) throw new GuideError('Rubrique inconnue');
    out.seen = p.seen as string[];
  }
  if ((out.status !== undefined || out.step !== undefined) && out.tour === undefined) throw new GuideError('Précise la visite concernée');
  if (out.tour === undefined && out.seen === undefined) throw new GuideError('Rien à enregistrer');
  return out;
};

export const guideService = {
  async get(userId: string): Promise<GuideState> {
    const r = (await query('SELECT state FROM guide_progress WHERE user_id = $1', [userId])).rows[0];
    return normalize(r?.state);
  },

  // Enregistre un changement (état d'une visite, étape atteinte, rubriques vues). Le verrou du joueur évite qu'un second onglet écrase le premier :
  // les rubriques vues s'additionnent (jamais retirées), le reste prend la dernière valeur.
  async patch(userId: string, patch: GuidePatch): Promise<GuideState> {
    const p = parse(patch);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`guide:${userId}`]);
      const cur = normalize((await client.query('SELECT state FROM guide_progress WHERE user_id = $1', [userId])).rows[0]?.state);
      if (p.tour) {
        const t = cur.tours[p.tour];
        const status = p.status ?? t.status;
        // Une visite terminée n'a plus d'étape en cours.
        const step = status === 'done' || status === 'new' || status === 'dismissed' ? null : (p.step !== undefined ? p.step : t.step);
        cur.tours[p.tour] = { status, step };
      }
      if (p.seen) cur.seen = GUIDE_SECTIONS.filter((x) => cur.seen.includes(x) || p.seen!.includes(x));
      await client.query(
        `INSERT INTO guide_progress (user_id, state) VALUES ($1, $2::jsonb)
         ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`, [userId, JSON.stringify(cur)]);
      await client.query('COMMIT');
      return cur;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  },

  // Tout recommencer (une visite ou tout) : « Mon parcours de découverte » repart de zéro.
  async reset(userId: string, scope: unknown): Promise<GuideState> {
    if (scope !== 'all' && !(typeof scope === 'string' && (GUIDE_TOURS as readonly string[]).includes(scope))) throw new GuideError('Visite inconnue');
    const cur = await this.get(userId);
    const next = scope === 'all' ? empty() : { ...cur, tours: { ...cur.tours, [scope as GuideTour]: { status: 'new' as GuideStatus, step: null } } };
    await query(
      `INSERT INTO guide_progress (user_id, state) VALUES ($1, $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`, [userId, JSON.stringify(next)]);
    return next;
  },
};
