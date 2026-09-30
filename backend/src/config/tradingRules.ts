// Frais et fiscalité des domaines Bourse (PEA / compte-titres) et Crypto.
//
// Règle de conception : frais et impôts sont des PUITS d'InvestCoins (pièces détruites, jamais redistribuées).
// Les taux ci-dessous sont des simplifications pédagogiques d'un système réel ; chaque valeur porte sa source ou la
// mention « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER ». Tout est modifiable ici sans toucher à la logique.
//
// Sources consultées (septembre 2026) :
// - PEA : exonération d'IR après 5 ans, prélèvements sociaux (PS) seuls ; avant 5 ans, PFU. PS 18,6 % depuis la LFSS 2026
//   (CSG 9,2 → 10,6 %), le PEA n'ayant pas été exclu de la hausse ; PFU = 12,8 % d'IR + PS (31,4 % en 2026).
//   https://www.ramify.fr/pea/fiscalite · https://impots-pratique.fr/epargne/pea-fiscalite-guide-complet/
// - Crypto : article 150 VH bis du CGI, PFU 12,8 % + PS ; seuil de 305 € portant sur le TOTAL des cessions de l'année ;
//   seules les cessions vers l'euro (ou un bien/service) sont imposables, pas les échanges crypto contre crypto.
//   https://www.waltio.com/fr/tout-savoir-sur-la-fiscalite-crypto/ · https://kohenavocats.com/crypto-305-euros-cessions-exoneration-declaration-texte-reel/
// - Courtage : la loi Pacte plafonne à 0,5 % les frais d'un ordre en ligne sur PEA ; courtiers en ligne de 1 € par ordre à 0,5 %.
//   https://sinvestir.fr/ouvrir-un-pea-comparatif-banque-courtier-en-ligne/
// - Échange crypto : environ 0,1 % à 0,26 % en trading « pro », davantage sur les interfaces simplifiées.
//   https://www.kraken.com/fr/learn/kraken-vs-binance

export const TRADING_COSTS = {
  // Interrupteur global (les tests d'autres modules le coupent pour rester sur des montants ronds).
  enabled: true,

  // Courtage : % du montant de l'ordre, minimum en pièces, appliqué à l'achat ET à la vente.
  brokerage: {
    stock: { ratePct: 0.5, minCoins: 1 },  // plafond légal PEA en ligne (loi Pacte) ; courtiers réels 0,35 à 0,5 %
    etf: { ratePct: 0.35, minCoins: 1 },   // VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : un peu moins cher que les actions
    crypto: { ratePct: 0.5, minCoins: 1 }, // VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER : entre le trading « pro » (0,1–0,26 %) et l'interface simplifiée
  },
};

export const TRADING_TAX = {
  enabled: true,

  // Prélèvements sociaux sur les plus-values, par année (SOURCÉ pour 2018+ ; avant : VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER
  // — historique approximatif 12,3 % puis 13,5 % puis 15,5 %).
  socialPct: (year: number): number =>
    year >= 2026 ? 18.6 : year >= 2018 ? 17.2 : year >= 2012 ? 15.5 : 13.5,

  // Impôt sur le revenu des plus-values au « prélèvement forfaitaire » (PFU). Le PFU date de 2018 : avant, le barème
  // progressif s'appliquait ; on le remplace par un taux forfaitaire unique (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER).
  incomeTaxPct: (year: number, kind: 'securities' | 'crypto'): number => {
    if (kind === 'crypto') return year >= 2022 ? 12.8 : 19;  // 19 % de 2019 à 2021 (rappel à reconfirmer), 12,8 % ensuite
    return year >= 2018 ? 12.8 : 19;                          // avant 2018 : simplification
  },

  // PEA : exonération d'impôt sur le revenu après 5 ans (SOURCÉ). Plafond de versements 150 000 € (SOURCÉ).
  pea: { exemptAfterYears: 5, depositCeiling: 150_000 },

  // Crypto : en dessous de ce total de cessions annuelles, aucune imposition (SOURCÉ : 305 €).
  cryptoDisposalThreshold: 305,
};
