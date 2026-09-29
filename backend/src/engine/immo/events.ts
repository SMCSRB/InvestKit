import { round2, assertNonNegative, assertFinite, EngineInputError } from './money';
import type { Condition, EnergyClass, UnitType } from './rent';

// ─────────────────────────────────────────────────────────────────────────
// ÉVÉNEMENTS ALÉATOIRES D'UN BIEN LOUÉ (moteur pur, sans base de données).
//
// Chaque fonction reçoit ses tirages `u` ∈ [0, 1[ : l'appelant les produit avec
// un générateur à graine (un tirage par partie, bien, mois et sorte
// d'événement), donc TOUT est reproductible et indépendant de l'ordre des
// appels. Tous les paramètres sont des réglages de JEU (config/immoRules.ts).
//
// Règles de droit reprises (extraits de presse/courtage/notaires, 2026-09-29 ;
// pages officielles inaccessibles depuis l'environnement de développement, à
// reconfirmer sur Légifrance / service-public.fr) :
//  - Le LOCATAIRE peut partir à tout moment en donnant congé : préavis de 3 mois
//    en location vide, réduit à 1 mois en zone tendue, en meublé, ou pour un
//    motif personnel justifié (mutation, perte d'emploi, premier emploi, santé…).
//  - Dépôt de garantie : 1 mois de loyer hors charges au maximum (location vide) ;
//    restitué sous 1 mois si l'état des lieux de sortie est conforme, 2 mois sinon
//    (pénalité de 10 % du loyer par mois de retard : non modélisée, la restitution
//    est automatique dans le jeu).
//  - Le BAILLEUR ne peut donner congé qu'À L'ÉCHÉANCE du bail (3 ans en location
//    vide par un particulier), avec 6 mois de préavis, et pour 3 motifs seulement :
//    vendre, reprendre pour habiter (ou loger un proche), motif légitime et sérieux
//    (par ex. impayés répétés). Non modélisé : le meublé (aucun bien meublé au
//    catalogue), la reprise pour habiter (hors sujet pour un jeu d'investissement),
//    le droit de préemption du locataire en cas de vente, l'assurance loyers impayés.
// ─────────────────────────────────────────────────────────────────────────
export type TenantType = 'student' | 'worker' | 'family';

export interface TenantParams {
  tenureMonths: number;        // durée moyenne d'occupation
  lateProbPerMonth: number;    // paie avec un mois de retard
  defaultProbPerMonth: number; // cesse de payer
  personalNoticeProb: number;  // part des départs pour un motif personnel (préavis réduit)
}

export interface EventParams {
  tenants: Record<TenantType, TenantParams>;
  tenantMixByUnit: Record<UnitType, Record<TenantType, number>>; // poids, somme 1
  standardNoticeMonths: number;  // 3
  reducedNoticeMonths: number;   // 1
  depositMonths: number;         // 1 mois de loyer hors charges
  leaseTermMonths: number;       // 36
  landlordNoticeMinMonths: number; // 6
  defaultEpisode: { resolveProbPerMonth: number; catchUpShare: number; maxMonths: number };
  damage: { prob: number; minRentMultiple: number; maxRentMultiple: number };
  reletFee: { fixed: number; rentShare: number };
  unexpectedWorks: {
    probPerMonthByCondition: Record<Condition, number>;
    frMultiplier: number;   // classes énergie F/G
    newBuildMultiplier: number;
    minPerSqm: number;
    maxPerSqm: number;
  };
}

const assertU = (u: number, name: string): void => {
  assertFinite(u, name);
  if (u < 0 || u >= 1) throw new EngineInputError(`${name} doit être dans [0, 1[ (reçu : ${u})`);
};

export const pickTenantType = (u: number, unit: UnitType, p: EventParams): TenantType => {
  assertU(u, 'u');
  let r = u;
  for (const t of ['student', 'worker', 'family'] as TenantType[]) {
    const w = p.tenantMixByUnit[unit][t];
    if (r < w) return t;
    r -= w;
  }
  return 'family';
};

