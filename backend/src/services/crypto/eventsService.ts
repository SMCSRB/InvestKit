import type { Queryable } from '../../repositories/investcoinsRepository';
import { query } from '../../utils/db';
import { notify } from '../notificationService';
import { makeRng } from '../../engine/risk/monteCarlo';
import { HISTORIC_EVENTS, EVENT_KIND_LABEL, RANDOM_EVENTS, RANDOM_EVENT_PARAMS, RandomKind } from '../../data/crypto/events';

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Hachage FNV-1a 32 bits : graine déterministe par (joueur, jour).
const seedOf = (s: string): number => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };

// Événement aléatoire d'un jour pour un joueur : déterministe (mêmes joueur et jour → même résultat), indépendant des actions du joueur.
export const randomEventOn = (userId: string, dayMs: number): RandomKind | null => {
  const u = makeRng(seedOf(`${userId}|${isoDay(dayMs)}`)).uniform();
  if (u < RANDOM_EVENT_PARAMS.outageProbPerDay) return 'outage';
  if (u < RANDOM_EVENT_PARAMS.outageProbPerDay + RANDOM_EVENT_PARAMS.volatilityProbPerDay) return 'volatility';
  return null;
};

// Effets actifs à la date simulée : un incident dure 1 jour, un épisode de volatilité 3 jours. Jamais d'effet avant la date de départ du joueur.
export const activeEffects = (userId: string, simMs: number, startMs: number): { outage: boolean; stress: number } => {
  let outage = false, stress = 1;
  for (let k = 0; k < 3; k++) {
    const day = Math.floor(simMs / DAY) * DAY - k * DAY;
    if (day < startMs) break;
    const kind = randomEventOn(userId, day);
    if (kind === 'outage' && k < RANDOM_EVENTS.outage.durationDays) outage = true;
    if (kind === 'volatility' && k < RANDOM_EVENTS.volatility.durationDays) stress = RANDOM_EVENT_PARAMS.volatilityMultiplier;
  }
  return { outage, stress };
};

// Appelé quand l'horloge avance de fromMs à toMs (dans la transaction d'avance) : enregistre et notifie les événements franchis.
export const processEvents = async (db: Queryable, userId: string, fromMs: number, toMs: number) => {
  const out: { key: string; date: string; kind: string; title: string }[] = [];
  const record = async (e: { key: string; date: string; origin: 'historic' | 'random'; kind: string; title: string; message: string; lesson: string }) => {
    const r = await db.query(
      `INSERT INTO crypto_event_log (user_id, event_key, sim_date, origin, kind, title, message, lesson) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [userId, e.key, e.date, e.origin, e.kind, e.title, e.message, e.lesson]);
    if (r.rowCount) {
      out.push({ key: e.key, date: e.date, kind: e.kind, title: e.title });
      await notify(db, userId, { kind: 'crypto_event', title: e.title, body: `${e.message} ${e.lesson}`, link: '/crypto' });
    }
  };
  // Les événements historiques : datés à minuit UTC ; franchis si fromMs < date ≤ toMs... un événement du jour J est visible dès que J est terminé.
  for (const h of HISTORIC_EVENTS) {
    const t = Date.parse(h.date + 'T00:00:00Z');
    if (t + DAY > fromMs && t + DAY <= toMs) await record({ ...h, origin: 'historic', kind: h.kind });
  }
  for (let t = Math.floor(fromMs / DAY) * DAY; t < toMs; t += DAY) {
    if (t + DAY <= fromMs) continue;
    const kind = randomEventOn(userId, t);
    if (!kind) continue;
    const def = RANDOM_EVENTS[kind];
    await record({ key: `rnd-${isoDay(t)}-${kind}`, date: isoDay(t), origin: 'random', kind, title: def.title, message: def.message, lesson: def.lesson });
  }
  return out;
};

export const eventsService = {
  async list(userId: string, limit = 50) {
    const rows = (await query(
      `SELECT event_key, sim_date, origin, kind, title, message, lesson FROM crypto_event_log WHERE user_id = $1 ORDER BY sim_date DESC, created_at DESC LIMIT $2`, [userId, limit])).rows;
    return rows.map((r: any) => ({ key: r.event_key, date: new Date(r.sim_date).toISOString().slice(0, 10), origin: r.origin, kind: r.kind, kindLabel: (EVENT_KIND_LABEL as any)[r.kind] ?? (r.kind === 'outage' ? 'Incident' : r.kind === 'volatility' ? 'Volatilité' : r.kind), title: r.title, message: r.message, lesson: r.lesson }));
  },
};
