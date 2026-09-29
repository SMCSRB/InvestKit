import { incomeTaxAllowancePct, socialChargesAllowancePct, highGainSurtax } from '../engine/immo/sale';
import type { CapitalGainRules, EventParams, BankRules, NotaryFeeRule, ProfileId, RentModelParams, VacancyParams, UnitType, EnergyClass } from '../engine/immo';

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

// ── Fiscalité des loyers (voir engine/immo/rent.ts pour la base de calcul) ──
// Taux = tranche marginale de l'impôt sur le revenu du profil + prélèvements sociaux.
// Barème de l'impôt sur le revenu 2026 (revenus 2025), part unique : 0 % jusqu'à 11 600 €,
// 11 % jusqu'à 29 579 €, 30 % jusqu'à 84 577 €, 41 % jusqu'à 181 917 €, 45 % au-delà
// (service-public.gouv.fr, extrait de recherche consulté le 2026-09-29 ; loi de finances 2026).
// Tranche retenue selon le revenu net du profil (× 12, abattement forfaitaire de 10 % non
// modélisé) : étudiant ~10,8 k€ (0 % puis 11 % dès que les loyers dépassent le seuil → 11 %),
// salarié ~28,8 k€ (11 %), cadre ~54 k€ (30 %). Foyer d'une seule personne, sans quotient familial.
// Prélèvements sociaux sur revenus fonciers : 17,2 % en 2026 (CSG 9,2 + CRDS 0,5 + prélèvement de
// solidarité 7,5) ; la hausse de la CSG à 10,6 % (total 18,6 %) ne concerne pas les revenus fonciers
// (sources de presse et de conseil, à reconfirmer sur un texte officiel : URSSAF / impots.gouv.fr).
export const INCOME_TAX_MARGINAL_PCT_BY_PROFILE: Record<ProfileId, number> = { student: 11, employee: 11, executive: 30 };
export const SOCIAL_CHARGES_ON_RENT_PCT = 17.2;
export const RENT_TAX_RATE_BY_PROFILE: Record<ProfileId, number> = {
  student: INCOME_TAX_MARGINAL_PCT_BY_PROFILE.student + SOCIAL_CHARGES_ON_RENT_PCT,
  employee: INCOME_TAX_MARGINAL_PCT_BY_PROFILE.employee + SOCIAL_CHARGES_ON_RENT_PCT,
  executive: INCOME_TAX_MARGINAL_PCT_BY_PROFILE.executive + SOCIAL_CHARGES_ON_RENT_PCT,
};

// Conversion de jeu : 1 🪙 = 20 € en Immobilier (décision produit).
export const EUROS_PER_COIN = 20;

// ─────────────────────────────────────────────────────────────────────────
// À VÉRIFIER À LA SOURCE OFFICIELLE avant mise en service (rien n'est écrit
// de mémoire) : fiscalité de la
// plus-value (taux, abattements, forfaits, surtaxe), calendrier des
// diagnostics de performance énergétique. Ces valeurs seront ajoutées ici, avec
// leur source et leur date de vérification, aux étapes 3 et 6.
// ─────────────────────────────────────────────────────────────────────────

// ── Événements aléatoires (réglages de JEU, voir engine/immo/events.ts) ────
// Les DÉLAIS et règles juridiques (préavis 3 mois / 1 mois, dépôt de garantie 1 mois,
// bail de 3 ans, congé du propriétaire 6 mois avant l'échéance) viennent du droit du
// bail d'habitation (extraits de presse/courtage, à reconfirmer sur le texte officiel).
// Les PROBABILITÉS, durées d'occupation, montants de dégradations et de travaux sont
// des choix de jeu, pas des statistiques.
export const EVENT_PARAMS: EventParams = {
  tenants: {
    student: { tenureMonths: 18, lateProbPerMonth: 0.06, defaultProbPerMonth: 0.010, personalNoticeProb: 0.10 },
    worker: { tenureMonths: 36, lateProbPerMonth: 0.03, defaultProbPerMonth: 0.005, personalNoticeProb: 0.20 },
    family: { tenureMonths: 60, lateProbPerMonth: 0.02, defaultProbPerMonth: 0.004, personalNoticeProb: 0.10 },
  },
  tenantMixByUnit: {
    studio: { student: 0.65, worker: 0.3, family: 0.05 },
    apartment: { student: 0.2, worker: 0.5, family: 0.3 },
    house: { student: 0.02, worker: 0.13, family: 0.85 },
  },
  standardNoticeMonths: 3,
  reducedNoticeMonths: 1,
  depositMonths: 1,
  leaseTermMonths: 36,
  landlordNoticeMinMonths: 6,
  defaultEpisode: { resolveProbPerMonth: 0.25, catchUpShare: 0.5, maxMonths: 3 },
  damage: { prob: 0.3, minRentMultiple: 0.2, maxRentMultiple: 1.5 },
  reletFee: { fixed: 150, rentShare: 0.5 },
  unexpectedWorks: {
    probPerMonthByCondition: { good: 0.006, to_refresh: 0.01, to_renovate: 0.015 },
    frMultiplier: 1.5,
    newBuildMultiplier: 0.3,
    minPerSqm: 25,
    maxPerSqm: 120,
  },
};

