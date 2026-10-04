// Annonces de l'Immobilier RÉEL (12 villes) : ce qui vient de DVF (prix au m² de la zone, quartiles) et d'ANIL (loyer de la commune) est RÉEL ; tout le reste est VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
// PRÉPARATION (PR 3 sur 6 du branchement) : rien dans le moteur actuel ne lit ces annonces (DVF_MARKET_ENABLED = false).
import type { Condition, EnergyClass } from '../data/realEstate/types';

// Types de biens proposés. Surfaces et nombre de pièces : valeurs de jeu (petites surfaces du catalogue actuel). Le parking n'est PAS proposé : aucune donnée réelle (ni prix DVF, ni loyer ANIL).
export interface RealUnitKind { id: 'studio' | 't2' | 't3' | 'house'; type: 'studio' | 'apartment' | 'house'; rooms: number; surfaces: readonly number[]; dvfType: 'apartment' | 'house' }
export const REAL_UNIT_KINDS: readonly RealUnitKind[] = [
  { id: 'studio', type: 'studio', rooms: 1, surfaces: [18, 22, 26], dvfType: 'apartment' },
  { id: 't2', type: 'apartment', rooms: 2, surfaces: [34, 42, 50], dvfType: 'apartment' },
  { id: 't3', type: 'apartment', rooms: 3, surfaces: [54, 62, 70], dvfType: 'apartment' },
  { id: 'house', type: 'house', rooms: 4, surfaces: [85, 100, 120], dvfType: 'house' },
];
export const REAL_KIND_LABEL: Record<RealUnitKind['id'], string> = { studio: 'Studio', t2: 'Appartement T2', t3: 'Appartement T3', house: 'Maison' };

// Nombre d'annonces par zone et par type de bien (une par surface). VALEUR DE JEU.
export const REAL_LISTINGS_PER_KIND = 3;

// Le prix au m² d'une annonce est tiré ENTRE le 1er et le 3e quartile des ventes réelles de la zone (aucun prix hors de la fourchette observée).
// État, âge, classe énergie, travaux : VALEURS DE JEU (le prix DVF est une médiane tous états confondus ; le facteur d'état ajuste autour d'elle).
export const REAL_CONDITION_MIX: readonly { condition: Condition; weight: number; priceFactor: number; worksPerSqm: number }[] = [
  { condition: 'good', weight: 0.7, priceFactor: 1, worksPerSqm: 0 },
  { condition: 'to_refresh', weight: 0.2, priceFactor: 0.94, worksPerSqm: 150 },
  { condition: 'to_renovate', weight: 0.1, priceFactor: 0.78, worksPerSqm: 600 },
];
export const REAL_ENERGY_MIX: readonly { cls: EnergyClass; weight: number }[] = [
  { cls: 'B', weight: 0.1 }, { cls: 'C', weight: 0.25 }, { cls: 'D', weight: 0.3 }, { cls: 'E', weight: 0.2 }, { cls: 'F', weight: 0.1 }, { cls: 'G', weight: 0.05 },
];
export const REAL_NEW_PROBABILITY = 0.1;

// Charges et marché locatif (VALEURS DE JEU : aucune source ouverte par commune ; la taxe foncière reste ici une valeur de jeu jusqu'au branchement des taux réels).
export const REAL_GAME_VALUES = {
  condoPerSqmYear: 30, nonRecoverableShare: 0.35, propertyTaxPerSqmYear: 16, insuranceYear: 120, maintenancePerSqmYear: 6,
  vacancyPct: 6, tenancyMonths: 36, rentalTension: 0.5,
} as const;
