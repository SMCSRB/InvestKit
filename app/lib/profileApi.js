// Profil côté navigateur : tout passe par le serveur (nom, bio, photo, changement d'e-mail). Rien n'est gardé dans le navigateur.
// Après chaque enregistrement on prévient le reste de la page (en-tête, menu du profil...) avec l'évènement « ik-user-changed » :
// ils rechargent alors le compte depuis le serveur, sans rechargement de la page.
const API = process.env.NEXT_PUBLIC_API_URL || '';
export const USER_CHANGED_EVENT = 'ik-user-changed';
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_PICK_MAX_BYTES = 15 * 1024 * 1024;   // au-delà, on ne tente même pas (le serveur en accepte 3 Mo après réduction)
const SEND_MAX_SIDE = 1024;

export const announceUserChanged = () => { try { window.dispatchEvent(new Event(USER_CHANGED_EVENT)); } catch { /* ignore */ } };
export const onUserChanged = (fn) => { window.addEventListener(USER_CHANGED_EVENT, fn); return () => window.removeEventListener(USER_CHANGED_EVENT, fn); };

export const avatarUrl = (avatarId) => (avatarId ? `${API}/profile/avatar/${avatarId}` : null);

const call = async (path, init) => {
  let res;
  try { res = await fetch(`${API}${path}`, init); } catch { return { ok: false, status: 0, error: 'Connexion impossible : vérifie ta connexion internet et réessaie.' }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, code: data.code, error: data.error || 'Une erreur est survenue, réessaie.' };
  return { ok: true, data };
};
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const getProfile = () => call('/profile');
export const saveProfile = async (fields) => { const r = await call('/profile', json('PATCH', fields)); if (r.ok) announceUserChanged(); return r; };
export const requestEmailChange = (newEmail, password, code) => call('/profile/email/request', json('POST', { newEmail, password, ...(code ? { code } : {}) }));
export const confirmEmailChange = async (code) => { const r = await call('/profile/email/confirm', json('POST', { code })); if (r.ok) announceUserChanged(); return r; };

// Réduit la photo (côté navigateur) pour ne pas envoyer 8 Mo de photo de téléphone ; ce nouvel encodage retire aussi l'EXIF.
// Si le navigateur ne sait pas lire le fichier, on l'envoie tel quel : c'est le serveur qui décide (et qui répond clairement).
const shrink = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      const scale = Math.min(1, SEND_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.9);
    } catch { resolve(file); } finally { URL.revokeObjectURL(url); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

export const uploadAvatar = async (file) => {
  if (!file) return { ok: false, error: 'Aucun fichier choisi.' };
  if (file.size > AVATAR_PICK_MAX_BYTES) return { ok: false, error: 'Image trop lourde (15 Mo maximum).' };
  if (file.type && !AVATAR_TYPES.includes(file.type)) return { ok: false, error: 'Format non pris en charge : choisis une image JPG, PNG ou WebP.' };
  const body = await shrink(file);
  const r = await call('/profile/avatar', { method: 'POST', headers: { 'Content-Type': body.type || 'application/octet-stream' }, body });
  if (r.ok) announceUserChanged();
  return r;
};
export const removeAvatar = async () => { const r = await call('/profile/avatar', { method: 'DELETE' }); if (r.ok) announceUserChanged(); return r; };
