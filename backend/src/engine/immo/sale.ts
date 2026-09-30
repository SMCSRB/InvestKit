import { round2, assertNonNegative, EngineInputError } from './money';
import { computeCapitalGain, CapitalGainResult, CapitalGainRules } from './capitalGains';
import type { EnergyClass, UnitType } from './rent';

// ─────────────────────────────────────────────────────────────────────────
// REVENTE : frais, remboursement du prêt, indemnité de remboursement anticipé,
// plus-value, dépôt de garantie transféré à l'acquéreur, impôt des loyers de
// l'année en cours. Fonctions PURES ; tous les paramètres viennent de la
// configuration (config/immoRules.ts).
// ─────────────────────────────────────────────────────────────────────────

// Abattements pour durée de détention (années COMPLÈTES de détention), barème
// recopié de impots.gouv.fr / bofip (extraits consultés le 2026-09-29) :
//  - impôt sur le revenu : 0 jusqu'à 5 ans ; 6 % par an de la 6e à la 21e année ;
//    4 % la 22e année ; exonération totale à 22 ans.
//  - prélèvements sociaux : 0 jusqu'à 5 ans ; 1,65 % par an de la 6e à la 21e année ;
//    1,60 % la 22e année ; 9 % par an de la 23e à la 30e année ; exonération à 30 ans.
export const incomeTaxAllowancePct = (yearsHeld: number): number => {
  if (!Number.isInteger(yearsHeld) || yearsHeld < 0) throw new EngineInputError('yearsHeld doit être un entier ≥ 0');
  if (yearsHeld <= 5) return 0;
  if (yearsHeld <= 21) return round2(6 * (yearsHeld - 5)); // 6 % × 16 ans = 96 % à 21 ans
  return 100;                                               // 96 % + 4 % à 22 ans
};

export const socialChargesAllowancePct = (yearsHeld: number): number => {
  if (!Number.isInteger(yearsHeld) || yearsHeld < 0) throw new EngineInputError('yearsHeld doit être un entier ≥ 0');
  if (yearsHeld <= 5) return 0;
  if (yearsHeld <= 21) return round2(1.65 * (yearsHeld - 5)); // 26,40 % à 21 ans
  if (yearsHeld === 22) return 28;                             // + 1,60 %
  if (yearsHeld < 30) return round2(28 + 9 * (yearsHeld - 22)); // + 9 % par an
  return 100;                                                   // exonération à 30 ans
};

// Surtaxe sur les plus-values élevées (art. 1609 nonies G du CGI) : appliquée à la plus-value
// imposable APRÈS abattement, sur l'ENSEMBLE de la plus-value (pas par tranche), seulement au-delà de 50 000 €.
// Paliers de taux (extrait impots.gouv/notaires) : 2 % de 60 001 à 100 000 € ; 3 % de 110 001 à 150 000 € ;
// 4 % de 160 001 à 200 000 € ; 5 % de 210 001 à 250 000 € ; 6 % au-delà de 260 000 €.
// Entre les paliers et de 50 001 à 60 000 €, un LISSAGE évite les sauts. Les coefficients de lissage
// (1/20, 1/10, 15/100, 20/100, 25/100) ne figuraient pas dans l'extrait : ils sont reconstitués et
// vérifiés par la continuité de la courbe à chaque palier (test) ; à reconfirmer sur le texte officiel.
export const highGainSurtax = (gain: number): number => {
  assertNonNegative(gain, 'gain');
  const g = gain;
  if (g <= 50000) return 0;
  if (g <= 60000) return round2(0.02 * g - (60000 - g) / 20);
  if (g <= 100000) return round2(0.02 * g);
  if (g <= 110000) return round2(0.03 * g - (110000 - g) / 10);
  if (g <= 150000) return round2(0.03 * g);
  if (g <= 160000) return round2(0.04 * g - ((160000 - g) * 15) / 100);
  if (g <= 200000) return round2(0.04 * g);
  if (g <= 210000) return round2(0.05 * g - ((210000 - g) * 20) / 100);
  if (g <= 250000) return round2(0.05 * g);
  if (g <= 260000) return round2(0.06 * g - ((260000 - g) * 25) / 100);
  return round2(0.06 * g);
};

// Indemnité de remboursement anticipé (Code de la consommation, L313-47) : le PLUS FAIBLE de
// 6 mois d'intérêts sur le capital remboursé (au taux moyen du prêt) et 3 % du capital restant dû.
// Cas d'exonération légaux (mutation, décès, cessation forcée d'activité) : non modélisés.
export const earlyRepaymentFee = (capitalRemaining: number, annualRatePct: number): number => {
  assertNonNegative(capitalRemaining, 'capitalRemaining');
  assertNonNegative(annualRatePct, 'annualRatePct');
  const sixMonthsInterest = (capitalRemaining * annualRatePct) / 100 / 2;
  return round2(Math.min(sixMonthsInterest, capitalRemaining * 0.03));
};

