// Patrimoine en InvestCoins : liquidités + titres (Bourse, Crypto) − dettes bancaires. UNE seule définition, utilisée par la vue d'ensemble,
// le solde partagé du site (/economy/balance) et la valeur renvoyée après chaque action. Fonction pure : testable sans base.
// L'Immobilier est en euros (1 InvestCoin = 20 €) et reste volontairement hors de ce total (voir docs/banque.md).
// Un prêt crée des pièces ET une dette du même montant : il ne change donc pas le patrimoine ; ses intérêts, eux, le font baisser.
export interface WealthInput { coins: number; tradingValue: number; debtCoins: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

export const netWorthCoins = ({ coins, tradingValue, debtCoins }: WealthInput): number => {
  for (const v of [coins, tradingValue, debtCoins]) if (!Number.isFinite(v)) throw new Error('Patrimoine : valeur non numérique');
  return round2(coins + tradingValue - debtCoins);
};