// ── Revente (étape 6) ─────────────────────────────────────────────────────
// Plus-value immobilière (impots.gouv.fr, extraits consultés le 2026-09-29) : impôt sur le revenu 19 %
// + prélèvements sociaux 17,2 % (la hausse de la CSG à 10,6 % en 2026 ne concerne pas les plus-values
// immobilières : service-public.gouv.fr / notaires.fr, loi n° 2025-1403 du 30 décembre 2025, art. 12) ;
// abattements pour durée de détention : voir engine/immo/sale.ts (barème exact) ; forfait de 7,5 % pour
// les frais d'acquisition, de 15 % pour les travaux au-delà de 5 ans de détention ; surtaxe > 50 000 €.
export const CAPITAL_GAIN_RULES: CapitalGainRules = {
  incomeTaxRatePct: 19,
  socialChargesRatePct: 17.2,
  incomeTaxAllowancePct,
  socialChargesAllowancePct,
  acquisitionFeesForfaitPct: 7.5,
  worksForfaitPct: 15,
  worksForfaitMinYears: 5,
  surtax: highGainSurtax,
};

export const SALE_PARAMS = {
  // Frais d'agence à la charge du vendeur : moyenne de 5,78 % TTC estimée par l'Autorité de la concurrence
  // (extrait de presse consulté le 2026-09-29) ; non réglementés, très variables (3 à 8 %).
  agencyFeePct: 5.78,
  // Diagnostics obligatoires (à la charge du vendeur) : ~300 € le dossier complet (extraits de sites de diagnostiqueurs).
  diagnosticsCost: 300,
  // Audit énergétique (maisons et immeubles en monopropriété, classes E/F/G) : coût de JEU, non sourcé.
  energyAuditCost: 800,
  // Prix demandé : fourchette autorisée, en % de la valeur estimée du bien.
  askingRatioMin: 0.85,
  askingRatioMax: 1.10,
  // Bien vendu occupé : décote de JEU (non sourcée) sur le prix demandé.
  occupiedDiscountPct: 10,
  // Délai de vente : même mécanique que la location (probabilité mensuelle, plafond), délais plus longs.
  market: { minMonths: 1.5, maxMonths: 8, capOverMeanFactor: 1.5, askingRentRatioMin: 0.85, askingRentRatioMax: 1.1 },
  // Difficultés de paiement du joueur : vente amiable (décote faible) puis vente forcée (décote de 25 %).
  distress: {
    warningAfterMissedMonths: 3,     // 3 mois d'impayés de suite
    graceMonths: 2,                  // délai laissé pour une vente amiable avant la vente forcée
    amicableDiscountPct: 12,         // vente amiable rapide : décote plus faible
    forcedDiscountPct: 25,           // vente forcée : la décote constatée en adjudication va de 10 à 30 % (moyenne ~30 %)
    // Frais de poursuite : 8 000 à 15 000 € à Paris d'après les extraits ; mis à l'échelle du catalogue.
    proceedingCostsPct: 6, proceedingCostsMin: 4000, proceedingCostsMax: 15000,
  },
  // Rénovation énergétique à la demande du joueur (JEU) : coût au m², gain de classes.
  renovationCostPerSqm: 450,
};

// ── Calage du catalogue (rendement brut, charges) ─────────────────────────
// Réglages de calibration du catalogue fictif : 1 = valeurs d'origine. Les loyers ne sont JAMAIS gonflés ;
// le rendement brut se règle sur le NIVEAU DES PRIX de chaque ville (rendement = loyer × 12 / prix).
export const CATALOG_CALIBRATION: { priceScaleByCity: Record<string, number>; nonRecoverableChargeScale: number } = {
  priceScaleByCity: {},
  nonRecoverableChargeScale: 1,
};
