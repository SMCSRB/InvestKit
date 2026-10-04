// Visite guidée : listes FERMÉES des visites, états, rubriques et étapes que le serveur accepte d'enregistrer.
// Les identifiants d'étapes sont ceux de app/lib/tour/steps.js (un test compare les deux : ils ne peuvent pas diverger).
export const GUIDE_TOURS = ['main', 'bourse', 'crypto', 'immobilier', 'banque'] as const;
export type GuideTour = (typeof GUIDE_TOURS)[number];

// new : jamais lancée · running : en cours · paused : quittée en route (on peut reprendre) · done : terminée · dismissed : invitation refusée (on ne la reproposera pas)
export const GUIDE_STATUSES = ['new', 'running', 'paused', 'done', 'dismissed'] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];

// Rubriques du panneau « Mon parcours de découverte » : une rubrique est « vue » quand le joueur est passé au bout de ses étapes.
export const GUIDE_SECTIONS = ['dashboard', 'bourse', 'crypto', 'immobilier', 'banque', 'education', 'classements', 'profil', 'retour'] as const;

export const GUIDE_STEP_IDS: readonly string[] = [
  'welcome', 'dash-patrimoine', 'dash-liquidites', 'dash-recompense', 'dash-prochaine',
  'go-bourse', 'bourse-temps', 'bourse-apercu', 'bourse-onglets',
  'go-crypto', 'crypto-depart', 'crypto-date', 'crypto-semaine', 'crypto-modes', 'crypto-fiche', 'crypto-achat',
  'go-immobilier', 'immo-depart', 'immo-onglets', 'immo-temps',
  'go-banque', 'banque-intro', 'banque-chiffres', 'banque-prets',
  'go-education', 'education-cours',
  'go-classements', 'classements-domaine', 'classements-rang',
  'go-profil', 'profil-confidentialite',
  'retour-bouton',
];

export const MAX_SEEN_PER_REQUEST = 12;
