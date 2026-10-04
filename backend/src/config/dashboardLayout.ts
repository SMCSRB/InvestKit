// Blocs du tableau de bord et modèles de départ (6g, G4). Aucune interface ici : seulement les règles que le serveur vérifie.
// Un bloc retiré un jour du catalogue est simplement ignoré à la lecture (la disposition enregistrée reste valable).
export const DASHBOARD_WIDGETS = ['wealth', 'wallet', 'stocks', 'crypto', 'realEstate', 'bank', 'education', 'badges', 'leaderboard', 'market'] as const;
export type DashboardWidget = typeof DASHBOARD_WIDGETS[number];

// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : composition des trois modèles de départ (choix d'ergonomie, pas un fait).
export const DASHBOARD_TEMPLATES: Record<string, DashboardWidget[]> = {
  debutant: ['wealth', 'wallet', 'education', 'badges'],
  investisseur: ['wealth', 'wallet', 'stocks', 'crypto', 'market', 'leaderboard'],
  complet: ['wealth', 'wallet', 'stocks', 'crypto', 'realEstate', 'bank', 'education', 'badges', 'leaderboard', 'market'],
};
export const DEFAULT_TEMPLATE = 'debutant';
export const CUSTOM_TEMPLATE = 'personnalise';
export const MAX_LAYOUT_BYTES = 2000;   // VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER (garde-fou de taille)

export type LayoutCheck = { ok: true; widgets: DashboardWidget[] } | { ok: false; error: string };

// Liste de blocs : tableau de chaînes de la liste blanche, sans doublon, au moins un bloc. Rien d'autre n'est accepté.
export const validateWidgets = (input: unknown): LayoutCheck => {
  if (!Array.isArray(input)) return { ok: false, error: 'La disposition doit être une liste de blocs.' };
  if (input.length === 0) return { ok: false, error: 'Garde au moins un bloc.' };
  if (input.length > DASHBOARD_WIDGETS.length) return { ok: false, error: 'Trop de blocs.' };
  if (JSON.stringify(input).length > MAX_LAYOUT_BYTES) return { ok: false, error: 'Disposition trop grosse.' };
  const seen = new Set<string>();
  for (const w of input) {
    if (typeof w !== 'string' || !(DASHBOARD_WIDGETS as readonly string[]).includes(w)) return { ok: false, error: 'Bloc inconnu.' };
    if (seen.has(w)) return { ok: false, error: 'Un bloc ne peut apparaître qu\'une fois.' };
    seen.add(w);
  }
  return { ok: true, widgets: input as DashboardWidget[] };
};
