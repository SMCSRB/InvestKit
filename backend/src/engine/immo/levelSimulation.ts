// Simulation d'un NIVEAU de difficulté Immobilier : « avec ce capital, ce profil et NOS règles de banque, que peut-on acheter, ville par ville ? ».
// Fonctions pures : elles réutilisent l'évaluation d'achat du jeu (evaluatePurchase), donc la banque simulée est exactement celle du jeu (apport minimal = notaire en entier + 10 % du prix,
// plafond d'endettement 35 %, reste à vivre du profil). Rien n'est écrit, aucune base n'est ouverte.
import { evaluatePurchase, PurchaseEvaluation, ProfileId, PropertyAge, NotaryFeeRule, BankRules } from './index';

export interface LevelScenario {
  capital: number;                 // pièces de départ (1 pièce = 1 euro de jeu)
  profile: ProfileId;
  salary: number; livingCharges: number;
  months: number;                  // durée du prêt demandée
  annualRatePct: number;
  insuranceRatePct: number;
  notaryRule: NotaryFeeRule;
  notaryPctAt?: (price: number) => number;   // frais de notaire de l'ANCIEN en % du prix, par département et par date (voir la fiche de source des frais de notaire) ; absent : le taux forfaitaire de notaryRule
  bankRules: BankRules;
  loanFees: (principal: number) => number;
  age: PropertyAge;
  rentYieldPct: number;            // loyer prévisionnel retenu par la banque = prix × rendement brut / 12 (0 : prudent, sans loyer)
}

export interface Verdict { approved: boolean; reason: string | null; downPayment: number; principal: number; monthly: number }

// Apport maximal possible : tout le capital, moins les frais de dossier (payés comptant). On cherche le plus grand apport qui laisse de quoi payer les frais.
// Règle de notaire applicable à CE prix : dans l'ancien, le taux réel du département si fourni, sinon le taux forfaitaire.
const ruleAt = (s: LevelScenario, price: number): NotaryFeeRule => (s.notaryPctAt && s.age === 'old' ? { ...s.notaryRule, oldRatePct: s.notaryPctAt(price) } : s.notaryRule);
const bestDownPayment = (s: LevelScenario, price: number): number => {
  const rule = ruleAt(s, price);
  const total = price + (s.age === 'old' ? price * rule.oldRatePct / 100 : price * rule.newRatePct / 100);
  let down = Math.min(s.capital, total);
  for (let i = 0; i < 6; i++) {                       // les frais dépendent du capital emprunté, qui dépend de l'apport : quelques passes suffisent
    const principal = Math.max(0, total - down);
    const fees = principal > 0 ? s.loanFees(principal) : 0;
    down = Math.max(0, Math.min(total, s.capital - fees));
  }
  return Math.round(down * 100) / 100;
};

export const assessPurchase = (s: LevelScenario, price: number): Verdict => {
  const downPayment = bestDownPayment(s, price);
  let ev: PurchaseEvaluation;
  try {
    ev = evaluatePurchase({
      household: { profile: s.profile, salary: s.salary, livingCharges: s.livingCharges },
      price, age: s.age, works: 0, projectedMonthlyRent: (price * s.rentYieldPct) / 100 / 12,
      downPayment, loanMonths: s.months, annualRatePct: s.annualRatePct, insuranceRatePct: s.insuranceRatePct,
      notaryRule: ruleAt(s, price), bankRules: s.bankRules, loanFees: s.loanFees,
    });
  } catch (e) { return { approved: false, reason: e instanceof Error ? e.message : 'invalide', downPayment, principal: 0, monthly: 0 }; }
  return { approved: ev.approved, reason: ev.approved ? null : ev.assessment.reasons[0]?.code ?? 'REFUSED', downPayment, principal: ev.principal, monthly: ev.monthlyPaymentWithInsurance };
};

// Plus gros prix accepté par la banque (recherche par dichotomie ; la décision est monotone en pratique : plus cher = plus difficile).
export const maxApprovedPrice = (s: LevelScenario, hi = 2_000_000): number => {
  let lo = 0; let top = hi;
  if (!assessPurchase(s, 1_000).approved) return 0;
  while (top - lo > 50) { const mid = Math.round((lo + top) / 2); if (assessPurchase(s, mid).approved) lo = mid; else top = mid; }
  return lo;
};

export interface UnitKind { id: string; label: string; surface: number; priceFactor: number; marketType: 'a' | 'm' }
// Surfaces et facteurs de prix repris du catalogue du jeu (fictiveCatalog) : on prend le PLUS PETIT bien de chaque type, celui que le joueur le plus contraint pourrait viser
// (studio de 17 à 24 m², T2 de 34 à 46, T3 de 54 à 70, maison de 85 à 110) ; parking de 11 m² à 40 % du prix au m² (PARKING_RULES).
export const UNIT_KINDS: UnitKind[] = [
  { id: 'parking', label: 'Parking (11 m²)', surface: 11, priceFactor: 0.4, marketType: 'a' },
  { id: 'studio', label: 'Studio (17 m², le plus petit du catalogue)', surface: 17, priceFactor: 1.15, marketType: 'a' },
  { id: 't2', label: 'T2 (34 m²)', surface: 34, priceFactor: 1.0, marketType: 'a' },
  { id: 't3', label: 'T3 (54 m²)', surface: 54, priceFactor: 0.95, marketType: 'a' },
  { id: 'house', label: 'Maison (85 m²)', surface: 85, priceFactor: 0.9, marketType: 'm' },
];

export const unitPrice = (k: UnitKind, pricePerM2: number): number => Math.round(k.surface * pricePerM2 * k.priceFactor);

// Surface maximale finançable à un prix au m² donné (sans facteur de type) : repère simple pour juger « jouable ou non ».
export const maxSurfaceAt = (maxPrice: number, pricePerM2: number): number => (pricePerM2 > 0 ? Math.round((maxPrice / pricePerM2) * 10) / 10 : 0);
