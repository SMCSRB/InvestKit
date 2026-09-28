import type { BankRules } from '../engine/immo';

// Règles bancaires issues du simulateur de référence (simulateur-ultra-pro.html).
// Ce sont des règles de JEU, ajustables : elles ne prétendent pas refléter une
// banque précise.
export const BANK_RULES: BankRules = {
  maxDebtRatioPct: 35,
  minLivingRemaining: 1200, // fixe dans la référence, quel que soit le foyer (à discuter)
  rentalIncomeWeight: 1,    // la référence compte 100 % des loyers existants
  projectRentWeight: 0,     // loyer futur du bien non retenu (prudent)
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
