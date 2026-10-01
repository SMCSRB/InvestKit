// Outils communs de l'écran Immobilier : appels à l'API, formats, libellés, annonces rédigées.
// RIEN ici ne calcule de règle du jeu : les calculs viennent du serveur. Les textes d'annonce sont rédigés à partir des champs réels
// de l'annonce (type, quartier, état, DPE, charges, tension) : aucune donnée n'est inventée pour l'affichage.
const API = `${process.env.NEXT_PUBLIC_API_URL}/realestate`;

export async function call(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.details = data.details; e.status = res.status; throw e; }
  return data;
}

export const clean = (n) => (Math.abs(Number(n ?? 0)) < 0.005 ? 0 : Number(n ?? 0));
export const eur = (n) => `${clean(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
export const eur2 = (n) => `${clean(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const pct = (n, d = 1) => `${Number(n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
export const coins = (n) => `${Math.round(Number(n ?? 0)).toLocaleString('fr-FR')} 🪙`;
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const TYPE_LABEL = { studio: 'Studio', apartment: 'Appartement', house: 'Maison' };
export const CONDITION_LABEL = { good: 'Bon état', to_refresh: 'À rafraîchir', to_renovate: 'À rénover' };
export const STATUS_LABEL = { let: 'Loué', vacant: 'Vide', notice: 'Préavis donné' };
export const DPE_COLORS = { A: '#2f9e5b', B: '#5fb04a', C: '#a6c13a', D: '#e6c52b', E: '#f0a229', F: '#e8742a', G: '#d6453d' };
export const DPE_TEXT = { A: '#06210f', B: '#0c2208', C: '#1d2406', D: '#2a2305', E: '#2e1c03', F: '#2e1403', G: '#fff' };

// Hachage stable (même annonce → même rendu, côté serveur comme navigateur).
export const hash = (str) => { let h = 2166136261; for (let i = 0; i < String(str).length; i += 1) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const pick = (arr, seed) => arr[seed % arr.length];

// Annonce rédigée (français soigné) à partir des vrais champs ; plusieurs tournures choisies de façon stable par identifiant.
export function describeListing(l, city, nbh) {
  const h = hash(l.id);
  const kind = { studio: 'studio', apartment: l.rooms >= 4 ? 'grand appartement' : 'appartement', house: 'maison' }[l.type];
  const place = nbh?.name ? `dans le quartier ${nbh.name.toLowerCase() === 'centre' ? 'du centre' : nbh.name === 'Péricentre' ? 'péricentre' : 'périphérique'}` : '';
  const intro = pick([
    `Dans ${city?.name ?? 'cette ville'}, ${kind} de ${l.surfaceSqm} m² ${place}, ${l.rooms} pièce${l.rooms > 1 ? 's' : ''}.`,
    `${l.type === 'house' ? 'Maison' : 'Bien'} de ${l.surfaceSqm} m² à ${city?.name ?? 'proximité'}, ${place}. ${l.rooms} pièce${l.rooms > 1 ? 's' : ''} à vivre.`,
    `À ${city?.name ?? 'proximité'}, ${place} : ${kind} de ${l.surfaceSqm} m² en ${l.rooms} pièce${l.rooms > 1 ? 's' : ''}.`,
  ], h);
  const state = {
    good: pick(['Le bien est en bon état : aucun travaux n’est annoncé, vous pouvez le mettre en location rapidement.', 'Entretenu avec soin, il se loue sans travaux.'], h >> 3),
    to_refresh: pick(['Quelques peintures et finitions à reprendre : un rafraîchissement est à prévoir avant de le louer.', 'À rafraîchir : le budget travaux annoncé est modeste mais à ne pas oublier.'], h >> 3),
    to_renovate: pick(['À rénover : le prix tient compte d’un chantier important, à chiffrer avec soin.', 'Un vrai projet de rénovation : prix plus bas, mais des travaux conséquents à financer.'], h >> 3),
  }[l.condition];
  const energy = ['A', 'B'].includes(l.energyClass) ? `Très économe en énergie (DPE ${l.energyClass}) : un atout pour le louer.`
    : ['C', 'D'].includes(l.energyClass) ? `Performance énergétique correcte (DPE ${l.energyClass}).`
      : `Performance énergétique faible (DPE ${l.energyClass}) : des travaux d’isolation pourraient devenir nécessaires, et la location de certains logements très énergivores est progressivement interdite.`;
  const market = l.rentalTension >= 0.7 ? 'Le quartier est très demandé par les locataires : les périodes sans locataire sont courtes.'
    : l.rentalTension >= 0.4 ? 'Demande locative moyenne dans le quartier : prévoyez quelques mois de vacance de temps en temps.'
      : 'Marché locatif détendu : trouver un locataire peut prendre du temps.';
  const urgent = l.urgentSale ? ' Vente pressée : le vendeur souhaite conclure vite, ce qui explique un prix sous celui du marché.' : '';
  return `${intro} ${state} ${energy} ${market}${urgent}`;
}

export const listingAlt = (l, city) => `Illustration d’un ${TYPE_LABEL[l.type]?.toLowerCase()} de ${l.surfaceSqm} m² à ${city?.name ?? l.cityId}, ${CONDITION_LABEL[l.condition]?.toLowerCase()}, DPE ${l.energyClass}. Image fictive.`;
