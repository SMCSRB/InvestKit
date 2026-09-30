import { round2, assertNonNegative, EngineInputError } from './money';

// ─────────────────────────────────────────────────────────────────────────
// PLUS-VALUE IMMOBILIÈRE À LA REVENTE
//
// Structure de calcul UNIQUEMENT. Les taux, abattements pour durée de
// détention, forfaits et surtaxe sont fixés par la loi et évoluent : ils sont
// fournis par l'appelant (`CapitalGainRules`) et doivent être vérifiés à la
// source officielle avant utilisation réelle (étape 6 du plan). Aucun chiffre
// fiscal n'est écrit ici.
//
//   prix de revient = prix d'achat + frais d'acquisition + travaux
//        (frais et travaux : montants réels, ou forfait si plus avantageux
//         et si la règle le permet)
//   plus-value brute = prix de vente − frais de vente − prix de revient
//   base impôt sur le revenu = plus-value brute × (1 − abattement IR(durée))
//   base prélèvements sociaux = plus-value brute × (1 − abattement PS(durée))
//   impôt = base IR × taux IR + base PS × taux PS + surtaxe éventuelle
//   (une moins-value ne génère aucun impôt, et n'est pas reportable ici)
// ─────────────────────────────────────────────────────────────────────────
export interface CapitalGainRules {
  incomeTaxRatePct: number;
  socialChargesRatePct: number;
  incomeTaxAllowancePct: (yearsHeld: number) => number;    // 0–100
  socialChargesAllowancePct: (yearsHeld: number) => number; // 0–100
  acquisitionFeesForfaitPct?: number; // % du prix d'achat
  worksForfaitPct?: number;           // % du prix d'achat
  worksForfaitMinYears?: number;      // durée minimale de détention pour le forfait travaux
  // Surtaxe sur les plus-values élevées : fonction de la plus-value imposable (après abattement IR).
  surtax?: (taxableGain: number) => number;
}

export interface CapitalGainInput {
  purchasePrice: number;
  acquisitionFees: number; // frais réellement payés (notaire, agence)
  works: number;           // travaux justifiés
  salePrice: number;
  saleFees: number;        // frais de vente à la charge du vendeur
  yearsHeld: number;       // années complètes de détention
}

export interface CapitalGainResult {
  costBasis: number;
  grossGain: number;
  incomeTaxBase: number;
  socialChargesBase: number;
  incomeTax: number;
  socialCharges: number;
  surtax: number;
  totalTax: number;
  netGain: number;         // plus-value brute − impôts
}

const checkAllowance = (v: number, name: string): number => {
  if (!Number.isFinite(v) || v < 0 || v > 100) throw new EngineInputError(`${name} doit être entre 0 et 100 (reçu : ${v})`);
  return v;
};

export const computeCapitalGain = (input: CapitalGainInput, rules: CapitalGainRules): CapitalGainResult => {
  assertNonNegative(input.purchasePrice, 'purchasePrice');
  assertNonNegative(input.acquisitionFees, 'acquisitionFees');
  assertNonNegative(input.works, 'works');
  assertNonNegative(input.salePrice, 'salePrice');
  assertNonNegative(input.saleFees, 'saleFees');
  if (!Number.isInteger(input.yearsHeld) || input.yearsHeld < 0) throw new EngineInputError('yearsHeld doit être un entier ≥ 0');

  // Forfaits : retenus s'ils sont plus avantageux que les montants réels.
  const forfaitFees = ((rules.acquisitionFeesForfaitPct ?? 0) / 100) * input.purchasePrice;
  const worksForfaitAllowed = input.yearsHeld >= (rules.worksForfaitMinYears ?? Infinity);
  const forfaitWorks = worksForfaitAllowed ? ((rules.worksForfaitPct ?? 0) / 100) * input.purchasePrice : 0;
  const fees = Math.max(input.acquisitionFees, forfaitFees);
  const works = Math.max(input.works, forfaitWorks);

  const costBasis = round2(input.purchasePrice + fees + works);
  const grossGain = round2(input.salePrice - input.saleFees - costBasis);

  if (grossGain <= 0) {
    return { costBasis, grossGain, incomeTaxBase: 0, socialChargesBase: 0, incomeTax: 0, socialCharges: 0, surtax: 0, totalTax: 0, netGain: grossGain };
  }

  const incomeTaxBase = round2(grossGain * (1 - checkAllowance(rules.incomeTaxAllowancePct(input.yearsHeld), 'abattement IR') / 100));
  const socialChargesBase = round2(grossGain * (1 - checkAllowance(rules.socialChargesAllowancePct(input.yearsHeld), 'abattement PS') / 100));
  const incomeTax = round2((incomeTaxBase * rules.incomeTaxRatePct) / 100);
  const socialCharges = round2((socialChargesBase * rules.socialChargesRatePct) / 100);

  const surtax = rules.surtax ? round2(Math.max(0, rules.surtax(incomeTaxBase))) : 0;

  const totalTax = round2(incomeTax + socialCharges + surtax);
  return { costBasis, grossGain, incomeTaxBase, socialChargesBase, incomeTax, socialCharges, surtax, totalTax, netGain: round2(grossGain - totalTax) };
};

// Produit net de la vente : ce qui reste après frais, remboursement du capital
// restant dû (et indemnités éventuelles) et impôt.
export const computeSaleProceeds = (params: {
  salePrice: number;
  saleFees: number;
  remainingLoanBalance: number;
  earlyRepaymentPenalty?: number;
  totalTax: number;
}): number => {
  assertNonNegative(params.salePrice, 'salePrice');
  assertNonNegative(params.saleFees, 'saleFees');
  assertNonNegative(params.remainingLoanBalance, 'remainingLoanBalance');
  assertNonNegative(params.totalTax, 'totalTax');
  return round2(params.salePrice - params.saleFees - params.remainingLoanBalance - (params.earlyRepaymentPenalty ?? 0) - params.totalTax);
};