// Probabilité mensuelle de départ : 1 / durée moyenne, ajustée par la ville.
// Marché tendu (tension → 1) : on quitte moins souvent ; détendu : plus souvent.
export const departureHazard = (type: TenantType, tension: number, p: EventParams): number => {
  assertFinite(tension, 'tension');
  const cityFactor = 1.25 - 0.5 * Math.min(1, Math.max(0, tension));
  return Math.min(0.5, cityFactor / p.tenants[type].tenureMonths);
};

export interface NoticeDecision { months: number; reason: 'tense_zone' | 'personal' | 'standard' }

export const noticeFor = (tenseZone: boolean, type: TenantType, uPersonal: number, p: EventParams): NoticeDecision => {
  assertU(uPersonal, 'uPersonal');
  if (tenseZone) return { months: p.reducedNoticeMonths, reason: 'tense_zone' };
  if (uPersonal < p.tenants[type].personalNoticeProb) return { months: p.reducedNoticeMonths, reason: 'personal' };
  return { months: p.standardNoticeMonths, reason: 'standard' };
};

export const isLatePayment = (u: number, type: TenantType, p: EventParams): boolean => (assertU(u, 'u'), u < p.tenants[type].lateProbPerMonth);
export const startsDefaulting = (u: number, type: TenantType, p: EventParams): boolean => (assertU(u, 'u'), u < p.tenants[type].defaultProbPerMonth);

// Fin (ou non) d'un épisode d'impayé, décidée à la fin de chaque mois d'impayé.
//  - `defaultMonths` : mois d'impayé consécutifs, ce mois compris.
//  - au bout de `maxMonths` : la procédure aboutit, le locataire quitte le logement.
export type DefaultOutcome = 'continue' | 'catch_up' | 'leaves';
export const resolveDefault = (defaultMonths: number, uResolve: number, uOutcome: number, p: EventParams): DefaultOutcome => {
  assertU(uResolve, 'uResolve'); assertU(uOutcome, 'uOutcome');
  if (defaultMonths >= p.defaultEpisode.maxMonths) return 'leaves';
  if (uResolve >= p.defaultEpisode.resolveProbPerMonth) return 'continue';
  return uOutcome < p.defaultEpisode.catchUpShare ? 'catch_up' : 'leaves';
};

// Dégradations constatées à l'état des lieux de sortie.
export const rollDamage = (uProb: number, uAmount: number, monthlyRent: number, p: EventParams): number => {
  assertU(uProb, 'uProb'); assertU(uAmount, 'uAmount'); assertNonNegative(monthlyRent, 'monthlyRent');
  if (uProb >= p.damage.prob) return 0;
  const multiple = p.damage.minRentMultiple + uAmount * (p.damage.maxRentMultiple - p.damage.minRentMultiple);
  return round2(monthlyRent * multiple);
};

export const reletFees = (monthlyRent: number, inflation: number, p: EventParams): number => {
  assertNonNegative(monthlyRent, 'monthlyRent');
  return round2(p.reletFee.fixed * inflation + monthlyRent * p.reletFee.rentShare);
};

export const rollUnexpectedWorks = (
  uProb: number, uAmount: number,
  ctx: { condition: Condition; energyClass: EnergyClass; age: 'old' | 'new'; surfaceSqm: number; inflation: number },
  p: EventParams
): number => {
  assertU(uProb, 'uProb'); assertU(uAmount, 'uAmount');
  let prob = p.unexpectedWorks.probPerMonthByCondition[ctx.condition];
  if (prob === undefined) throw new EngineInputError(`État inconnu : ${ctx.condition}`);
  if (ctx.energyClass === 'F' || ctx.energyClass === 'G') prob *= p.unexpectedWorks.frMultiplier;
  if (ctx.age === 'new') prob *= p.unexpectedWorks.newBuildMultiplier;
  if (uProb >= prob) return 0;
  const perSqm = p.unexpectedWorks.minPerSqm + uAmount * (p.unexpectedWorks.maxPerSqm - p.unexpectedWorks.minPerSqm);
  return round2(perSqm * ctx.surfaceSqm * ctx.inflation);
};

