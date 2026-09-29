// Échéancier d'un prêt en PIÈCES, calculé en centièmes de pièce entiers (aucune dérive de flottants dans les totaux).
// Annuité constante ; la dernière échéance solde exactement le capital restant.
export interface CoinRow { n: number; paymentH: number; interestH: number; principalH: number; balanceAfterH: number }
export interface CoinSchedule { principalH: number; months: number; rows: CoinRow[]; totalInterestH: number; totalPaidH: number }

export class BankInputError extends Error {
  constructor(message: string) { super(message); this.name = 'BankInputError'; }
}

export const buildCoinSchedule = (i: { principalCoins: number; annualRatePct: number; months: number }): CoinSchedule => {
  if (!Number.isInteger(i.principalCoins) || i.principalCoins <= 0) throw new BankInputError('Capital invalide (pièces entières > 0)');
  if (!Number.isInteger(i.months) || i.months < 1 || i.months > 600) throw new BankInputError('Durée invalide');
  if (!Number.isFinite(i.annualRatePct) || i.annualRatePct < 0 || i.annualRatePct > 100) throw new BankInputError('Taux invalide');
  const principalH = i.principalCoins * 100;
  const r = i.annualRatePct / 1200;
  const annuityH = r === 0 ? principalH / i.months : (principalH * r) / (1 - Math.pow(1 + r, -i.months));
  const rows: CoinRow[] = [];
  let balance = principalH;
  let totalInterestH = 0;
  for (let n = 1; n <= i.months; n++) {
    const interestH = Math.round(balance * r);
    const last = n === i.months;
    const principalPart = last ? balance : Math.min(balance, Math.round(annuityH) - interestH);
    const paymentH = principalPart + interestH;
    balance -= principalPart;
    totalInterestH += interestH;
    rows.push({ n, paymentH, interestH, principalH: principalPart, balanceAfterH: balance });
  }
  return { principalH, months: i.months, rows, totalInterestH, totalPaidH: principalH + totalInterestH };
};

// Indemnité de remboursement anticipé, en centièmes de pièce (arrondie au-dessus : contre le joueur).
export const earlyRepaymentPenaltyH = (balanceH: number, remainingMonths: number, rules: { longRemainingMonths: number; longPct: number; shortPct: number }): number => {
  if (balanceH < 0 || remainingMonths < 0) throw new BankInputError('Valeurs négatives interdites');
  const pct = remainingMonths > rules.longRemainingMonths ? rules.longPct : rules.shortPct;
  return Math.ceil((balanceH * pct) / 100);
};
