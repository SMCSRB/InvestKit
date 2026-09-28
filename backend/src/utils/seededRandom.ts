// Générateur pseudo-aléatoire DÉTERMINISTE : même graine = même suite, sur
// n'importe quelle machine. Sert au catalogue fictif et, plus tard, aux
// événements aléatoires (le serveur reste seul maître du tirage).

// Hash de chaîne → entier 32 bits (FNV-1a).
export const hashString = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

// mulberry32 : petit générateur de qualité suffisante pour un jeu.
export const createRng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Valeur d'environ N(0, 1) (somme de 3 tirages uniformes recentrée).
export const approxGaussian = (rng: () => number): number => (rng() + rng() + rng() - 1.5) * 2;
