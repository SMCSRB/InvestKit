// Export RGPD de ses données : vrai fichier du serveur (GET /auth/me/export), téléchargé par le navigateur.
const API = process.env.NEXT_PUBLIC_API_URL || '';

export const downloadMyData = async () => {
  let res;
  try { res = await fetch(`${API}/auth/me/export`); } catch { return { ok: false, error: 'Connexion impossible : réessaie dans un instant.' }; }
  if (res.status === 429) return { ok: false, error: 'Trop de demandes : réessaie dans une heure.' };
  if (!res.ok) return { ok: false, error: 'L\'export n\'a pas pu être créé pour le moment.' };
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'investkit-mes-donnees.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true };
};
