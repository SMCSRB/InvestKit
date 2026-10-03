// ─────────────────────────────────────────────────────────────────────────────
// ÉCONOMIE DU JEU : le SEUL fichier où l'on règle les montants en InvestCoins.
//
// Règle de conception : 1 InvestCoin = 1 € de jeu, dans tous les domaines sans exception
// (Bourse et Immobilier aujourd'hui ; la Crypto suivra avec le taux de change de la BCE).
// Les InvestCoins n'existent que dans le jeu : ni boutique, ni retrait, ni achat avec de l'argent réel.
//
// Toutes les valeurs ci-dessous sont des valeurs d'équilibrage : VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.
// Aucune décision de montant ne doit être écrite ailleurs (les services importent ce fichier).
// ─────────────────────────────────────────────────────────────────────────────

// ── Conversion : 1 InvestCoin = 1 € ──────────────────────────────────────────
// Valeur de jeu décidée par le propriétaire (avant : 20 € dans l'Immobilier). Les moteurs Immobilier et Banque
// convertissent encore les euros en pièces par cette constante : la règle « 1 € = 1 InvestCoin » tient donc en un endroit.
export const EUROS_PER_COIN = 1;

// ── Capital de départ ────────────────────────────────────────────────────────
// Offert à l'activation du compte. Un abonné Pro reçoit en plus UN complément unique (une seule fois par compte,
// même après résiliation puis réabonnement) : le Pro démarre donc avec le double.
export const STARTING_CAPITAL = 10_000;
export const PRO_STARTING_BONUS = 10_000;
export const proStartingBonus = (): number => PRO_STARTING_BONUS;

// ── Classement : règle unique pour TOUS les domaines (actuels et futurs) ─────
// Pour apparaître au classement d'un domaine : avoir investi au moins ce montant dans le domaine ET avoir au moins ce
// nombre de jours actifs. Sans seuil, acheter pour 1 InvestCoin une crypto qui fait x100 donnerait +10 000 % et
// écraserait tout le monde. Le critère « jours actifs » est appliqué par la PR du classement (compteur de la PR 2).
export const RANKING_MIN_INVESTED = 2_500;
export const RANKING_MIN_ACTIVE_DAYS = 5;

// ── Dette ─────────────────────────────────────────────────────────────────────
// Garde-fou global sur la dette en cours d'un joueur (capital emprunté non remboursé).
export const MAX_OUTSTANDING_DEBT_COINS = 500_000;

// Capital de base après une procédure de rétablissement : le même que le capital de départ
// (complété seulement si le joueur a moins).
export const RECOVERY_BASE_CAPITAL = STARTING_CAPITAL;

// ── Récompense quotidienne ───────────────────────────────────────────────────
// Montant fixe (pas de série, pas de bonus qui grandit), au plus ce nombre de jours payés par semaine
// (semaine du lundi au dimanche, en UTC). Le serveur décide de tout et chaque versement passe par le registre.
export const DAILY_REWARD_COINS = 10;
export const DAILY_REWARD_MAX_DAYS_PER_WEEK = 3;

// ── Bonus « premiers pas » ───────────────────────────────────────────────────
// Trois bonus uniques par compte (environ 100 pièces au total), sans limite de temps, décidés et plafonnés par le serveur.
// Chacun n'est versé qu'une fois (clé unique en base) et passe par le registre (motif « first_step_bonus »).
// Les clés sont indépendantes de l'affichage : le futur guide « premiers pas » lira leur état (GET /economy/first-steps).
export const FIRST_STEP_BONUSES = {
  first_investment: 30,   // premier achat d'un titre, d'une crypto ou d'un bien (voir montant minimal ci-dessous)
  first_lesson: 30,       // premier chapitre d'éducation validé par le serveur (quiz du chapitre réussi)
  first_quiz: 40,         // premier quiz final de domaine réussi
} as const;
export type FirstStepKey = keyof typeof FIRST_STEP_BONUSES;
export const FIRST_STEPS_TOTAL_COINS = Object.values(FIRST_STEP_BONUSES).reduce((a, b) => a + b, 0);
// Montant minimal d'un premier investissement pour déclencher le bonus (évite un achat symbolique pour toucher la prime).
export const FIRST_STEP_MIN_INVESTMENT_COINS = 100;

// ── Récompenses d'éducation ──────────────────────────────────────────────────
// Versées une seule fois par chapitre ou par domaine terminé, décidées par le serveur.
export const EDUCATION_CHAPTER_COINS = 20;
export const EDUCATION_DOMAIN_COMPLETE_COINS = 100;

// ── Checklist d'accueil ──────────────────────────────────────────────────────
// Par étape réussie, une seule fois.
export const CHECKLIST_REWARD_COINS = 10;
