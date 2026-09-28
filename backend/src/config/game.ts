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
