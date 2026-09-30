// Domaine « Crypto » (marché simulé) : paramètres. Les valeurs non sourcées sont marquées
// « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER » ; modifiables ici sans toucher à la logique.
// Règle de conception : les pièces ne servent qu'au jeu (ni retrait, ni boutique, ni achat avec de l'argent réel, ni échange entre joueurs).

export const CRYPTO_DOMAIN = 'crypto_market';
export const CRYPTO_MODE = 'accelerated';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';
export type BaseTimeframe = '1m' | '1h' | '1d';
export const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];
export const TF_LABELS: Record<Timeframe, string> = { '1m': '1 min', '5m': '5 min', '15m': '15 min', '1h': '1 h', '4h': '4 h', '1d': '1 J', '1w': '1 sem', '1M': '1 mois' };
export const TF_MS: Record<Exclude<Timeframe, '1M'>, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000 };
// Bougies de base stockées ; les autres unités sont AGRÉGÉES à la volée.
export const BASE_OF: Record<Timeframe, BaseTimeframe> = { '1m': '1m', '5m': '1m', '15m': '1m', '1h': '1h', '4h': '1h', '1d': '1d', '1w': '1d', '1M': '1d' };

export const CANDLES = { defaultLimit: 300, maxLimit: 1000 };

// Palier de liquidité d'après le volume quotidien moyen (en dollars). VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
export const LIQUIDITY_TIERS = [
  { tier: 1, minAvgDailyVolume: 500_000_000 },
  { tier: 2, minAvgDailyVolume: 50_000_000 },
  { tier: 3, minAvgDailyVolume: 5_000_000 },
  { tier: 4, minAvgDailyVolume: 0 },
];
