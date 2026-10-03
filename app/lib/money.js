// Affichage des montants du jeu : tout est en InvestCoins (1 pièce = 1 €). Le dollar reste une information secondaire.
// Ce fichier ne renvoie que du texte (nombres formatés) : le symbole de pièce est dessiné par le composant Coin.
const nbsp = (s) => s.replace(/[  ]/g, ' ');
const decimalsFor = (a) => (a >= 100 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 5 : 8);

/** Prix d'une unité (peut être très petit) : assez de décimales pour rester lisible. */
export const unitNumber = (n) => nbsp(Number(n).toLocaleString('fr-FR', { maximumFractionDigits: decimalsFor(Math.abs(n)) }));

/** Prix d'origine en dollars (information secondaire). */
export const fmtUsd = (n) => (n == null ? '—' : `${unitNumber(n)} $`);
