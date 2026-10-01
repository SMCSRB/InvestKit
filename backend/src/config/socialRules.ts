// Règles du social (amis, guildes). VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : plafonds choisis pour limiter l'abus, modifiables ici.
export const SOCIAL = {
  maxFriends: 100,
  maxPendingOut: 20,        // demandes envoyées en attente
  maxPendingIn: 50,         // demandes reçues en attente (anti-harcèlement)
  guildMembersMax: 30,
  guildNameMin: 3,
  guildNameMax: 24,
  guildDescMax: 140,
  xpPerLevel: 500,          // même règle que le niveau d'éducation affiché dans l'interface (EducationContext)
} as const;

export const levelFromXp = (xp: number): number => Math.floor(Math.max(0, xp) / SOCIAL.xpPerLevel) + 1;
