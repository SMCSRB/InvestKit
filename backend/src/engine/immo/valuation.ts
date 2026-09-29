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

// Gain de classes énergétiques d'une rénovation (règle de jeu) : `levels` classes, sans dépasser `bestClass`.
// Une classe déjà égale ou meilleure n'est jamais dégradée.
export const applyEnergyRenovation = (energyClass: EnergyClass, rules: { levels: number; bestClass: EnergyClass }): EnergyClass => {
  const current = ENERGY_ORDER.indexOf(energyClass);
  const target = ENERGY_ORDER.indexOf(rules.bestClass);
  return ENERGY_ORDER[Math.min(current, Math.max(current - rules.levels, target))];
};

// Performance d'un joueur en Immobilier : (fonds propres actuels + flux encaissés (loyers nets, reventes) − argent investi)
// / argent investi. Ne retombe pas à zéro après une vente : un gain encaissé reste un gain.
export const computePerformancePctFromEuros = (i: { equity: number; cumulativeCashFlow: number; invested: number }): number => {
  if (i.invested <= 0) return 0;
  return Math.round(((i.equity + i.cumulativeCashFlow - i.invested) / i.invested) * 100 * 1e4) / 1e4;
};

// Performance NETTE DE DETTES d'un joueur avec prêt personnel. Le gain est celui du bien moins les intérêts payés à la banque
// (le capital emprunté s'annule avec la dette). Le dénominateur est le capital PROPRE : investi − part financée par emprunt,
// plancher à 10 % de l'investi (le levier affiché ne dépasse donc jamais ×10). Sans emprunt : identique à la formule d'origine.
export const computeNetPerformance = (i: {
  equity: number; cumulativeCashFlow: number; invested: number; interestPaid: number; borrowedInvested: number;
}): { performancePct: number; leverage: number; ownCapital: number } => {
  if (i.invested <= 0) return { performancePct: 0, leverage: 1, ownCapital: 0 };
  const own = Math.max(i.invested - Math.min(i.invested, Math.max(0, i.borrowedInvested)), i.invested * 0.1);
  const gain = i.equity + i.cumulativeCashFlow - i.invested - i.interestPaid;
  return { performancePct: Math.round((gain / own) * 100 * 1e4) / 1e4, leverage: Math.round((i.invested / own) * 100) / 100, ownCapital: Math.round(own * 100) / 100 };
};
