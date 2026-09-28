// Métrique de classement des domaines Bourse et Crypto.
//
// performance % = (valeur des positions + ventes encaissées − achats) / achats
//
// C'est le gain TOTAL rapporté à tout l'argent engagé en achats. Contrairement
// à la seule plus-value latente des positions ouvertes, elle ne retombe pas à
// zéro quand on vend tout : un gain encaissé reste un gain.
//
// Limite assumée : ce n'est pas un rendement pondéré par le temps. Elle
// convient à un classement simple et lisible, pas à un audit de performance.
export const computePerformancePct = (input: {
  marketValue: number;
  totalBought: number;
  totalProceeds: number;
}): number => {
  if (input.totalBought <= 0) return 0;
  const gain = input.marketValue + input.totalProceeds - input.totalBought;
  return (gain / input.totalBought) * 100;
};

// Arrondi à 6 décimales avant tout ceil/floor : évite que 0.1 * 30, qui vaut
// 3.0000000000000004 en virgule flottante, soit facturé 4 pièces au lieu de 3.
const roundTo6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// Le ledger est en pièces entières. Règle de règlement : un achat est facturé
// à l'entier SUPÉRIEUR, une vente créditée à l'entier INFÉRIEUR. L'arrondi
// joue donc toujours contre le joueur (jamais d'argent créé par arrondi).
export const chargeForBuy = (price: number, quantity: number): number =>
  Math.ceil(roundTo6(price * quantity));

export const creditForSell = (price: number, quantity: number): number =>
  Math.floor(roundTo6(price * quantity));
