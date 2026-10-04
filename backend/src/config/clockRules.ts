// Limites de l'horloge de jeu (6c). VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : garde-fous de charge du serveur, pas des faits.
export const MAX_ADVANCE_DAYS = 366;     // plafond d'une avance « jusqu'au prochain événement »
export const MAX_ADVANCE_MONTHS = 12;    // plafond d'une avance en mois (ancien bouton de l'Immobilier)

// ── Accès aux modes de jeu (décisions d'Andreja, 4 octobre 2026) ─────────────
// Histoire : tous. En ligne : Pro seulement. Bac à sable : tous, mais un compte gratuit est limité aux périodes déjà jouées en Histoire ;
// le choix libre de la période et de la date de départ est réservé au Pro. Tout est vérifié par le serveur (droit lu en base).
export type GameMode = 'history' | 'sandbox' | 'live';
export const GAME_MODES: readonly GameMode[] = ['history', 'sandbox', 'live'];
// Une période (scénario de départ) est « jouée » quand le joueur a fait avancer sa partie Histoire d'au moins ce nombre de mois depuis ce départ.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER (règle exacte à fixer avec le scénario).
export const PERIOD_UNLOCK_MONTHS = 12;

// Modes réellement jouables aujourd'hui (l'accès est prêt pour les trois, le jeu n'existe que pour Histoire). Le guide du site s'appuie sur cette liste : un test les compare.
export const MODE_AVAILABILITY: Record<GameMode, boolean> = { history: true, sandbox: false, live: false };