// Audit énergétique à la vente (extraits ecologie.gouv.fr / service-public, 2026-09-29) : obligatoire pour les
// logements individuels et les immeubles entiers appartenant à un seul propriétaire, PAS pour les appartements
// en copropriété ; classes F et G depuis le 1er avril 2023, E depuis le 1er janvier 2025, D à partir de 2034.
export const energyAuditRequired = (unit: UnitType, energyClass: EnergyClass, saleYear: number, saleMonth: number): boolean => {
  if (unit !== 'house') return false; // studios et appartements du catalogue = copropriété
  const total = saleYear * 12 + saleMonth;
  if (energyClass === 'F' || energyClass === 'G') return total >= 2023 * 12 + 4;
  if (energyClass === 'E') return total >= 2025 * 12 + 1;
  if (energyClass === 'D') return total >= 2034 * 12 + 1;
  return false;
};

// Interdiction de louer selon le DPE (loi Climat et Résilience ; extraits service-public / ecologie.gouv.fr) :
// contrats signés, renouvelés ou reconduits à partir du 1er janvier 2025 (classe G), 2028 (F), 2034 (E).
export const rentalBannedByEnergy = (energyClass: EnergyClass, year: number): boolean => {
  if (energyClass === 'G') return year >= 2025;
  if (energyClass === 'F') return year >= 2028;
  if (energyClass === 'E') return year >= 2034;
  return false;
};

export interface SaleClosingInput {
  salePrice: number;
  capitalRemaining: number;       // capital restant dû à rembourser à la banque
  loanRatePct: number;            // taux moyen du prêt (hors assurance)
  applyEarlyRepaymentFee: boolean; // faux pour une vente forcée (créancier remboursé sur le prix)
  agencyFeePct: number;           // frais d'agence à la charge du vendeur (0 si vente sans agence / vente forcée)
  diagnosticsCost: number;
  energyAuditCost: number;        // 0 si non requis
  proceedingCosts: number;        // frais de poursuite (vente forcée), 0 sinon
  depositToTransfer: number;      // dépôt de garantie remis à l'acquéreur (bien vendu loué)
  rentalTaxDue: number;           // impôt des loyers de l'année en cours, réglé à la vente
  purchase: { price: number; notaryFees: number; works: number; yearsHeld: number };
  gainRules: CapitalGainRules;
}

export interface SaleClosing {
  salePrice: number;
  loanPayoff: number;
  earlyRepaymentFee: number;
  agencyFees: number;
  diagnostics: number;
  energyAudit: number;
  proceedingCosts: number;
  capitalGain: CapitalGainResult;
  rentalTaxSettled: number;
  depositTransferred: number;
  netProceeds: number;   // peut être NÉGATIF : le prix ne couvre pas la dette (le solde reste dû à la banque)
}

export const computeSaleClosing = (i: SaleClosingInput): SaleClosing => {
  for (const [k, v] of Object.entries({ salePrice: i.salePrice, capitalRemaining: i.capitalRemaining, diagnosticsCost: i.diagnosticsCost, energyAuditCost: i.energyAuditCost, proceedingCosts: i.proceedingCosts, depositToTransfer: i.depositToTransfer, rentalTaxDue: i.rentalTaxDue })) {
    assertNonNegative(v, k);
  }
  const agencyFees = round2((i.salePrice * i.agencyFeePct) / 100);
  const ira = i.applyEarlyRepaymentFee ? earlyRepaymentFee(i.capitalRemaining, i.loanRatePct) : 0;
  // Les frais d'agence à la charge du vendeur viennent en déduction du prix pour la plus-value.
  const capitalGain = computeCapitalGain({
    purchasePrice: i.purchase.price, acquisitionFees: i.purchase.notaryFees, works: i.purchase.works,
    salePrice: i.salePrice, saleFees: agencyFees, yearsHeld: i.purchase.yearsHeld,
  }, i.gainRules);
  const net = round2(
    i.salePrice - i.capitalRemaining - ira - agencyFees - i.diagnosticsCost - i.energyAuditCost - i.proceedingCosts
    - capitalGain.totalTax - i.rentalTaxDue - i.depositToTransfer
  );
  return {
    salePrice: round2(i.salePrice), loanPayoff: round2(i.capitalRemaining), earlyRepaymentFee: ira, agencyFees,
    diagnostics: round2(i.diagnosticsCost), energyAudit: round2(i.energyAuditCost), proceedingCosts: round2(i.proceedingCosts),
    capitalGain, rentalTaxSettled: round2(i.rentalTaxDue), depositTransferred: round2(i.depositToTransfer), netProceeds: net,
  };
};
