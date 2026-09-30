// Navigation principale : UNE seule source. Chaque entrée pointe vers une vraie page.
import { SITE_INFO } from '@/app/lib/siteInfo';

export const NAV_MAIN = [
  { id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
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
  { id: 'amis', label: 'Amis', href: '/friends', icon: 'users' },
  // Communauté : visible seulement si le lien Discord est renseigné (app/lib/siteInfo.js)
  ...(SITE_INFO.discordUrl ? [{ id: 'communaute', label: 'Communauté', href: SITE_INFO.discordUrl, icon: 'globe', external: true }] : []),
];

export const NAV_BOTTOM = [
  { id: 'settings', label: 'Paramètres', href: '/profile', icon: 'settings' },
  { id: 'support', label: 'Aide et support', href: '/support', icon: 'help' },
];

export const flatNav = () => [...NAV_MAIN.flatMap((n) => (n.children ? n.children : [n])), ...NAV_BOTTOM];

// Une entrée est active si l'adresse courante (sans la requête) correspond.
export const isActive = (pathname, href) => {
  if (!href || href.startsWith('http')) return false;
  const path = href.split('?')[0];
  return pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
};
