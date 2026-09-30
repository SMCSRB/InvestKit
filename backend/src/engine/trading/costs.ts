import { TRADING_COSTS, TRADING_TAX } from '../../config/tradingRules';

export type AssetKind = 'stock' | 'etf' | 'crypto';
export type Account = 'pea' | 'cto' | 'crypto';

// Courtage en pièces entières, arrondi à l'entier supérieur (contre le joueur, comme le ledger), avec un minimum.
export const brokerageFee = (kind: AssetKind, amountCoins: number): number => {
  if (!TRADING_COSTS.enabled || amountCoins <= 0) return 0;
  const { ratePct, minCoins } = TRADING_COSTS.brokerage[kind];
  return Math.max(minCoins, Math.ceil(Math.round(amountCoins * ratePct * 1e4) / 1e6));
};

export interface TaxState {
  peaOpenedYear: number | null;   // année du premier versement sur le PEA
  peaDeposits: number;            // total versé sur le PEA (plafonné)
  cryptoSales: Record<string, number>; // total des cessions crypto par année simulée
  feesPaid: number;
  taxPaid: number;
}

export const emptyTaxState = (): TaxState => ({ peaOpenedYear: null, peaDeposits: 0, cryptoSales: {}, feesPaid: 0, taxPaid: 0 });

export const readTaxState = (raw: any): TaxState => ({ ...emptyTaxState(), ...(raw && typeof raw === 'object' ? raw : {}) });

export interface SaleTaxInput {
  account: Account;
  year: number;
  proceeds: number;      // produit brut de la vente, en pièces
  basis: number;         // prix de revient (prix moyen pondéré × quantité vendue)
  taxState: TaxState;
}

export interface SaleTax {
  gain: number;          // plus-value (négative = moins-value : aucun impôt, aucun report)
  incomeTax: number;
  social: number;
  total: number;
  note: string | null;   // explication affichée au joueur (exonération, seuil...)
}

const NONE = (gain: number, note: string | null): SaleTax => ({ gain, incomeTax: 0, social: 0, total: 0, note });

// Impôt sur une vente. Arrondi à l'entier supérieur pour chaque composante.
// Simplifications assumées : pas de report des moins-values, frais non déduits de la plus-value, PEA jamais clôturé,
// prélèvements sociaux au taux de l'année de la vente.
export const saleTax = (i: SaleTaxInput): SaleTax => {
  const gain = Math.round((i.proceeds - i.basis) * 1e6) / 1e6;
  if (!TRADING_TAX.enabled) return NONE(gain, null);
  if (gain <= 0) return NONE(gain, gain < 0 ? 'Moins-value : aucun impôt (et elle ne compense pas d\'autres gains dans le jeu).' : null);

  const ps = TRADING_TAX.socialPct(i.year);

  if (i.account === 'crypto') {
    const already = i.taxState.cryptoSales[String(i.year)] ?? 0;
    if (already + i.proceeds <= TRADING_TAX.cryptoDisposalThreshold) {
      return NONE(gain, `Cessions de l'année sous ${TRADING_TAX.cryptoDisposalThreshold} 🪙 : aucune imposition.`);
    }
    const it = TRADING_TAX.incomeTaxPct(i.year, 'crypto');
    return {
      gain, incomeTax: Math.ceil(gain * it / 100), social: Math.ceil(gain * ps / 100),
      total: Math.ceil(gain * it / 100) + Math.ceil(gain * ps / 100),
      note: `Vente de crypto contre euros : imposée (${it} % + ${ps} % de prélèvements sociaux).`,
    };
  }

  const it = TRADING_TAX.incomeTaxPct(i.year, 'securities');
  if (i.account === 'pea') {
    const opened = i.taxState.peaOpenedYear;
    const exempt = opened !== null && i.year - opened >= TRADING_TAX.pea.exemptAfterYears;
    if (exempt) {
      const social = Math.ceil(gain * ps / 100);
      return { gain, incomeTax: 0, social, total: social, note: `PEA de plus de ${TRADING_TAX.pea.exemptAfterYears} ans : pas d'impôt sur le revenu, seulement ${ps} % de prélèvements sociaux.` };
    }
    const incomeTax = Math.ceil(gain * it / 100), social = Math.ceil(gain * ps / 100);
    return { gain, incomeTax, social, total: incomeTax + social, note: `Retrait avant ${TRADING_TAX.pea.exemptAfterYears} ans de PEA : flat tax (${it} % + ${ps} %).` };
  }

  const incomeTax = Math.ceil(gain * it / 100), social = Math.ceil(gain * ps / 100);
  return { gain, incomeTax, social, total: incomeTax + social, note: `Compte-titres : flat tax (${it} % + ${ps} %).` };
};
