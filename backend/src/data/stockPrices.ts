// Jeu de données SIMPLIFIÉ pour le MVP du moteur de trading simulé
// (Phase 2B, mode Accéléré/Historique - Bourse/PEA).
//
// ⚠️ Ce ne sont PAS des cours réels : des séries annuelles plausibles,
// dans l'esprit de ce qui existait déjà dans simulateur_pea_mega_ultra_pro.html
// (qui affichait "DONNÉES RÉELLES!" à tort - on ne reproduit pas cette
// erreur ici). À remplacer en Phase 5 par une vraie API (Alpha Vantage,
// etc.) sans changer la forme des fonctions ci-dessous.

export interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto';
}

export const ASSETS: Asset[] = [
  { symbol: 'LVMH', name: 'LVMH', type: 'stock' },
  { symbol: 'TTE', name: 'TotalEnergies', type: 'stock' },
  { symbol: 'SAN', name: 'Sanofi', type: 'stock' },
  { symbol: 'AI', name: 'Air Liquide', type: 'stock' },
  { symbol: 'OR', name: "L'Oréal", type: 'stock' },
  { symbol: 'AIR', name: 'Airbus', type: 'stock' },
  { symbol: 'CAC40', name: 'ETF CAC 40', type: 'etf' },
  { symbol: 'SP500', name: 'ETF S&P 500 (PEA)', type: 'etf' },
];

export const MIN_YEAR = 2010;
export const MAX_YEAR = 2026;

// Prix de clôture annuels (simplifiés) par symbole, 2010 -> 2026
const PRICE_SERIES: Record<string, number[]> = {
  //           2010   2011   2012   2013   2014   2015   2016   2017   2018   2019   2020   2021   2022   2023   2024   2025   2026
  LVMH:      [ 120,   105,   130,   140,   135,   160,   175,   240,   250,   365,   420,   680,   650,   790,   620,   700,   730],
  TTE:       [  38,    36,    38,    42,    38,    35,    42,    48,    47,    45,    30,    41,    52,    58,    56,    58,    60],
  SAN:       [  55,    50,    65,    75,    80,    85,    70,    75,    72,    88,    82,    85,    90,    92,    95,   100,   102],
  AI:        [  85,    82,    95,   100,   105,   110,   100,   115,   105,   130,   135,   150,   145,   170,   175,   180,   185],
  OR:        [  85,    80,   100,   130,   130,   160,   150,   180,   170,   250,   285,   380,   330,   400,   340,   360,   375],
  AIR:       [  15,    18,    28,    45,    50,    55,    50,    75,    95,   130,    67,    95,    95,   145,   155,   180,   190],
  CAC40:     [3800,  3160,  3640,  4300,  4270,  4640,  4860,  5310,  4730,  5980,  5550,  7150,  6470,  7540,  7380,  7900,  8100],
  SP500:     [1260,  1260,  1420,  1850,  2060,  2040,  2240,  2670,  2510,  3230,  3760,  4770,  3840,  4770,  5880,  6200,  6500],
};

export const getAvailableAssets = (): Asset[] => ASSETS;

export const getPriceAtYear = (symbol: string, year: number): number | null => {
  const series = PRICE_SERIES[symbol];
  if (!series) return null;
  const clampedYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
  return series[clampedYear - MIN_YEAR] ?? null;
};

export const isValidSymbol = (symbol: string): boolean => Object.prototype.hasOwnProperty.call(PRICE_SERIES, symbol);
