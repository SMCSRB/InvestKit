// ─────────────────────────────────────────────────────────────────────────
// BANQUE (module unique) : règles de jeu, toutes modifiables ici.
//
// RÈGLE DE CONCEPTION (décision produit, ne pas contourner) : les InvestCoins n'existent QUE dans le jeu.
// Ni boutique, ni retrait, ni achat avec de l'argent réel, ni échange ou transfert entre joueurs.
// C'est ce qui rend acceptable qu'un prêt CRÉE des pièces : elles ne peuvent jamais sortir de l'économie du jeu.
// Toute fonctionnalité qui ferait sortir ou circuler des pièces entre joueurs doit d'abord remettre en cause ce module.
//
// Nature des écritures du registre (voir investcoinsRepository) :
//   bank_disburse   (+)  nature « credit »    : pièces créées à l'emprunt, avec une dette en face ;
//   bank_repayment  (−)  nature « repayment » : pièces détruites au remboursement (capital ET intérêts) ;
// Le capital rembourse les pièces créées ; les intérêts et frais sont une destruction nette (puits d'inflation).
// ─────────────────────────────────────────────────────────────────────────
export const COIN_DESIGN_RULE =
  'Les InvestCoins ne servent que dans le jeu : pas de boutique, de retrait, d\'achat avec de l\'argent réel ni d\'échange entre joueurs.';

export type BankProduct = 'personal' | 'portfolio' | 'mortgage';

export const BANK_LIMITS = {
  // VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER
  maxActiveLoansPerUser: 3,
  maxOutstandingPrincipalCoins: 50000,   // garde-fou global sur la dette en cours d'un joueur
  missedInstalmentsBeforeDefault: 3,     // 3 échéances impayées de suite = défaut
};

// Remboursement anticipé (crédit à la consommation) : indemnité de 1 % du capital remboursé si plus d'un an restait,
// 0,5 % sinon (repère de la réglementation du crédit à la consommation, extrait de mémoire : À RECONFIRMER sur le texte officiel).
export const EARLY_REPAYMENT = { longRemainingMonths: 12, longPct: 1, shortPct: 0.5 };

// ── Taux ─────────────────────────────────────────────────────────────────
// Taux de base FICTIF calé sur l'histoire (ordre de grandeur de l'Euribor 12 mois, moyenne annuelle, plancher à 0 %).
// NON SOURCÉ, À RECONFIRMER (Banque de France / BCE) avant tout usage autre que pédagogique.
export const BANK_BASE_RATE_PCT: Record<number, number> = {
  2010: 1.35, 2011: 2.0, 2012: 0.55, 2013: 0.55, 2014: 0.3, 2015: 0.05, 2016: 0, 2017: 0, 2018: 0, 2019: 0,
  2020: 0, 2021: 0, 2022: 1.1, 2023: 3.9, 2024: 3.3, 2025: 2.2, 2026: 2.0,
};
// Taux du produit = taux de base + écart (points). Le prêt immobilier garde sa propre courbe (catalogue) : écart nul ici.
// Écarts : VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER. Le prêt personnel est plus cher que l'immobilier (non garanti).
export const BANK_SPREAD_POINTS: Record<BankProduct, number> = { personal: 4.5, portfolio: 2.0, mortgage: 0 };

// Taux d'usure : structure prévue, PAS activée en v1 (aucune valeur). Quand une table annuelle sera fournie,
// `applyUsuryCap` plafonnera le taux d'un produit sans toucher au reste du code.
export const USURY_CAP_PCT_BY_YEAR: Record<number, Partial<Record<BankProduct, number>>> | null = null;

export const bankBaseRatePct = (year: number): number => {
  const v = BANK_BASE_RATE_PCT[year];
  if (v === undefined) throw new RangeError(`Taux de base indisponible pour ${year}`);
  return v;
};
export const applyUsuryCap = (ratePct: number, product: BankProduct, year: number): number => {
  const cap = USURY_CAP_PCT_BY_YEAR?.[year]?.[product];
  return cap === undefined ? ratePct : Math.min(ratePct, cap);
};
export const bankProductRatePct = (product: BankProduct, year: number): number =>
  Math.round(applyUsuryCap(bankBaseRatePct(year) + BANK_SPREAD_POINTS[product], product, year) * 100) / 100;
