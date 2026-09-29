import { round2, assertNonNegative, assertFinite, EngineInputError } from './money';

// ─────────────────────────────────────────────────────────────────────────
// MODÈLE DE LOYERS
//
// Le loyer n'est JAMAIS figé annonce par annonce : il se calcule à partir de
//   surface × loyer au m² du quartier × effet de taille × état × classe énergie
// Le loyer au m² du quartier = loyer au m² de la ville × multiplicateur du quartier.
// Tous les coefficients sont fournis par l'appelant (RentModelParams,
// config/immoRules.ts) : ce sont des réglages de jeu.
// ─────────────────────────────────────────────────────────────────────────
export type Condition = 'good' | 'to_refresh' | 'to_renovate';
export type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type UnitType = 'studio' | 'apartment' | 'house';

export interface RentModelParams {
  conditionFactors: Record<Condition, number>;   // ex. 1 / 0,93 / 0,85
  energyFactors: Record<EnergyClass, number>;
  smallSurfaceThresholdSqm: number;              // en dessous : loyer au m² majoré
  smallSurfaceMaxBonusPct: number;               // majoration maximale (surface → 0)
}

export interface MarketRentInput {
  surfaceSqm: number;
  cityRentPerSqm: number;          // €/m²/mois, moyenne de la ville
  neighborhoodRentMultiplier: number;
  condition: Condition;
  energyClass: EnergyClass;
}

export interface MarketRent {
  rentPerSqm: number;
  monthlyRent: number;
}

export const estimateMarketRent = (input: MarketRentInput, params: RentModelParams): MarketRent => {
  assertNonNegative(input.surfaceSqm, 'surfaceSqm');
  assertNonNegative(input.cityRentPerSqm, 'cityRentPerSqm');
  assertNonNegative(input.neighborhoodRentMultiplier, 'neighborhoodRentMultiplier');
  const cf = params.conditionFactors[input.condition];
  const ef = params.energyFactors[input.energyClass];
  if (cf === undefined) throw new EngineInputError(`État inconnu : ${input.condition}`);
  if (ef === undefined) throw new EngineInputError(`Classe énergie inconnue : ${input.energyClass}`);

  // Effet de taille : les petites surfaces se louent plus cher au m².
  const shortfall = Math.max(0, params.smallSurfaceThresholdSqm - input.surfaceSqm) / params.smallSurfaceThresholdSqm;
  const sizeFactor = 1 + shortfall * (params.smallSurfaceMaxBonusPct / 100);

  const rentPerSqm = input.cityRentPerSqm * input.neighborhoodRentMultiplier * sizeFactor * cf * ef;
  return { rentPerSqm: round2(rentPerSqm), monthlyRent: round2(rentPerSqm * input.surfaceSqm) };
};

// ─────────────────────────────────────────────────────────────────────────
// VACANCE ENTRE DEUX LOCATAIRES
//
// tension ∈ [0, 1] : 0 = marché détendu (beaucoup d'offre), 1 = très tendu.
//
// Durée moyenne de vacance à loyer de marché :
//     E0(t) = min + (max − min) × (1 − t)²          (mois)
// Effet du niveau de loyer, r = loyer demandé / loyer de marché :
//     r ≤ 1 : facteur = max(0,4 ; 1 − 3 × (1 − r))   (loyer plus bas = relocation plus rapide)
//     r > 1 : facteur = min(4  ; 1 + 6 × (r − 1))    (loyer trop haut = vacance plus longue)
//     durée attendue E = E0(t) × facteur
// Vacance moyenne (% du temps) sur un cycle de location de T mois :
//     100 × E / (T + E)
// La durée effectivement tirée est aléatoire (loi exponentielle de moyenne E),
// à partir d'un générateur DÉTERMINISTE fourni par l'appelant.
// ─────────────────────────────────────────────────────────────────────────
export interface VacancyParams {
  minMonths: number;   // durée moyenne à tension 1 (ex. 0,5)
  maxMonths: number;   // durée moyenne à tension 0 (ex. 5)
  capOverMeanFactor: number;  // plafond de vacance = ceil(facteur × durée moyenne attendue) (ex. 1,5)
  askingRentRatioMin: number; // ex. 0,7
  askingRentRatioMax: number; // ex. 1,3
}

const assertTension = (t: number): void => {
  assertFinite(t, 'tension');
  if (t < 0 || t > 1) throw new EngineInputError(`tension doit être entre 0 et 1 (reçu : ${t})`);
};

export const rentLevelFactor = (ratio: number): number => {
  assertFinite(ratio, 'ratio de loyer');
  if (ratio <= 0) throw new EngineInputError('ratio de loyer doit être > 0');
  return ratio <= 1 ? Math.max(0.4, 1 - 3 * (1 - ratio)) : Math.min(4, 1 + 6 * (ratio - 1));
};

