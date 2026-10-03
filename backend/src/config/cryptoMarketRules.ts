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

// Dates de départ proposées (le joueur en choisit une à la création de son compte). Une date n'est proposée que si au moins un actif est coté ce jour-là.
export const START_SCENARIOS = [
  { id: 'y2014', date: '2014-01-01', label: 'Début 2014 : après la première grande bulle, Mt. Gox au bord de la faillite' },
  { id: 'y2017', date: '2017-01-01', label: 'Début 2017 : juste avant la bulle des ICO' },
  { id: 'y2020', date: '2020-01-01', label: 'Début 2020 : avant le krach du Covid' },
  { id: 'y2021', date: '2021-01-01', label: 'Début 2021 : avant le sommet de novembre' },
  { id: 'y2022', date: '2022-01-01', label: 'Début 2022 : avant l\'effondrement de Terra et de FTX' },
] as const;
export const DEFAULT_START_ID = 'y2017';

// Pas d'avancée du temps (mode Accéléré). Aucun retour en arrière.
export const ADVANCE_STEPS = ['day', 'week', 'month'] as const;
export type AdvanceStep = (typeof ADVANCE_STEPS)[number];

export const ATTRIBUTION = 'Graphiques : TradingView Lightweight Charts™ (licence Apache 2.0) — https://www.tradingview.com/';
export const DISCLAIMER = 'Simulation à but éducatif, pas un conseil en investissement. Les InvestCoins ne valent rien en dehors du jeu : aucun retrait, aucun achat avec de l\'argent réel, aucun échange entre joueurs.';

// ── Économie du domaine Crypto ───────────────────────────────────────────────────────────────────────────────────
// ⚠️ TOUTES ces valeurs sont des VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER (inspirées des ordres de grandeur des
// plateformes d'échange grand public, pas de leurs barèmes exacts).
export const CRYPTO_ECONOMY = {
  usdPerCoin: 1,                 // conversion propre au domaine Crypto : 1 InvestCoin = 1 $ de jeu (l'unification 1 InvestCoin = 20 € est reportée)
  minNotionalCoins: 10,          // montant minimal d'un ordre (hors sortie complète d'une position)
  quantityDecimals: 8,
  maxOpenOrders: 20,
  staleDays: 7,                  // sans cotation depuis 7 jours : achat refusé (actif disparu), vente possible au dernier prix
  feePctTaker: { 1: 0.10, 2: 0.20, 3: 0.35, 4: 0.60 } as Record<number, number>,   // frais de la plateforme (0,1 à 0,6 %)
  makerFactor: 0.5,              // un ordre limite qui attend dans le carnet paie la moitié
  minFeeCoins: 1,
  spreadPct: { 1: 0.02, 2: 0.05, 3: 0.20, 4: 0.80 } as Record<number, number>,     // écart achat/vente complet ; moitié à chaque exécution « au marché »
  slippage: { k: 0.10, maxFraction: 0.05 },                                        // glissement = k × √(montant / volume quotidien moyen), plafonné
} as const;

// ── Prêt sur portefeuille Crypto (Banque) ─────────────────────────────────────────────────────────────────────────
// Décision produit : emprunt jusqu'à 30 % de la valeur des cryptos déposées en garantie, appel de marge à 65 %, vente forcée à 80 % de dette ÷ valeur.
// Prix d'évaluation d'une période : plus bas connu de la période si disponible, sinon clôture (simplification signalée au joueur).
// Décote de vente forcée et taux variable : repris du module Banque (valeurs de jeu, à reconfirmer).
export const CRYPTO_LOAN = {
  ltv: { max: 30, call: 65, liquidation: 80 },
  simplification: 'Simplification : pour décider d\'un appel de marge ou d\'une vente forcée, le jeu utilise le PLUS BAS prix de chaque crypto sur la période écoulée (quand la donnée existe, sinon la clôture), même si ces plus bas n\'ont pas eu lieu au même moment. C\'est plus sévère que la réalité, mais reproductible.',
} as const;
