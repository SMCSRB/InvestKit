// Horloge de jeu : calculs de dates PURS (aucun accès à la base, aucune horloge système), pour pouvoir les tester à fond.
// Toutes les dates sont des jours entiers en UTC (millisecondes à minuit UTC) : le jeu avance par jours.
export const DAY_MS = 86_400_000;
export const CLOCK_STEPS = ['day', 'week', 'month', 'quarter', 'year'] as const;
export type ClockStep = (typeof CLOCK_STEPS)[number];

export const isClockStep = (v: unknown): v is ClockStep => typeof v === 'string' && (CLOCK_STEPS as readonly string[]).includes(v);

export const parseDay = (s: unknown): number | null => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && dayString(t) === s ? t : null;
};
export const dayString = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// Même quantième n mois plus tard, ramené à la fin du mois si besoin (31 janvier + 1 mois = 28 ou 29 février).
export const addMonthsMs = (ms: number, n: number): number => {
  const d = new Date(ms);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n;
  const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d.getUTCDate(), dim));
};

export const addStepMs = (ms: number, step: ClockStep): number => {
  switch (step) {
    case 'day': return ms + DAY_MS;
    case 'week': return ms + 7 * DAY_MS;
    case 'month': return addMonthsMs(ms, 1);
    case 'quarter': return addMonthsMs(ms, 3);
    case 'year': return addMonthsMs(ms, 12);
  }
};

export const yearOf = (ms: number): number => new Date(ms).getUTCFullYear();
export const monthOf = (ms: number): number => new Date(ms).getUTCMonth() + 1;
// Numéro de mois absolu (année × 12 + mois, mois de 1 à 12), utile pour comparer deux dates au mois près.
export const monthIndex = (ms: number): number => yearOf(ms) * 12 + monthOf(ms);

// Découpage d'une avancée en sous-pas : chaque 1er du mois franchi, puis la date cible. Les domaines sont avancés sous-pas par sous-pas,
// dans l'ordre chronologique, pour que l'argent partagé (loyers, ordres, prêts) soit traité dans le bon ordre.
export const chunkEnds = (fromMs: number, toMs: number): number[] => {
  if (!(toMs > fromMs)) return [];
  const ends: number[] = [];
  const d = new Date(fromMs);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  while (t < toMs) { ends.push(t); const x = new Date(t); t = Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1); }
  ends.push(toMs);
  return ends;
};

// Dernier jour jouable : le plus petit des plafonds des domaines (fin des données Crypto importées, dernière année de la Bourse et de l'Immobilier).
export const lastPlayableDay = (caps: (number | null | undefined)[]): number | null => {
  const ok = caps.filter((c): c is number => typeof c === 'number' && Number.isFinite(c));
  return ok.length ? Math.min(...ok) : null;
};
