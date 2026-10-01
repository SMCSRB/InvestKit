// Toutes les pages du site utilisent le nouveau thème (clair/sombre) depuis le lot 7 : plus aucune page n'est forcée en sombre.
export const isThemedPath = () => true;

export const THEME_KEY = 'ik-theme';
export const MOTION_KEY = 'ik-motion';

// Script exécuté avant l'affichage pour éviter un flash de mauvais thème.
export const themeInitScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}');d.setAttribute('data-theme',t==='light'||t==='dark'?t:'dark');var m=localStorage.getItem('${MOTION_KEY}');if(m==='on'||m==='off')d.setAttribute('data-motion',m);}catch(e){document.documentElement.setAttribute('data-theme','dark')}})();`;