export const expectedVacancyMonths = (tension: number, rentRatio: number, p: VacancyParams): number => {
  assertTension(tension);
  const base = p.minMonths + (p.maxMonths - p.minMonths) * Math.pow(1 - tension, 2);
  return round2(base * rentLevelFactor(rentRatio));
};

export const averageVacancyPct = (tension: number, tenancyMonths: number, p: VacancyParams): number => {
  if (!Number.isFinite(tenancyMonths) || tenancyMonths <= 0) throw new EngineInputError('tenancyMonths doit être > 0');
  const e = expectedVacancyMonths(tension, 1, p);
  return round2((100 * e) / (tenancyMonths + e));
};

// Le loyer demandé à la relocation est borné : on ne peut pas le fixer n'importe où.
export const clampAskingRentRatio = (ratio: number, p: VacancyParams): number => {
  assertFinite(ratio, 'ratio de loyer');
  return Math.min(p.askingRentRatioMax, Math.max(p.askingRentRatioMin, ratio));
};

// Vacance MOIS PAR MOIS. Chaque mois vide, une probabilité de trouver un locataire :
//     p = 1 / (1 + E)        avec E la durée moyenne attendue (ci-dessus)
// (loi géométrique : la durée moyenne de vacance retombe exactement sur E). E
// dépend du loyer demandé ET de la tension : le joueur peut donc baisser son
// loyer en cours de vacance, et la probabilité du mois suivant augmente.
// Plafond : jamais plus de ceil(capOverMeanFactor × E) mois vides, E étant
// calculée au loyer demandé COURANT (baisser le loyer resserre le plafond).
export const monthlyLetProbability = (tension: number, rentRatio: number, p: VacancyParams): number =>
  1 / (1 + expectedVacancyMonths(tension, rentRatio, p));

export const vacancyCapMonths = (tension: number, rentRatio: number, p: VacancyParams): number =>
  Math.max(1, Math.ceil(p.capOverMeanFactor * expectedVacancyMonths(tension, rentRatio, p)));

// Durée moyenne RÉELLE de vacance, plafond compris : Σ_{k=1..cap} (1 − p)^k.
// Plus basse que la durée « nominale » E, car le plafond coupe les longues queues.
export const expectedCappedVacancyMonths = (tension: number, rentRatio: number, p: VacancyParams): number => {
  const prob = monthlyLetProbability(tension, rentRatio, p);
  const cap = vacancyCapMonths(tension, rentRatio, p);
  let sum = 0;
  for (let k = 1; k <= cap; k++) sum += Math.pow(1 - prob, k);
  return round2(sum);
};

// Décision d'un mois. `u` ∈ [0, 1[ vient d'un générateur à graine (fourni par
// l'appelant, un tirage par bien et par mois : reproductible). `elapsedVacantMonths`
// = mois vides déjà écoulés.
export const isTenantFound = (
  u: number, tension: number, rentRatio: number, elapsedVacantMonths: number, p: VacancyParams
): boolean => {
  if (!Number.isInteger(elapsedVacantMonths) || elapsedVacantMonths < 0) throw new EngineInputError('elapsedVacantMonths invalide');
  if (elapsedVacantMonths >= vacancyCapMonths(tension, rentRatio, p)) return true;
  return u < monthlyLetProbability(tension, rentRatio, p);
};

// Simule une vacance complète à loyer constant (statistiques, tests).
// `nextU` fournit un tirage par mois.
export const simulateVacancyMonths = (
  nextU: () => number, tension: number, rentRatio: number, p: VacancyParams
): number => {
  let elapsed = 0;
  while (!isTenantFound(nextU(), tension, rentRatio, elapsed, p)) elapsed += 1;
  return elapsed;
};

// ─────────────────────────────────────────────────────────────────────────
// RÉVISION ANNUELLE (IRL)
//
// Règles (loi n° 89-462 du 6 juillet 1989, art. 17-1 ; Insee) :
//   - la révision a lieu UNE fois par an, à la date prévue au bail ou, à défaut,
//     à la date anniversaire ;
//   - elle ne peut pas dépasser la variation annuelle de l'IRL (indice de
//     référence des loyers, publié chaque trimestre par l'Insee : moyenne sur
//     12 mois des prix à la consommation hors tabac et hors loyers) ;
//   - depuis le 24 août 2022, aucune révision à la hausse pour un logement de
//     classe énergie F ou G (gel des loyers) ; le gel joue aussi à la relocation.
// Vérifié sur des extraits d'Insee / Légifrance / ministère de la Transition
// écologique (2026-09-28) ; les pages officielles étaient inaccessibles depuis
// l'environnement de développement : à reconfirmer.
//
// Simplifications de jeu : le joueur ne choisit PAS la hausse (elle est
// automatique et égale à la variation IRL) ; une variation IRL négative est
// traitée comme 0 (aucune baisse automatique) ; le délai d'un an pour réclamer
// la révision n'est pas modélisé (la révision est toujours appliquée).
// ─────────────────────────────────────────────────────────────────────────
export interface RevisionResult {
  applied: boolean;
  previousRent: number;
  newRent: number;
  appliedPct: number;
  reason: 'APPLIED' | 'FROZEN_ENERGY_F_G' | 'NO_INCREASE';
}

