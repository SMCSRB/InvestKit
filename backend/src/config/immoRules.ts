import type { BankRules, NotaryFeeRule, ProfileId, RentModelParams, VacancyParams, UnitType, EnergyClass } from '../engine/immo';

// Règles bancaires. Ce sont des règles de JEU, ajustables : elles ne prétendent
// pas refléter une banque précise.
//
// - Plafond d'endettement 35 % (assurance comprise) : plafond fixé par le HCSF,
//   également repris du simulateur de référence.
// - Loyers (existants ET prévisionnel du bien) retenus à 70 % : pratique bancaire courante (décote pour
//   vacance, charges et fiscalité), pas une règle légale. Vérifié le 2026-09-28
//   sur des sources de presse/courtage, PAS sur un texte officiel : à
//   reconfirmer auprès d'un courtier avant de considérer le chiffre figé.
// - Reste à vivre : seuil PAR PROFIL. Valeurs provisoires (student/executive :
//   à valider ; employee = 1 200 €, valeur du simulateur de référence).
//   Le calcul par foyer (adultes, enfants) est prêt : mettre des majorations
//   non nulles ci-dessous l'active.
export const BANK_RULES: BankRules = {
  maxDebtRatioPct: 35,
  livingRemainingByProfile: { student: 500, employee: 1200, executive: 1800 },
  livingRemainingPerExtraAdult: 0,
  livingRemainingPerChild: 0,
  rentalIncomeWeight: 0.7,   // loyers déjà perçus : 70 % retenus
  projectRentWeight: 0.7,    // loyer prévisionnel du bien acheté : 70 % retenus
  // Apport minimum : au moins les frais de notaire (décision produit). Modifiable.
  minDownPaymentPctOfNotaryFees: 100,
  // Durée : 25 ans, 27 ans pour un achat avec travaux importants (règle du HCSF,
  // vérifiée sur des sources de presse/courtage le 2026-09-29, pas sur le texte
  // officiel : à reconfirmer). Le HCSF cite aussi les VEFA (neuf) et la
  // construction de maison, absentes du catalogue actuel (différé d'amortissement
  // non modélisé : on plafonne la durée totale à 27 ans dans ce cas).
  maxLoanMonths: 300,
  maxLoanMonthsWithWorks: 324,
  majorWorksMinPctOfLoan: 10,
};

// Assurance emprunteur (% par an du capital emprunté) et frais de dossier :
// valeurs de JEU. Frais de dossier repris du simulateur de référence
// (max(200 €, 0,2 % du capital)). Pas de frais de garantie pour l'instant.
export const LOAN_INSURANCE_RATE_PCT = 0.36;
export const loanApplicationFee = (principal: number): number => Math.max(200, Math.round(principal * 0.002 * 100) / 100);

// Expertise avant achat : coût en euros (converti en pièces, arrondi au-dessus).
export const expertiseCostEuros = (price: number): number => Math.round(300 + price * 0.0015);

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
  capOverMeanFactor: 1.5, // vacance plafonnée à 1,5 × la durée moyenne attendue (au loyer demandé courant)
  askingRentRatioMin: 0.7,
  askingRentRatioMax: 1.3,
};

// Durée moyenne d'un bail avant changement de locataire (mois), par type.
export const TENANCY_MONTHS: Record<UnitType, number> = { studio: 24, apartment: 36, house: 48 };

// Rénovation lourde (règle de JEU) : un bien « à rénover » dont les travaux sont
// payés passe en bon état et gagne 2 classes énergétiques, sans dépasser C.
export const RENOVATION_RULES: { levels: number; bestClass: EnergyClass } = { levels: 2, bestClass: 'C' };

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
