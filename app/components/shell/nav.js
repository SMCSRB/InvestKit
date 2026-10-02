// Navigation principale : UNE seule source. Chaque entrée pointe vers une vraie page.
import { SITE_INFO } from '../../lib/siteInfo';

export const NAV_MAIN = [
  { id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
  { id: 'marche', label: 'Marché', href: '/dashboard?tab=market', icon: 'chart' },
  {
    id: 'domains',
    label: 'Domaines',
    icon: 'candles',
    children: [
      { id: 'bourse', label: 'Bourse et PEA', href: '/dashboard?tab=trading', icon: 'chart' },
      { id: 'crypto', label: 'Crypto', href: '/crypto', icon: 'coins' },
      { id: 'immobilier', label: 'Immobilier', href: '/immobilier', icon: 'building' },
    ],
  },
  { id: 'banque', label: 'Banque et InvestCoins', href: '/banque', icon: 'bank' },
  { id: 'education', label: 'Éducation', href: '/education', icon: 'book' },
  { id: 'glossaire', label: 'Glossaire', href: '/glossaire', icon: 'bookOpen' },
  { id: 'classements', label: 'Classements', href: '/classements', icon: 'trophy' },
  { id: 'amis', label: 'Amis', href: '/friends', icon: 'users' },
  // Communauté : visible seulement si le lien Discord est renseigné (app/lib/siteInfo.js)
  ...(SITE_INFO.discordUrl ? [{ id: 'communaute', label: 'Communauté', href: SITE_INFO.discordUrl, icon: 'globe', external: true }] : []),
];

export const NAV_BOTTOM = [
  { id: 'settings', label: 'Paramètres', href: '/dashboard?tab=settings', icon: 'settings' },
  { id: 'support', label: 'Aide et support', href: '/support', icon: 'help' },
];

export const flatNav = () => [...NAV_MAIN.flatMap((n) => (n.children ? n.children : [n])), ...NAV_BOTTOM];

// Une entrée est active si le chemin correspond ET, quand elle a une requête (?tab=…), si cette requête correspond aussi.
// Une entrée sans requête n'est pas active quand la page est ouverte sur un onglet précis (?tab=…) réclamé par une autre entrée.
export const isActive = (pathname, search, href) => {
  if (!href || href.startsWith('http')) return false;
  const [path, query] = href.split('?');
  const samePath = pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
  if (!samePath) return false;
  const current = new URLSearchParams(search || '');
  if (query) {
    const want = new URLSearchParams(query);
    return [...want].every(([k, v]) => current.get(k) === v);
  }
  return !flatNavWithQuery().some((n) => n.href.split('?')[0] === path && n.href.includes('?') && isQueryMatch(current, n.href.split('?')[1]));
};
const isQueryMatch = (current, query) => [...new URLSearchParams(query)].every(([k, v]) => current.get(k) === v);
const flatNavWithQuery = () => flatNav().filter((n) => n.href && n.href.includes('?'));
