// Formats d'affichage français. Espace insécable classique (U+00A0) plutôt que fine (U+202F) : toutes les polices la dessinent.
const nbsp = (s) => s.replace(/[  ]/g, ' ');
export const fmtInt = (v) => nbsp(Math.round(v).toLocaleString('fr-FR'));
export const fmtDec = (v, d = 2) => nbsp(v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));
