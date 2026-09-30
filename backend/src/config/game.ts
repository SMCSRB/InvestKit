// Paramètres d'équilibrage du jeu, modifiables sans toucher à la logique.

// Capital minimum (en InvestCoins) engagé dans un domaine pour apparaître au
// classement. Sans seuil, acheter pour 1 🪙 une crypto qui fait x100 donnerait
// +10 000 % et écraserait tout le monde : un pourcentage n'a de sens que sur
// un capital significatif.
export const MIN_RANKED_CAPITAL = 100;

export const LEADERBOARD_SIZE = 20;

// Garde-fous de validation des ordres (l'entrée vient du client : on ne lui
// fait jamais confiance).
export const MAX_TRADE_QUANTITY = 1_000_000_000;
export const MAX_QUANTITY_DECIMALS = 8;

// Capital de départ : 500 🪙 offerts à l'activation du compte. Un abonné Pro démarre avec environ le double :
// un complément unique (une seule fois par compte, même après résiliation puis réabonnement) est versé au premier
// passage en Pro. VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : multiplicateur configurable ici.
export const STARTING_CAPITAL = 500;
export const PRO_STARTING_CAPITAL_MULTIPLIER = 2;
export const proStartingBonus = (): number => Math.max(0, Math.round(STARTING_CAPITAL * (PRO_STARTING_CAPITAL_MULTIPLIER - 1)));
