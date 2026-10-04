import type { Listing } from '../../data/realEstate/types';
import { round2 } from './money';
import { computeNotaryFees, NotaryFeeRule } from './acquisition';
import { buildSchedule } from './loan';
import { computeIndicators } from './indicators';
import type { BankRules } from './affordability';

// ─────────────────────────────────────────────────────────────────────────
// SCÉNARIO STANDARD D'UNE ANNONCE : rendement net et flux mensuel, pour la carte et la fiche.
//
// PUR et indépendant de la source du catalogue : il ne lit QUE les champs d'une annonce (prix, âge, travaux annoncés, loyer, vacance, charges)
// et des règles fournies par l'appelant. Il marche donc avec le catalogue fictif comme avec un futur catalogue de vraies villes.
//
// Hypothèses (affichées au joueur) : apport minimal exigé par la banque (frais de notaire + part du prix), prêt sur la durée standard
// (raccourcie par la règle des gros travaux), taux de l'année, assurance emprunteur.
//   flux mensuel = loyer × occupation − charges ÷ 12 − mensualité (assurance comprise)
//   rendement net = (loyers encaissés − charges) ÷ (prix + frais de notaire + travaux annoncés)
// ─────────────────────────────────────────────────────────────────────────
export type ScenarioListing = Pick<Listing, 'price' | 'age' | 'advertisedWorks' | 'marketRentMonthly' | 'vacancyPct' | 'annualCharges'>;

export interface ScenarioContext {
  annualRatePct: number;          // taux nominal de l'année pour la durée standard
  standardMonths: number;         // durée standard demandée (ex. 300)
  insuranceRatePct: number;
  notaryRule: NotaryFeeRule;
  bankRules: BankRules;
}

export interface StandardScenario {
  notaryFees: number;
  totalInvestment: number;
  downPayment: number;            // apport minimal exigé
  loanPrincipal: number;
  loanMonths: number;
  annualRatePct: number;
  monthlyLoanPayment: number;     // assurance comprise
  collectedMonthlyRent: number;   // loyer × occupation attendue (vacance déduite)
  monthlyCharges: number;
  monthlyCashFlow: number;        // loyer encaissé − charges − mensualité (négatif : le joueur complète chaque mois)
  grossYieldPct: number | null;
  netYieldPct: number | null;
  chargesRatioPct: number | null; // charges ÷ loyers encaissés
}

export const standardScenario = (l: ScenarioListing, ctx: ScenarioContext): StandardScenario => {
  const notaryFees = computeNotaryFees(l.price, l.age, ctx.notaryRule);
  const totalInvestment = round2(l.price + notaryFees + l.advertisedWorks);
  const requiredDown = round2((notaryFees * ctx.bankRules.minDownPaymentPctOfNotaryFees) / 100 + (l.price * ctx.bankRules.minDownPaymentPctOfPrice) / 100);
  const downPayment = Math.min(totalInvestment, requiredDown);
  const loanPrincipal = round2(Math.max(0, totalInvestment - downPayment));
  const majorWorks = ctx.bankRules.maxLoanMonthsWithWorks > 0 && loanPrincipal > 0 && (l.advertisedWorks / loanPrincipal) * 100 >= ctx.bankRules.majorWorksMinPctOfLoan;
  const loanMonths = Math.min(ctx.standardMonths, majorWorks ? ctx.bankRules.maxLoanMonthsWithWorks : ctx.bankRules.maxLoanMonths);
  const monthlyLoanPayment = loanPrincipal > 0
    ? buildSchedule({ principal: loanPrincipal, annualRatePct: ctx.annualRatePct, months: loanMonths, insurance: { annualRatePct: ctx.insuranceRatePct, basis: 'initial' } }).rows[0].totalPayment
    : 0;
  const annualCharges = l.annualCharges.condoFees + l.annualCharges.propertyTax + l.annualCharges.insurance + l.annualCharges.maintenance;
  const ind = computeIndicators({
    totalInvestment, loanPrincipal, monthlyRent: l.marketRentMonthly, occupancyPct: Math.min(100, Math.max(0, 100 - l.vacancyPct)),
    annualCharges, monthlyLoanPayment,
  });
  return {
    notaryFees: round2(notaryFees), totalInvestment, downPayment: round2(downPayment), loanPrincipal, loanMonths, annualRatePct: ctx.annualRatePct,
    monthlyLoanPayment: round2(monthlyLoanPayment), collectedMonthlyRent: round2(ind.collectedAnnualRent / 12), monthlyCharges: round2(annualCharges / 12),
    monthlyCashFlow: ind.monthlyCashFlow, grossYieldPct: ind.grossYieldPct, netYieldPct: ind.netYieldPct, chargesRatioPct: ind.chargesRatioPct,
  };
};
