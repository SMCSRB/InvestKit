// Pages déjà passées au nouveau thème. Les autres restent en sombre fixe (leur habillage d'origine n'a pas de thème clair).
// Retirer ce filtre quand toutes les pages seront migrées (lot 6).
export const THEMED_PREFIXES = ['/', '/dashboard', '/crypto', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/design-system'];

export const isThemedPath = (pathname) =>
  THEMED_PREFIXES.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')));

export const THEME_KEY = 'ik-theme';
export const MOTION_KEY = 'ik-motion';

// Script exécuté avant l'affichage pour éviter un flash de mauvais thème.
export const themeInitScript = `(function(){try{var d=document.documentElement;var p=location.pathname;var themed=${JSON.stringify(THEMED_PREFIXES)}.some(function(x){return p===x||(x!=='/'&&p.indexOf(x+'/')===0)});var t=localStorage.getItem('${THEME_KEY}');d.setAttribute('data-theme',themed&&(t==='light'||t==='dark')?t:'dark');var m=localStorage.getItem('${MOTION_KEY}');if(m==='on'||m==='off')d.setAttribute('data-motion',m);}catch(e){document.documentElement.setAttribute('data-theme','dark')}})();`;
