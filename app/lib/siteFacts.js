// Faits affichés sur l'accueil. Aucun chiffre n'est recopié dans les composants : un test compare CRYPTO_ASSET_COUNT au catalogue réel.

// Domaines ouverts aujourd'hui (l'ordre est celui de l'affichage).
export const AVAILABLE_DOMAINS = [
  { icon: 'building', name: 'Immobilier', sub: 'Achat à crédit, loyers, revente' },
  { icon: 'candles', name: 'Crypto', sub: 'Marché simulé, graphique pro' },
  { icon: 'chart', name: 'Bourse et PEA', sub: 'Actions, ETF, fiscalité du PEA' },
];

// Nombre d'actifs du catalogue Crypto simulé (backend/src/data/crypto/catalog.ts).
export const CRYPTO_ASSET_COUNT = 110;

const WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];
export const countWord = (n) => WORDS[n] ?? String(n);
