// Rédaction des annonces (aucun import React : testable seul). Voir api.js pour les autres outils de l'écran Immobilier.
// Hachage stable (même annonce → même rendu, côté serveur comme navigateur).
export const hash = (str) => { let h = 2166136261; for (let i = 0; i < String(str).length; i += 1) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
// Choix stable d'une tournure. Le décalage de bits doit être NON SIGNÉ (>>>) : avec « >> », un hachage de 32 bits pouvait devenir négatif
// et donner un indice négatif, donc « undefined » dans le texte de l'annonce.
const pick = (arr, seed) => arr[(seed >>> 0) % arr.length];

// Annonce rédigée (français soigné) à partir des vrais champs ; plusieurs tournures choisies de façon stable par identifiant.
export function describeListing(l, city, nbh) {
  const h = hash(l.id);
  if (l.type === 'parking') return describeParking(l, city, nbh, h);
  const kind = { studio: 'studio', apartment: l.rooms >= 4 ? 'grand appartement' : 'appartement', house: 'maison' }[l.type];
  const place = nbh?.name ? `dans le quartier ${nbh.name.toLowerCase() === 'centre' ? 'du centre' : nbh.name === 'Péricentre' ? 'péricentre' : 'périphérique'}` : '';
  const intro = pick([
    `Dans ${city?.name ?? 'cette ville'}, ${kind} de ${l.surfaceSqm} m² ${place}, ${l.rooms} pièce${l.rooms > 1 ? 's' : ''}.`,
    `${l.type === 'house' ? 'Maison' : 'Bien'} de ${l.surfaceSqm} m² à ${city?.name ?? 'proximité'}, ${place}. ${l.rooms} pièce${l.rooms > 1 ? 's' : ''} à vivre.`,
    `À ${city?.name ?? 'proximité'}, ${place} : ${kind} de ${l.surfaceSqm} m² en ${l.rooms} pièce${l.rooms > 1 ? 's' : ''}.`,
  ], h);
  const state = {
    good: pick(['Le bien est en bon état : aucun travaux n’est annoncé, vous pouvez le mettre en location rapidement.', 'Entretenu avec soin, il se loue sans travaux.'], h >>> 3),
    to_refresh: pick(['Quelques peintures et finitions à reprendre : un rafraîchissement est à prévoir avant de le louer.', 'À rafraîchir : le budget travaux annoncé est modeste mais à ne pas oublier.'], h >>> 3),
    to_renovate: pick(['À rénover : le prix tient compte d’un chantier important, à chiffrer avec soin.', 'Un vrai projet de rénovation : prix plus bas, mais des travaux conséquents à financer.'], h >>> 3),
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


// Parking : pas de pièces, pas de DPE, pas de travaux ; on parle de la forme, de la demande et des charges réduites.
function describeParking(l, city, nbh, h) {
  const form = l.title.startsWith('Garage') ? 'garage fermé' : l.title.startsWith('Box') ? 'box' : 'place de parking';
  const place = nbh?.name ? `dans le quartier ${nbh.name.toLowerCase() === 'centre' ? 'du centre' : nbh.name === 'Péricentre' ? 'péricentre' : 'périphérique'}` : '';
  const intro = pick([
    `Dans ${city?.name ?? 'cette ville'}, ${form} de ${l.surfaceSqm} m² ${place}.`,
    `${form[0].toUpperCase()}${form.slice(1)} de ${l.surfaceSqm} m² à ${city?.name ?? 'proximité'}, ${place}.`,
  ], h);
  const base = 'Pas de diagnostic énergétique ni de travaux à prévoir : un ticket d’entrée faible et des charges réduites.';
  const market = l.rentalTension >= 0.7 ? 'La demande de stationnement est forte : il se reloue vite.'
    : l.rentalTension >= 0.4 ? 'Demande moyenne : il peut rester vide quelques semaines entre deux locataires.'
      : 'Demande plus faible dans ce quartier : prévoyez des périodes sans locataire.';
  const urgent = l.urgentSale ? ' Vente pressée : le vendeur souhaite conclure vite, ce qui explique un prix sous celui du marché.' : '';
  return `${intro} ${base} ${market}${urgent}`;
}
