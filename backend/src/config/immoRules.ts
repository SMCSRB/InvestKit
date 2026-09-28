import type { BankRules, NotaryFeeRule, ProfileId, RentModelParams, VacancyParams, UnitType } from '../engine/immo';

// Règles bancaires. Ce sont des règles de JEU, ajustables : elles ne prétendent
// pas refléter une banque précise.
//
// - Plafond d'endettement 35 % (assurance comprise) : plafond fixé par le HCSF,
//   également repris du simulateur de référence.
// - Loyers existants retenus à 70 % : pratique bancaire courante (décote pour
//   vacance, charges et fiscalité), pas une règle légale. Vérifié le 2026-09-28
//   sur des sources de presse/courtage, PAS sur un texte officiel : à
//   reconfirmer auprès d'un courtier avant de considérer le chiffre figé.
// - Loyer futur du bien : non retenu (prudent, à discuter).
// - Reste à vivre : seuil PAR PROFIL. Valeurs provisoires (student/executive :
//   à valider ; employee = 1 200 €, valeur du simulateur de référence).
//   Le calcul par foyer (adultes, enfants) est prêt : mettre des majorations
//   non nulles ci-dessous l'active.
export const BANK_RULES: BankRules = {
  maxDebtRatioPct: 35,
  livingRemainingByProfile: { student: 500, employee: 1200, executive: 1800 },
  livingRemainingPerExtraAdult: 0,
  livingRemainingPerChild: 0,
  rentalIncomeWeight: 0.7,
  projectRentWeight: 0,
};

// Profils de départ (situation fictive du joueur). Valeurs provisoires de JEU.
export interface StartingProfile {
  label: string;
  netMonthlyIncome: number;  // €/mois
  livingCharges: number;     // €/mois hors crédits
}
export const STARTING_PROFILES: Record<ProfileId, StartingProfile> = {
  student: { label: 'Étudiant', netMonthlyIncome: 900, livingCharges: 300 },
  employee: { label: 'Salarié', netMonthlyIncome: 2400, livingCharges: 900 },
  executive: { label: 'Cadre', netMonthlyIncome: 4500, livingCharges: 1500 },
};

// Frais de notaire (jeu). Fourchettes officielles : ancien 7–8 % du prix,
// neuf 2–3 % (sources : economie.gouv.fr, impots.gouv.fr, notaires.fr,
// consultées le 2026-09-28 via extraits de recherche ; les pages elles-mêmes
// étaient inaccessibles depuis l'environnement de développement). On retient
// le milieu de fourchette. Le taux réel dépend du département (droits de
// mutation) : simplification assumée. À reconfirmer avant mise en production.
export const NOTARY_RULE: NotaryFeeRule = { oldRatePct: 7.5, newRatePct: 2.5 };

// ── Modèle de loyers (réglages de JEU, voir engine/immo/rent.ts) ──────────
export const RENT_MODEL: RentModelParams = {
  conditionFactors: { good: 1, to_refresh: 0.93, to_renovate: 0.85 },
  energyFactors: { A: 1.03, B: 1.02, C: 1, D: 1, E: 0.97, F: 0.92, G: 0.88 },
  smallSurfaceThresholdSqm: 45,
  smallSurfaceMaxBonusPct: 35,
};

export const VACANCY_MODEL: VacancyParams = {
  minMonths: 0.5,
  maxMonths: 5,
  maxSampledMonths: 24,
  askingRentRatioMin: 0.7,
  askingRentRatioMax: 1.3,
};

// Durée moyenne d'un bail avant changement de locataire (mois), par type.
export const TENANCY_MONTHS: Record<UnitType, number> = { studio: 24, apartment: 36, house: 48 };

// Fiscalité simplifiée du socle : taux appliqué aux loyers encaissés, par
// profil. Valeurs de JEU (pas des taux légaux) ; les régimes réels
// (micro-foncier, réel, LMNP…) sont des extensions, à vérifier à la source.
export const RENT_TAX_RATE_BY_PROFILE: Record<ProfileId, number> = { student: 15, employee: 30, executive: 45 };

// Conversion de jeu : 1 🪙 = 20 € en Immobilier (décision produit).
export const EUROS_PER_COIN = 20;

// ─────────────────────────────────────────────────────────────────────────
// À VÉRIFIER À LA SOURCE OFFICIELLE avant mise en service (rien n'est écrit
// de mémoire) : fiscalité de la
// plus-value (taux, abattements, forfaits, surtaxe), calendrier des
// diagnostics de performance énergétique. Ces valeurs seront ajoutées ici, avec
// leur source et leur date de vérification, aux étapes 3 et 6.
// ─────────────────────────────────────────────────────────────────────────
