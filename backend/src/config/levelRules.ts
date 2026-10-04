// Niveaux et titres d'XP (6a). VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER : la courbe sera ajustée quand l'Éducation sera refaite
// (plus de contenu = plus d'XP à gagner), pour que tout le parcours mène aux niveaux « Stratège » et « Expert ».
// Courbe progressive : l'XP cumulée nécessaire pour ATTEINDRE le niveau n est LEVEL_THRESHOLDS[n - 1].
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
  4000, 5000, 6200, 7600, 9200, 11000, 13000, 15300, 17800, 20600,
  23600, 26900, 30500, 34400, 38600,
];
// Un titre par palier : il vaut à partir du niveau `from`.
export const LEVEL_TITLES: readonly { from: number; title: string }[] = [
  { from: 1, title: 'Curieux' }, { from: 3, title: 'Apprenti' }, { from: 5, title: 'Initié' }, { from: 8, title: 'Investisseur' },
  { from: 12, title: 'Stratège' }, { from: 18, title: 'Expert' }, { from: 25, title: 'Maître' },
];

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  xpIntoLevel: number;        // XP gagnée depuis le début du niveau courant
  xpForNext: number | null;   // XP à gagner pour le niveau suivant (null au niveau maximum)
  nextLevel: number | null;
  nextTitle: string | null;   // titre du prochain palier (null s'il n'y en a plus)
}

export const titleForLevel = (level: number): string => {
  let t = LEVEL_TITLES[0].title;
  for (const p of LEVEL_TITLES) if (level >= p.from) t = p.title;
  return t;
};

export const levelInfo = (xpRaw: number): LevelInfo => {
  const xp = Number.isFinite(xpRaw) ? Math.max(0, Math.floor(xpRaw)) : 0;
  let level = 1;
  for (let n = 1; n <= LEVEL_THRESHOLDS.length; n++) if (xp >= LEVEL_THRESHOLDS[n - 1]) level = n;
  const max = level >= LEVEL_THRESHOLDS.length;
  const next = LEVEL_TITLES.find((p) => p.from > level) ?? null;
  return {
    level, title: titleForLevel(level), xp, xpIntoLevel: xp - LEVEL_THRESHOLDS[level - 1],
    xpForNext: max ? null : LEVEL_THRESHOLDS[level] - xp, nextLevel: max ? null : level + 1, nextTitle: next ? next.title : null,
  };
};

// Plafonds quotidiens d'XP par source (jour UTC). Au-delà : l'action reste possible, elle ne rapporte plus d'XP ce jour-là, sans erreur.
// Les sources absentes n'ont pas de plafond propre (ex. quiz de chapitre : déjà une seule fois par chapitre côté serveur).
// VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER.
export const XP_DAILY_CAPS: Readonly<Record<string, number>> = {
  lesson: 300,
  mini_question: 100,
};

export const XP_DOMAINS = ['education', 'bourse', 'crypto', 'immobilier', 'banque', 'communaute'] as const;
export type XpDomain = (typeof XP_DOMAINS)[number];
