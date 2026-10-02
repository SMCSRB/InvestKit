// Photo de profil : enregistrée DANS CE NAVIGATEUR seulement (clé « profilePhoto », la même que celle de l'ancien tableau de bord).
// Elle n'est envoyée à aucun serveur et n'est donc pas visible par les autres joueurs. L'image est recadrée en carré et réduite (256 px)
// avant d'être enregistrée : une photo de téléphone de plusieurs Mo ne remplit pas l'espace du navigateur.
const KEY = 'profilePhoto';
const EVENT = 'ik-profile-photo';
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export const readPhoto = () => {
  try { const v = localStorage.getItem(KEY); return v && v.startsWith('data:image/') ? v : null; } catch { return null; }
};

const announce = () => { try { window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ } };

export const onPhotoChange = (fn) => {
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', fn);
  return () => { window.removeEventListener(EVENT, fn); window.removeEventListener('storage', fn); };
};

export const clearPhoto = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } announce(); };

// Lit, contrôle, recadre et enregistre. Renvoie { ok: true, dataUrl } ou { ok: false, error } (message en français).
export const savePhotoFromFile = (file) => new Promise((resolve) => {
  if (!file) return resolve({ ok: false, error: 'Aucun fichier choisi.' });
  if (!PHOTO_TYPES.includes(file.type)) return resolve({ ok: false, error: 'Format non pris en charge : choisis une image JPG, PNG ou WebP.' });
  if (file.size > PHOTO_MAX_BYTES) return resolve({ ok: false, error: 'Image trop lourde (8 Mo maximum).' });
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      const size = 256;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      localStorage.setItem(KEY, dataUrl);
      announce();
      resolve({ ok: true, dataUrl });
    } catch {
      resolve({ ok: false, error: 'Impossible d’enregistrer la photo dans ce navigateur (espace plein ou navigation privée).' });
    } finally { URL.revokeObjectURL(url); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, error: 'Ce fichier n’est pas une image lisible.' }); };
  img.src = url;
});
