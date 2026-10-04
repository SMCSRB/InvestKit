// Lien « retour » cohérent : on retient la page d'où l'on vient (stockage de session, jamais envoyé au serveur).
// Seules des pages connues du site sont proposées ; sinon le retour mène au tableau de bord.
const NAMES = {
  '/dashboard': 'Tableau de bord', '/immobilier': 'Immobilier', '/bourse': 'Bourse et PEA', '/crypto': 'Crypto',
  '/education': 'Éducation', '/classements': 'Classements', '/glossaire': 'Glossaire', '/friends': 'Amis',
};
const FALLBACK = { href: '/dashboard', label: 'Tableau de bord' };
const KEY_LAST = 'ik:page:last';
const KEY_PREV = 'ik:page:prev';

// À appeler à chaque changement de page (par la coque de l'application).
export function trackPage(pathname) {
  try {
    const last = sessionStorage.getItem(KEY_LAST);
    if (last && last !== pathname) sessionStorage.setItem(KEY_PREV, last);
    sessionStorage.setItem(KEY_LAST, pathname);
  } catch { /* stockage indisponible : on retombe sur le tableau de bord */ }
}

// Destination du lien « retour » pour la page courante.
export function backTarget(current) {
  try {
    // Selon l'ordre de montage, la page courante est déjà notée « dernière » ou pas encore : on prend la dernière page différente de celle-ci.
    const last = sessionStorage.getItem(KEY_LAST);
    const from = last && last !== current ? last : sessionStorage.getItem(KEY_PREV);
    if (from && from !== current && NAMES[from]) return { href: from, label: NAMES[from] };
  } catch { /* ignore */ }
  return FALLBACK;
}