export const FROZEN_ENERGY_CLASSES: EnergyClass[] = ['F', 'G'];

export const reviseRent = (currentRent: number, irlAnnualChangePct: number, energyClass: EnergyClass): RevisionResult => {
  assertNonNegative(currentRent, 'currentRent');
  assertFinite(irlAnnualChangePct, 'irlAnnualChangePct');
  if (FROZEN_ENERGY_CLASSES.includes(energyClass)) {
    return { applied: false, previousRent: currentRent, newRent: currentRent, appliedPct: 0, reason: 'FROZEN_ENERGY_F_G' };
  }
  const pct = Math.max(0, irlAnnualChangePct);
  if (pct === 0) return { applied: false, previousRent: currentRent, newRent: currentRent, appliedPct: 0, reason: 'NO_INCREASE' };
  return {
    applied: true,
    previousRent: currentRent,
    newRent: round2(currentRent * (1 + pct / 100)),
    appliedPct: pct,
    reason: 'APPLIED',
  };
};

// À la relocation : le loyer demandé est borné par le marché (voir
// clampAskingRentRatio) ET, pour un logement F/G, ne peut pas dépasser le
// dernier loyer (gel).
export const capRentAtRelet = (askingRent: number, previousRent: number, energyClass: EnergyClass): number => {
  assertNonNegative(askingRent, 'askingRent');
  assertNonNegative(previousRent, 'previousRent');
  return FROZEN_ENERGY_CLASSES.includes(energyClass) ? Math.min(askingRent, previousRent) : askingRent;
};

// ─────────────────────────────────────────────────────────────────────────
// FISCALITÉ SIMPLIFIÉE (socle) : taux unique sur les loyers encaissés, réglé
// par profil. Les régimes réels et l'encadrement des loyers sont des
// extensions.
// ─────────────────────────────────────────────────────────────────────────
export const computeRentTax = (rentCollected: number, ratePct: number): number => {
  assertNonNegative(rentCollected, 'rentCollected');
  assertNonNegative(ratePct, 'ratePct');
  if (ratePct > 100) throw new EngineInputError('Taux d\'imposition > 100 %');
  return round2((rentCollected * ratePct) / 100);
};

// ─────────────────────────────────────────────────────────────────────────
// CONVERSION EUROS → INVESTCOINS, SANS PERTE NI CRÉATION
//
// Travail en CENTIMES ENTIERS (pas de flottants). Chaque bien garde un
// reliquat en centimes, toujours dans [0, centimes par coin[. À chaque
// opération :
//     total = reliquat + montant                  (le montant peut être négatif)
//     coins = floor(total / centimesParCoin)      (un déficit débite donc l'entier
//                                                  inférieur : l'arrondi joue
//                                                  toujours contre le joueur)
//     nouveau reliquat = total − coins × centimesParCoin
// Invariant garanti : coins × centimesParCoin + nouveau reliquat = reliquat + montant.
// Aucun euro n'est créé ni perdu : seul le reliquat les met en attente.
// ─────────────────────────────────────────────────────────────────────────
export const toCents = (euros: number): number => {
  assertFinite(euros, 'montant');
  return Math.round(euros * 100);
};

export interface CoinConversion {
  coins: number;               // pièces entières à créditer (>0) ou débiter (<0)
  remainderCents: number;      // nouveau reliquat du bien, en [0, centimes par coin[
}

export const convertEurosToCoins = (
  remainderCents: number,
  amountCents: number,
  eurosPerCoin: number
): CoinConversion => {
  if (!Number.isInteger(remainderCents) || !Number.isInteger(amountCents)) {
    throw new EngineInputError('Les montants doivent être en centimes entiers');
  }
  if (!Number.isInteger(eurosPerCoin) || eurosPerCoin < 1) throw new EngineInputError('eurosPerCoin doit être un entier ≥ 1');
  const centsPerCoin = eurosPerCoin * 100;
  if (remainderCents < 0 || remainderCents >= centsPerCoin) throw new EngineInputError('Reliquat hors bornes');
  const total = remainderCents + amountCents;
  const coins = Math.floor(total / centsPerCoin);
  return { coins, remainderCents: total - coins * centsPerCoin };
};
