// Jeu de données SIMPLIFIÉ pour le domaine Crypto (mode Accéléré/Historique).
//
// ⚠️ Comme pour stockPrices.ts : ce ne sont PAS des cours réels, juste des
// séries annuelles plausibles pour le MVP. À remplacer en Phase 5 par une
// vraie API (CoinGecko, etc.) sans changer les fonctions exportées.
//
// Contrairement aux actions, chaque crypto n'existe qu'à partir de son
// année de lancement : avant, elle est absente de la série (prix = null)
// et ne peut pas être achetée.

import type { Asset } from './stockPrices';

export const CRYPTO_ASSETS: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
  { symbol: 'BNB', name: 'BNB', type: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto' },
];

export const CRYPTO_MIN_YEAR = 2013;
export const CRYPTO_MAX_YEAR = 2026;

const CRYPTO_SERIES: Record<string, Record<number, number>> = {
  BTC: {
    2013: 700, 2014: 320, 2015: 430, 2016: 900, 2017: 13000, 2018: 3700, 2019: 7200,
    2020: 29000, 2021: 46000, 2022: 16500, 2023: 42000, 2024: 95000, 2025: 100000, 2026: 105000,
  },
  ETH: {
    2015: 1, 2016: 8, 2017: 750, 2018: 130, 2019: 130,
    2020: 730, 2021: 3700, 2022: 1200, 2023: 2300, 2024: 3400, 2025: 3000, 2026: 3300,
  },
  BNB: {
    2017: 8, 2018: 6, 2019: 14, 2020: 37, 2021: 520, 2022: 245, 2023: 310, 2024: 700, 2025: 650, 2026: 700,
  },
  ADA: {
    2017: 0.2, 2018: 0.03, 2019: 0.03, 2020: 0.18, 2021: 1.3, 2022: 0.25, 2023: 0.6, 2024: 0.9, 2025: 0.8, 2026: 0.9,
  },
  SOL: {
    2020: 1.5, 2021: 170, 2022: 10, 2023: 100, 2024: 190, 2025: 180, 2026: 200,
  },
};

export const getCryptoPriceAtYear = (symbol: string, year: number): number | null => {
  const series = CRYPTO_SERIES[symbol];
  if (!series) return null;
  const clampedYear = Math.max(CRYPTO_MIN_YEAR, Math.min(CRYPTO_MAX_YEAR, year));
  return series[clampedYear] ?? null;
};

export const isValidCryptoSymbol = (symbol: string): boolean => symbol in CRYPTO_SERIES;
