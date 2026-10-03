// Paramètres d'équilibrage du jeu, modifiables sans toucher à la logique.

export const LEADERBOARD_SIZE = 20;

// Garde-fous de validation des ordres (l'entrée vient du client : on ne lui
// fait jamais confiance).
export const MAX_TRADE_QUANTITY = 1_000_000_000;
export const MAX_QUANTITY_DECIMALS = 8;

// XP d'éducation fixée par le serveur (le client ne la fournit plus). VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : mêmes valeurs que l'interface (100 par chapitre, 500 par domaine).
export const EDUCATION_CHAPTER_XP = 100;
export const EDUCATION_DOMAIN_XP = 500;
