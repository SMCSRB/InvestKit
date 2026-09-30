// Session côté navigateur.
//
// Le vrai jeton vit dans un cookie httpOnly posé par le serveur : le JavaScript de la page ne peut ni le lire ni le voler.
// localStorage.token ne contient plus qu'un MARQUEUR « connecté » (nombreux écrans testent sa présence).
// Un ancien vrai jeton (sessions ouvertes avant cette version) est échangé contre un cookie au démarrage (upgradeLegacyToken).

const API = process.env.NEXT_PUBLIC_API_URL || '';

export const SESSION_MARKER = 'cookie-session';

// Valeurs de jeton qui ne sont pas de vrais jetons : ne jamais les envoyer dans un en-tête Authorization.
const isFakeToken = (t) => !t || t === SESSION_MARKER || t === 'temporary' || t === 'undefined' || t === 'null';

export const isLoggedIn = () => {
  try { return !!localStorage.getItem('token'); } catch { return false; }
};

export const markLoggedIn = () => {
  try { localStorage.setItem('token', SESSION_MARKER); } catch { /* stockage indisponible */ }
};

export const readCsrfCookie = () => {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.split('; ').find((c) => c.startsWith('ik_csrf='));
  return m ? decodeURIComponent(m.slice('ik_csrf='.length)) : '';
};

// Déconnexion : le serveur efface le cookie httpOnly (le JavaScript ne le peut pas), puis on oublie le marqueur.
export const endSession = async () => {
  try {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch { /* hors ligne : le marqueur local est quand même effacé */ }
  try { localStorage.removeItem('token'); } catch { /* ignore */ }
};

// Transitoire : les écrans existants appellent fetch(...) avec « Authorization: Bearer <localStorage.token> ».
// Pour les requêtes vers l'API, on ajoute les cookies (credentials) et l'en-tête anti-CSRF, et on retire un Bearer factice.
export const installApiFetch = () => {
  if (typeof window === 'undefined' || window.__ikFetchInstalled || !API) return;
  window.__ikFetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(API)) return nativeFetch(input, init);

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    const auth = headers.get('Authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (auth && isFakeToken(bearer)) headers.delete('Authorization');

    // Session ouverte avant la migration (vrai jeton encore dans localStorage) : tant que l'échange contre un cookie n'est pas terminé,
    // toute requête sans en-tête d'autorisation le reçoit, pour ne jamais échouer pendant ces quelques centaines de millisecondes.
    if (!headers.get('Authorization')) {
      let stored = null;
      try { stored = localStorage.getItem('token'); } catch { /* ignore */ }
      if (!isFakeToken(stored)) headers.set('Authorization', `Bearer ${stored}`);
    }

    const method = (init.method || (typeof input !== 'string' ? input.method : 'GET') || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !headers.get('Authorization')) {
      const csrf = readCsrfCookie();
      if (csrf) headers.set('X-CSRF-Token', csrf);
    }
    return nativeFetch(input, { ...init, headers, credentials: 'include' });
  };
};

// Migration des sessions ouvertes avant cette version : l'ancien jeton (localStorage) est échangé une fois contre un cookie httpOnly.
export const upgradeLegacyToken = async () => {
  let token = null;
  try { token = localStorage.getItem('token'); } catch { return; }
  if (isFakeToken(token)) return;
  try {
    const res = await fetch(`${API}/auth/session/upgrade`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
    if (res.ok) markLoggedIn();
    else if (res.status === 401) localStorage.removeItem('token'); // jeton expiré : reconnexion demandée
  } catch { /* serveur injoignable : on réessaiera au prochain chargement */ }
};
