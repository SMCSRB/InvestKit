// Faits affichés sur l'accueil. Aucun chiffre n'est recopié dans les composants : un test compare CRYPTO_ASSET_COUNT au catalogue réel.

// Domaines ouverts aujourd'hui (l'ordre est celui de l'affichage).
export const AVAILABLE_DOMAINS = [
  { icon: 'building', name: 'Immobilier', sub: 'Achat à crédit, loyers, revente' },
  { icon: 'candles', name: 'Crypto', sub: 'Marché historique, graphique pro' },
  { icon: 'chart', name: 'Bourse et PEA', sub: 'Actions, ETF, fiscalité du PEA' },
];

// Nombre d'actifs du catalogue Crypto simulé (backend/src/data/crypto/catalog.ts).
export const CRYPTO_ASSET_COUNT = 110;

const WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];
export const countWord = (n) => WORDS[n] ?? String(n);

// InvestCoins offerts à l'activation du compte (backend/src/config/economy.ts : STARTING_CAPITAL ; un test compare les deux).
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const STARTING_COINS = 10000;

// Chiffres cités par le guide du site (app/lib/guide.js). Jamais recopiés dans le texte : un test les compare à backend/src/config/*.ts.
// VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER (récompenses, seuil de classement, courbe de niveaux : choix d'équilibrage).
export const DAILY_REWARD_COINS = 10;            // backend/src/config/economy.ts : DAILY_REWARD_COINS
export const DAILY_REWARD_MAX_DAYS = 3;          // backend/src/config/economy.ts : DAILY_REWARD_MAX_DAYS_PER_WEEK
export const RANKING_MIN_INVESTED = 2500;        // backend/src/config/economy.ts : RANKING_MIN_INVESTED
export const RANKING_MIN_ACTIVE_DAYS = 5;        // backend/src/config/economy.ts : RANKING_MIN_ACTIVE_DAYS
export const LEVEL_COUNT = 25;                   // backend/src/config/levelRules.ts : nombre de seuils de niveau
