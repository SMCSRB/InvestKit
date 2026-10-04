// Impôt annuel sur les revenus fonciers selon le régime (micro-foncier ou réel). Fonctions pures : aucune base, aucun réseau. Règles dans config/rentTaxRules.ts (chiffres [à relire]).
// Le moteur actuel ne les lit pas (voir RENT_TAX_REGIMES_ENABLED) ; elles servent à la simulation et à préparer le branchement.
import { MICRO_FONCIER, REAL_REGIME } from '../../config/rentTaxRules';
import { round2, assertNonNegative, assertFinite } from './money';

export interface RentTaxInput {
  grossRentEur: number;            // loyers encaissés dans l'année (charges récupérables exclues)
  otherChargesEur: number;         // charges déductibles hors intérêts : taxe foncière, copropriété non récupérable, assurance, entretien et réparations
  loanInterestEur: number;         // intérêts d'emprunt + assurance emprunteur + frais de dossier
  carriedDeficitEur?: number;      // déficits fonciers des années précédentes encore reportables
  irMarginalPct: number;           // tranche marginale de l'impôt sur le revenu (choix de jeu du profil)
  socialChargesPct: number;
}

export interface RentTaxResult {
  regime: 'micro' | 'real';
  eligible: boolean;               // micro : revenus bruts ≤ plafond ; réel : toujours
  taxableBaseEur: number;          // base commune à l'IR et aux prélèvements sociaux (jamais négative)
  incomeTaxEur: number;
  socialChargesEur: number;
  deficitOnGlobalIncomeEur: number;   // réel seulement : déficit imputé sur le revenu global
  incomeTaxSavingOnGlobalEur: number; // économie d'IR correspondante (IR sur autres revenus), non déduite de incomeTaxEur
  deficitCarriedEur: number;          // réel seulement : déficit reporté (10 ans)
  totalTaxEur: number;             // IR + prélèvements sociaux − économie d'IR sur le revenu global (peut être négatif : seulement si le déficit s'impute)
}

const check = (i: RentTaxInput): void => {
  assertNonNegative(i.grossRentEur, 'grossRentEur'); assertNonNegative(i.otherChargesEur, 'otherChargesEur'); assertNonNegative(i.loanInterestEur, 'loanInterestEur');
  assertNonNegative(i.carriedDeficitEur ?? 0, 'carriedDeficitEur');
  assertFinite(i.irMarginalPct, 'irMarginalPct'); assertFinite(i.socialChargesPct, 'socialChargesPct');
};

export const microFoncierTax = (i: RentTaxInput): RentTaxResult => {
  check(i);
  const eligible = i.grossRentEur <= MICRO_FONCIER.ceilingEur;
  const base = round2(i.grossRentEur * (1 - MICRO_FONCIER.abatementPct / 100));
  const incomeTaxEur = round2(base * i.irMarginalPct / 100); const socialChargesEur = round2(base * i.socialChargesPct / 100);
  return { regime: 'micro', eligible, taxableBaseEur: base, incomeTaxEur, socialChargesEur, deficitOnGlobalIncomeEur: 0, incomeTaxSavingOnGlobalEur: 0, deficitCarriedEur: 0, totalTaxEur: round2(incomeTaxEur + socialChargesEur) };
};

export const realRegimeTax = (i: RentTaxInput): RentTaxResult => {
  check(i);
  const result = round2(i.grossRentEur - i.otherChargesEur - i.loanInterestEur);
  let base = 0; let onGlobal = 0; let carried = 0;
  if (result >= 0) {
    const used = Math.min(result, i.carriedDeficitEur ?? 0);       // les déficits antérieurs s'imputent d'abord sur les revenus fonciers
    base = round2(result - used); carried = round2((i.carriedDeficitEur ?? 0) - used);
  } else {
    const deficit = -result;
    const nonInterest = Math.max(0, i.otherChargesEur - i.grossRentEur);                // part du déficit hors intérêts : seule imputable sur le revenu global
    onGlobal = round2(Math.min(nonInterest, REAL_REGIME.deficitOnGlobalIncomeCeilingEur));
    carried = round2((i.carriedDeficitEur ?? 0) + deficit - onGlobal);
  }
  const incomeTaxEur = round2(base * i.irMarginalPct / 100); const socialChargesEur = round2(base * i.socialChargesPct / 100);
  const saving = round2(onGlobal * i.irMarginalPct / 100);
  return { regime: 'real', eligible: true, taxableBaseEur: base, incomeTaxEur, socialChargesEur, deficitOnGlobalIncomeEur: onGlobal, incomeTaxSavingOnGlobalEur: saving, deficitCarriedEur: carried, totalTaxEur: round2(incomeTaxEur + socialChargesEur - saving) };
};

// Comparaison indicative : le micro n'est choisi que s'il est permis ET moins cher ; sinon réel.
export const compareRegimes = (i: RentTaxInput): { micro: RentTaxResult; real: RentTaxResult; best: 'micro' | 'real' } => {
  const micro = microFoncierTax(i); const real = realRegimeTax(i);
  return { micro, real, best: micro.eligible && micro.totalTaxEur <= real.totalTaxEur ? 'micro' : 'real' };
};
