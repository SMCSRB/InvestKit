// Patrimoine en InvestCoins (1 pièce = 1 €), à DEUX chiffres, UNE seule définition (vue d'ensemble, solde partagé du site, valeur après chaque action) :
//  - patrimoine FINANCIER = liquidités + titres (Bourse, Crypto) − dettes bancaires ;
//  - patrimoine TOTAL     = patrimoine financier + immobilier NET DE REVENTE (ce qu'il resterait après avoir tout revendu : agence, diagnostics,
//    remboursement anticipé, impôt ; le prêt immobilier est déjà déduit dans cette valeur, il ne se retranche donc pas deux fois).
// Un prêt crée des pièces ET une dette du même montant : il ne change pas le patrimoine ; ses intérêts, eux, le font baisser.
// Fonctions pures : testables sans base.
export interface WealthInput { coins: number; tradingValue: number; debtCoins: number }
export interface WealthBreakdownInput extends WealthInput { realEstateNetCoins: number }

const round2 = (n: number) => Math.round(n * 100) / 100;
const check = (vs: number[]) => { for (const v of vs) if (!Number.isFinite(v)) throw new Error('Patrimoine : valeur non numérique'); };

/** Patrimoine financier : liquidités + titres − dettes bancaires. */
export const netWorthCoins = ({ coins, tradingValue, debtCoins }: WealthInput): number => {
  check([coins, tradingValue, debtCoins]);
  return round2(coins + tradingValue - debtCoins);
};

/** Les deux chiffres du patrimoine. L'immobilier peut être négatif (revente qui ne couvre pas la dette) : on ne le cache pas. */
export const wealthBreakdown = (i: WealthBreakdownInput): { financial: number; realEstateNet: number; total: number } => {
  check([i.coins, i.tradingValue, i.debtCoins, i.realEstateNetCoins]);
  const financial = netWorthCoins(i);
  const realEstateNet = round2(i.realEstateNetCoins);
  return { financial, realEstateNet, total: round2(financial + realEstateNet) };
};