// ── Dépôt de garantie à la sortie ─────────────────────────────────────────
export interface DepositSettlement {
  refund: number;            // rendu au locataire
  keptForArrears: number;    // retenu pour impayés (loyers + charges)
  keptForDamages: number;    // retenu pour dégradations
  arrearsLost: number;       // impayés non couverts, perdus
  damagesBeyondDeposit: number; // réparations non couvertes par le dépôt (à ta charge)
}

export const settleDeposit = (
  deposit: number, arrears: number, damages: number
): DepositSettlement => {
  assertNonNegative(deposit, 'deposit'); assertNonNegative(arrears, 'arrears'); assertNonNegative(damages, 'damages');
  const keptForArrears = Math.min(deposit, arrears);
  const remaining = round2(deposit - keptForArrears);
  const keptForDamages = Math.min(remaining, damages);
  return {
    refund: round2(remaining - keptForDamages),
    keptForArrears: round2(keptForArrears),
    keptForDamages: round2(keptForDamages),
    arrearsLost: round2(arrears - keptForArrears),
    damagesBeyondDeposit: round2(damages - keptForDamages),
  };
};

// ── Congé du propriétaire ─────────────────────────────────────────────────
export type LandlordReason = 'sale' | 'legitimate';

export type LandlordNoticeCheck =
  | { ok: true; effectiveTotal: number; monthsUntilTermEnd: number }
  | { ok: false; code: 'INVALID_REASON' | 'TOO_LATE' | 'NO_LEASE' | 'NO_LEGITIMATE_GROUNDS'; message: string; monthsUntilTermEnd?: number };

// `nowTotal`, `leaseStartTotal` : année × 12 + mois. La fin d'un terme est le DERNIER mois du bail
// (début + 36 k − 1). Le congé doit être donné au moins 6 mois avant la fin du terme en cours.
export const checkLandlordNotice = (
  reason: string, nowTotal: number, leaseStartTotal: number | null, arrearsMonthsInLease: number, p: EventParams
): LandlordNoticeCheck => {
  if (reason !== 'sale' && reason !== 'legitimate') {
    return { ok: false, code: 'INVALID_REASON', message: 'Motifs possibles : vente, ou motif légitime et sérieux. (La reprise pour habiter n\'est pas proposée dans ce jeu d\'investissement.)' };
  }
  if (leaseStartTotal === null) return { ok: false, code: 'NO_LEASE', message: 'Aucun bail en cours sur ce bien.' };
  const age = nowTotal - leaseStartTotal;
  const termsDone = Math.floor(age / p.leaseTermMonths);
  const termEnd = leaseStartTotal + (termsDone + 1) * p.leaseTermMonths - 1; // dernier mois du terme en cours
  const monthsUntil = termEnd - nowTotal;
  if (monthsUntil < p.landlordNoticeMinMonths) {
    return {
      ok: false, code: 'TOO_LATE', monthsUntilTermEnd: monthsUntil,
      message: `Trop tard pour ce terme : le congé doit être donné au moins ${p.landlordNoticeMinMonths} mois avant l'échéance du bail (il reste ${monthsUntil} mois). Le bail se renouvelle pour ${p.leaseTermMonths / 12} ans.`,
    };
  }
  if (reason === 'legitimate' && arrearsMonthsInLease < 2) {
    return { ok: false, code: 'NO_LEGITIMATE_GROUNDS', message: 'Un motif légitime et sérieux doit être réel : il faut au moins 2 mois d\'impayés constatés pendant le bail en cours.' };
  }
  return { ok: true, effectiveTotal: termEnd, monthsUntilTermEnd: monthsUntil };
};
