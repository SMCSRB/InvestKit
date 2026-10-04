// Frais de notaire d'un achat dans l'ancien, par département et par date de jeu (fonctions pures). Voir config/notaryRules.ts pour les sources (toutes à relire).
import type { NotaryFeeRule } from './acquisition';
import { NOTARY_NEW_PCT, CSI_PCT, DMTO_RAISED_FROM, DMTO_RAISED_FROM_DEFAULT, DMTO_RAISED_PCT, DMTO_STANDARD_PCT, DMTO_STAYED_STANDARD, EMOLUMENTS_BRACKETS, NOTARY_VAT_PCT } from '../../config/notaryRules';

// Taux global des droits de mutation du département à la date de jeu (AAAA-MM-JJ). Avant la hausse (ou dans un département resté à 4,5 %) : 5,80665 %. Jamais une date future.
export const dmtoPctAt = (department: string, day: string): number => {
  if (DMTO_STAYED_STANDARD.includes(department)) return DMTO_STANDARD_PCT;
  const from = DMTO_RAISED_FROM[department] ?? DMTO_RAISED_FROM_DEFAULT;
  return day >= from ? DMTO_RAISED_PCT : DMTO_STANDARD_PCT;
};

// Émoluments proportionnels hors taxes : somme par tranche.
export const emolumentsHT = (price: number): number => {
  let left = price; let prev = 0; let total = 0;
  for (const b of EMOLUMENTS_BRACKETS) {
    const slice = Math.min(left, b.upTo - prev);
    if (slice <= 0) break;
    total += (slice * b.ratePct) / 100; left -= slice; prev = b.upTo;
  }
  return total;
};

export interface NotaryBreakdown { dmto: number; emoluments: number; vat: number; csi: number; total: number; pct: number; dmtoPct: number }
const r2 = (n: number): number => Math.round(n * 100) / 100;

export const notaryFeesOld = (price: number, department: string, day: string): NotaryBreakdown => {
  if (!(price > 0)) throw new Error('Prix invalide.');
  const dmtoPct = dmtoPctAt(department, day);
  const dmto = (price * dmtoPct) / 100; const em = emolumentsHT(price); const vat = (em * NOTARY_VAT_PCT) / 100; const csi = (price * CSI_PCT) / 100;
  const total = dmto + em + vat + csi;
  return { dmto: r2(dmto), emoluments: r2(em), vat: r2(vat), csi: r2(csi), total: r2(total), pct: r2((total / price) * 100), dmtoPct };
};

// Règle de notaire (en % du prix) EXACTE pour un achat dans l'ancien : le taux effectif est total ÷ prix, NON arrondi, donc computeNotaryFees (prix × taux, arrondi au centime) redonne le total au centime près.
// Le neuf reste au taux forfaitaire (NOTARY_NEW_PCT). Le prix compte : le barème est dégressif.
export const notaryRuleFor = (price: number, department: string, day: string): NotaryFeeRule => {
  if (!(price > 0)) throw new Error('Prix invalide.');
  const f = notaryFeesOld(price, department, day);
  return { oldRatePct: (f.total / price) * 100, newRatePct: NOTARY_NEW_PCT };
};
