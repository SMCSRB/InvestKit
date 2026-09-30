// Moteur de risque : simulation Monte Carlo, tests de résistance (crises historiques), score de risque décomposé, corrélations.
// Paramètres modifiables sans toucher à la logique. Les chutes historiques sont SOURCÉES (ordres de grandeur pic → creux) ;
// les volatilités, corrélations, pondérations du score et les chutes marquées « estimé » sont des
// VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER. Ce sont des outils pédagogiques, pas des conseils en investissement.
//
// Sources des chutes : S&P 500 −49 % (mars 2000 → oct. 2002), −57 % (oct. 2007 → mars 2009), −34/35 % (fév. → mars 2020), −25 % (janv. → oct. 2022) ;
// CAC 40 −62 % (2000-2003), −58 % (oct. 2007 → mars 2009) ; Bitcoin −84 % (2018), −77 % (2022) ; prix des logements anciens en France 2008-2009 : −3 à −4 %
// (indice Notaires-INSEE). https://www.rockco.com/strategic-insights/bull-and-bear-markets/ · https://coinmarketcap.com/academy/article/a-comparison-of-the-2018-bear-market-and-2022-crypto-market-drawdown
// · https://www.immobilier.notaires.fr/notes-conjoncture-immobiliere/2009

export type AssetClass = 'equity_fr' | 'equity_world' | 'bonds' | 'crypto' | 'real_estate' | 'cash';
export const ASSET_CLASSES: AssetClass[] = ['equity_fr', 'equity_world', 'bonds', 'crypto', 'real_estate', 'cash'];

export const CLASS_LABELS: Record<AssetClass, string> = {
  equity_fr: 'Actions françaises', equity_world: 'Actions internationales', bonds: 'Obligations', crypto: 'Cryptomonnaies', real_estate: 'Immobilier', cash: 'Liquidités',
};

export const RISK_RULES = {
  // Volatilité annuelle typique par classe (%). VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER.
  annualVolPct: { equity_fr: 20, equity_world: 16, bonds: 6, crypto: 70, real_estate: 7, cash: 0.5 } as Record<AssetClass, number>,

  // Corrélation supposée entre classes (symétrique). VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER.
  correlation: {
    equity_fr: { equity_world: 0.9, bonds: 0.1, crypto: 0.3, real_estate: 0.3, cash: 0 },
    equity_world: { bonds: 0.1, crypto: 0.35, real_estate: 0.3, cash: 0 },
    bonds: { crypto: 0, real_estate: 0.3, cash: 0.2 },
    crypto: { real_estate: 0.1, cash: 0 },
    real_estate: { cash: 0 },
  } as Record<string, Partial<Record<AssetClass, number>>>,

  monteCarlo: { defaultPaths: 2000, maxPaths: 10000, maxYears: 60 },

  // Poids des facteurs du score de risque (somme = 1). VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER.
  scoreWeights: { volatility: 0.25, drawdown: 0.25, concentration: 0.15, crypto: 0.1, leverage: 0.15, horizon: 0.1 },
  scoreLabels: [
    { max: 25, label: 'Prudent' }, { max: 50, label: 'Modéré' }, { max: 75, label: 'Dynamique' }, { max: 101, label: 'Élevé' },
  ],
};

// Crises historiques : chute pic → creux par classe (%), et durée typique pour retrouver le sommet (mois).
// `estimated: true` = valeur estimée (non sourcée) ou classe qui n'existait pas encore (déduite).
export interface ShockValue { pct: number; estimated?: boolean; recoveryMonths?: number }
export interface StressScenario { id: string; label: string; period: string; description: string; shocks: Record<AssetClass, ShockValue> }

export const STRESS_SCENARIOS: StressScenario[] = [
  { id: 'dotcom_2000', label: 'Éclatement de la bulle internet', period: '2000-2002',
    description: 'Les valeurs technologiques s\'effondrent ; les actions européennes chutent plus que les américaines.',
    shocks: { equity_world: { pct: -49, recoveryMonths: 84 }, equity_fr: { pct: -62, recoveryMonths: 90 }, bonds: { pct: 10, estimated: true }, crypto: { pct: -70, estimated: true }, real_estate: { pct: 5, estimated: true }, cash: { pct: 0 } } },
  { id: 'gfc_2008', label: 'Crise financière mondiale', period: '2007-2009',
    description: 'Faillite de banques, crédit gelé : la plus forte chute des actions depuis 1929.',
    shocks: { equity_world: { pct: -57, recoveryMonths: 60 }, equity_fr: { pct: -58, recoveryMonths: 72 }, bonds: { pct: 5, estimated: true }, crypto: { pct: -80, estimated: true }, real_estate: { pct: -4 }, cash: { pct: 0 } } },
  { id: 'covid_2020', label: 'Krach du Covid-19', period: 'février-mars 2020',
    description: 'Chute très rapide (un mois) puis rebond rapide.',
    shocks: { equity_world: { pct: -34, recoveryMonths: 5 }, equity_fr: { pct: -40, estimated: true, recoveryMonths: 18 }, bonds: { pct: -3, estimated: true }, crypto: { pct: -50, estimated: true, recoveryMonths: 3 }, real_estate: { pct: 0, estimated: true }, cash: { pct: 0 } } },
  { id: 'inflation_2022', label: 'Inflation et hausse des taux', period: '2022',
    description: 'Les actions ET les obligations baissent ensemble : la diversification protège moins.',
    shocks: { equity_world: { pct: -25, recoveryMonths: 15 }, equity_fr: { pct: -22, estimated: true, recoveryMonths: 12 }, bonds: { pct: -13, estimated: true }, crypto: { pct: -77 }, real_estate: { pct: -5, estimated: true }, cash: { pct: 0 } } },
  { id: 'crypto_winter_2018', label: 'Hiver des cryptomonnaies', period: '2018',
    description: 'Le Bitcoin perd plus de 80 % de sa valeur ; les actions reculent aussi en fin d\'année.',
    shocks: { equity_world: { pct: -20, recoveryMonths: 12 }, equity_fr: { pct: -25, estimated: true }, bonds: { pct: 0, estimated: true }, crypto: { pct: -84, recoveryMonths: 36 }, real_estate: { pct: 0, estimated: true }, cash: { pct: 0 } } },
];
