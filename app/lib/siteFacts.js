// Faits affichés sur l'accueil. Aucun chiffre n'est recopié dans les composants.

// Domaines ouverts aujourd'hui (l'ordre est celui de l'affichage).
export const AVAILABLE_DOMAINS = [
  { icon: 'building', name: 'Immobilier', sub: 'Achat à crédit, loyers, revente' },
  { icon: 'candles', name: 'Crypto', sub: 'Marché historique, graphique pro' },
  { icon: 'chart', name: 'Bourse et PEA', sub: 'Actions, ETF, fiscalité du PEA' },
];

// Aucun nombre d'actifs Crypto n'est annoncé sur l'accueil : le catalogue en prévoit ~110, mais seuls ceux dont les cours réels sont importés apparaissent dans le jeu (aujourd'hui une poignée).

const WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];
export const countWord = (n) => WORDS[n] ?? String(n);

// InvestCoins offerts à l'activation du compte (backend/src/config/economy.ts : STARTING_CAPITAL ; un test compare les deux).
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const STARTING_COINS = 10000;

// Chiffres cités par le site (accueil, connexion) ; la visite guidée n'en écrit aucun en dur. Jamais recopiés dans le texte : un test les compare à backend/src/config/*.ts.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER (récompenses, seuil de classement, courbe de niveaux : choix d'équilibrage).
export const DAILY_REWARD_COINS = 10;            // backend/src/config/economy.ts : DAILY_REWARD_COINS
export const DAILY_REWARD_MAX_DAYS = 3;          // backend/src/config/economy.ts : DAILY_REWARD_MAX_DAYS_PER_WEEK
export const RANKING_MIN_INVESTED = 2500;        // backend/src/config/economy.ts : RANKING_MIN_INVESTED
export const RANKING_MIN_ACTIVE_DAYS = 5;        // backend/src/config/economy.ts : RANKING_MIN_ACTIVE_DAYS
export const LEVEL_COUNT = 25;                   // backend/src/config/levelRules.ts : nombre de seuils de niveau
