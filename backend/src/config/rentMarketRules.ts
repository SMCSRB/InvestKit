// Loyers RÉELS de l'Immobilier : « Carte des loyers » (ANIL, ministère du Logement), indicateurs de loyers d'annonce par commune.
// TANT QUE CETTE VALEUR EST FAUSSE, aucun joueur ne voit ces loyers : l'import en base est prêt, pas branché (même principe que les prix DVF).
export const RENT_MARKET_ENABLED = false;
export const RENT_SOURCE_ID = 'anil';

// Attribution demandée par la Licence Ouverte 2.0. [à relire sur la page du jeu de données avant l'ouverture publique : formule exacte, millésime affiché]
export const RENT_ATTRIBUTION = 'Loyers : « Carte des loyers », ANIL estimations, à partir de données Groupe SeLoger et leboncoin (Licence Ouverte 2.0).';
export const RENT_NATURE = 'Loyer moyen de la commune : loyer d\'annonce, charges comprises, logements non meublés.';

// Chaque millésime décrit les biens mis en location au 3e TRIMESTRE de son année : la valeur d'un millésime n'est donc utilisable qu'à partir de la fin de ce trimestre (30 septembre),
// jamais avant (règle « aucun futur » : le jeu ne montre pas à un joueur d'avril un loyer observé en septembre).
export const RENT_SNAPSHOT_MONTH_DAY = '09-30';
export const rentSnapshotDate = (vintage: number): string => `${vintage}-${RENT_SNAPSHOT_MONTH_DAY}`;

// Décision d'Andreja (5 octobre 2026) : le PREMIER millésime est utilisable dès janvier de son année (à défaut de loyer plus ancien), avec une mention claire d'approximation.
// Avant ce 3e trimestre, c'est donc une approximation, jamais une valeur inventée. Entre deux millésimes : loyer constant (un seul changement par an).
export const rentFirstUsableDate = (firstVintage: number): string => `${firstVintage}-01-01`;
export const rentApproximationText = (vintage: number): string => `Estimation ANIL ${vintage}, 3e trimestre (approximation avant cette date)`;
// Avec l'IRL réel importé, le loyer d'avant le 3e trimestre est recalé sur l'évolution réelle de l'IRL entre la date de jeu et le 3e trimestre du millésime ; la mention le dit.
export const rentRecalibrationText = (vintage: number, changePct: number): string =>
  `${rentApproximationText(vintage)}. Loyer recalé sur l'évolution réelle de l'IRL entre la date de jeu et le 3e trimestre ${vintage} (${changePct > 0 ? '+' : changePct < 0 ? '−' : ''}${Math.abs(changePct).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %).`;

// Bornes de plausibilité d'un loyer d'annonce (€/m²/mois, charges comprises) : au-delà, la ligne est refusée (jamais corrigée).
export const RENT_BOUNDS = { minPerM2: 3, maxPerM2: 80 } as const;

// Séries de la carte des loyers.
export const RENT_GROUPS = ['all', 't12', 't3', 'house'] as const;
export type RentGroup = (typeof RENT_GROUPS)[number];
export const RENT_GROUP_LABEL: Record<RentGroup, string> = { all: 'appartements (tous)', t12: 'appartements T1-T2', t3: 'appartements T3 et plus', house: 'maisons' };
// Type de bien du jeu → série. Studio et T2 : T1-T2 ; T3 : T3 et plus ; maison : maisons ; appartement quelconque : tous. Parking : AUCUNE série (valeur de jeu, jamais de loyer ANIL).
export type GameUnit = 'studio' | 't2' | 't3' | 'apartment' | 'house' | 'parking';
export const rentGroupOf = (unit: GameUnit): RentGroup | null => (unit === 'studio' || unit === 't2' ? 't12' : unit === 't3' ? 't3' : unit === 'house' ? 'house' : unit === 'apartment' ? 'all' : null);
