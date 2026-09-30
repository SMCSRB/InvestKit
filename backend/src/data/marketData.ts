import {
  ASSETS as STOCK_ASSETS,
  MIN_YEAR as STOCK_MIN_YEAR,
  MAX_YEAR as STOCK_MAX_YEAR,
  getPriceAtYear as getStockPriceAtYear,
  isValidSymbol as isValidStockSymbol,
  Asset,
} from './stockPrices';
import {
  CRYPTO_ASSETS,
  CRYPTO_MIN_YEAR,
  CRYPTO_MAX_YEAR,
  getCryptoPriceAtYear,
  isValidCryptoSymbol,
} from './cryptoPrices';

export interface DomainConfig {
  id: string;
  label: string;
  minYear: number;
  maxYear: number;
  assets: Asset[];
  getPrice: (symbol: string, year: number) => number | null;
  isValidSymbol: (symbol: string) => boolean;
}

// Registre des domaines tradables. Immobilier viendra en dernier : sa
// mécanique (cash-flow mensuel) est différente, elle ne rentre pas ici.
export const DOMAINS: Record<string, DomainConfig> = {
  stocks: {
    id: 'stocks',
    label: 'Bourse / PEA',
    minYear: STOCK_MIN_YEAR,
    maxYear: STOCK_MAX_YEAR,
    assets: STOCK_ASSETS,
    getPrice: getStockPriceAtYear,
    isValidSymbol: isValidStockSymbol,
  },
  crypto: {
    id: 'crypto',
    label: 'Crypto',
    minYear: CRYPTO_MIN_YEAR,
    maxYear: CRYPTO_MAX_YEAR,
    assets: CRYPTO_ASSETS,
    getPrice: getCryptoPriceAtYear,
    isValidSymbol: isValidCryptoSymbol,
  },
};

export const DEFAULT_DOMAIN = 'stocks';

export const getDomain = (id: unknown): DomainConfig | null => {
  const key = typeof id === 'string' && id ? id : DEFAULT_DOMAIN;
  return DOMAINS[key] ?? null;
};
