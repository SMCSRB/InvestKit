// Mentions obligatoires sur l'origine des chiffres de l'Immobilier (règle d'Andreja, 5 octobre 2026) : fonctions pures, partagées par la fiche et les cartes.
export const GAME_VALUE_LABEL = 'valeur de jeu';
export const GAME_VALUE_HELP = 'Valeur de jeu, non sourcée, à reconfirmer : aucune source ouverte ne donne ce chiffre pour cette commune.';

// Ce champ est-il une valeur de jeu ? (`sources` = champ `dataSources` renvoyé par le serveur ; absent = on marque par prudence)
export const isGameValue = (sources, field) => !sources || !Array.isArray(sources.gameValues) || sources.gameValues.includes(field);

const eur1 = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFr = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };

// Libellés du loyer : « Loyer moyen de la commune » avec l'attribution de la source quand c'est un loyer réel ; sinon « Loyer de référence » marqué valeur de jeu.
export const rentInfo = (sources) => {
  const r = sources && sources.rent;
  if (r && r.kind === 'anil') {
    return {
      real: true,
      label: 'Loyer moyen de la commune',
      source: `${r.nature} Millésime ${r.vintage} (biens mis en location au 3e trimestre ${r.vintage}, observés jusqu'au ${dateFr(r.snapshotDate)}). Fourchette : ${eur1(r.lowEurM2)} à ${eur1(r.highEurM2)} €/m²/mois.`,
      approximation: r.approximation || null,
      estimate: r.estimate === 'maille' ? 'Estimation sur un groupe de communes voisines (peu d\'annonces dans la commune).' : null,
      attribution: r.attribution,
    };
  }
  if (r && r.kind === 'none') return { real: false, unavailable: true, label: 'Loyer', source: null, approximation: null, estimate: null, attribution: null };
  return { real: false, label: 'Loyer de référence', source: null, approximation: null, estimate: null, attribution: null };
};

// Rentabilité : jamais affichée sans loyer (pas de loyer ANIL pour la commune).
export const yieldAvailable = (grossYieldPct) => typeof grossYieldPct === 'number' && Number.isFinite(grossYieldPct);
// Loyer connu ? (source réelle sans loyer : pas de loyer, donc pas de rentabilité)
export const rentKnown = (sources) => !(sources && sources.rent && sources.rent.kind === 'none');
export const NO_YIELD_TEXT = 'Rentabilité non disponible : pas de loyer connu pour cette commune.';
