import type { BankRules, ProfileId } from '../engine/immo';

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

// Conversion de jeu : 1 🪙 = 20 € en Immobilier (décision produit).
export const EUROS_PER_COIN = 20;

// ─────────────────────────────────────────────────────────────────────────
// À VÉRIFIER À LA SOURCE OFFICIELLE avant mise en service (rien n'est écrit
// de mémoire) : taux des frais de notaire (ancien/neuf), fiscalité de la
// plus-value (taux, abattements, forfaits, surtaxe), calendrier des
// diagnostics de performance énergétique. Ces valeurs seront ajoutées ici, avec
// leur source et leur date de vérification, aux étapes 3 et 6.
// ─────────────────────────────────────────────────────────────────────────
