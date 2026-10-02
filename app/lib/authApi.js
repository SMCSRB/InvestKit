// Appels d'authentification : renvoie toujours { ok, status, data } (jamais d'exception, jamais de console.error : une erreur
// attendue — mauvais code, mot de passe refusé — n'est pas un bug et ne doit pas déclencher l'indicateur d'erreurs du mode développement).
const API = process.env.NEXT_PUBLIC_API_URL;

export async function authPost(path, body) {
  try {
    const res = await fetch(`${API}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch { /* corps vide */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.' } };
  }
}

export const errorText = (r, fallback) => {
  if (r.status === 429) return 'Trop de tentatives. Patiente quelques minutes avant de réessayer.';
  return r.data?.error || fallback;
};
