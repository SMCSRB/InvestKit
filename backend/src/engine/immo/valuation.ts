import { round2, assertNonNegative, EngineInputError } from './money';
import type { Condition, EnergyClass } from './rent';

// ─────────────────────────────────────────────────────────────────────────
// VALORISATION, RÉNOVATION, CALENDRIER
// ─────────────────────────────────────────────────────────────────────────

// Mois suivant. Renvoie null au-delà de la dernière date disponible.
export const nextMonth = (year: number, month: number, maxYear: number): { year: number; month: number } | null => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new EngineInputError('Date invalide');
  if (month === 12) return year + 1 > maxYear ? null : { year: year + 1, month: 1 };
  return { year, month: month + 1 };
};

export const monthTotal = (year: number, month: number): number => year * 12 + month;

const ENERGY_ORDER: EnergyClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Rénovation lourde (bien « à rénover » dont les travaux sont réalisés) : le
// bien passe en bon état et gagne `levels` classes énergétiques, sans dépasser
// `bestClass` (une classe déjà meilleure n'est jamais dégradée). Règle de JEU :
// les travaux ne garantissent pas dans la vraie vie un gain précis.
export const applyRenovation = (
  condition: Condition,
  energyClass: EnergyClass,
  rules: { levels: number; bestClass: EnergyClass }
): { condition: Condition; energyClass: EnergyClass } => {
  if (condition === 'good') return { condition, energyClass };
  if (condition === 'to_refresh') return { condition: 'good', energyClass };
  const current = ENERGY_ORDER.indexOf(energyClass);
  const target = ENERGY_ORDER.indexOf(rules.bestClass);
  const improved = Math.max(current - rules.levels, target);
  return { condition: 'good', energyClass: ENERGY_ORDER[Math.min(current, improved)] };
};

// Valeur d'un bien = prix d'achat × évolution du marché, ramenée à l'état
// actuel. `estimateNow` et `estimateAtPurchase` sont des estimations de la
// source de données pour le MÊME bien (état actuel vs état à l'achat), ce qui
// garde la continuité avec le prix réellement payé (bruit de négociation compris).
export const valueFromMarket = (purchasePrice: number, estimateNow: number, estimateAtPurchase: number): number => {
  assertNonNegative(purchasePrice, 'purchasePrice');
  if (estimateAtPurchase <= 0) throw new EngineInputError('Estimation à l\'achat invalide');
  return round2((purchasePrice * estimateNow) / estimateAtPurchase);
};

// Interpolation linéaire entre deux années (le marché est annuel, la valeur
// suit les mois : (mois − 1) / 12 de l'année écoulée).
export const interpolateByMonth = (valueThisYear: number, valueNextYear: number | null, month: number): number => {
  if (valueNextYear === null) return valueThisYear;
  return round2(valueThisYear + ((valueNextYear - valueThisYear) * (month - 1)) / 12);
};

// Capital restant dû après `monthsPaid` mensualités (0 = capital initial).
export const remainingBalance = (rows: { balanceAfter: number }[], principal: number, monthsPaid: number): number => {
  if (monthsPaid <= 0) return round2(principal);
  if (monthsPaid >= rows.length) return 0;
  return rows[monthsPaid - 1].balanceAfter;
};
