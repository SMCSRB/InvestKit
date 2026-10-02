import { describe, it, expect } from 'vitest';
import { buildCoinSchedule, earlyRepaymentPenaltyH, BankInputError } from '../src/engine/bank';
import { bankBaseRatePct, bankProductRatePct, applyUsuryCap, BANK_SPREAD_POINTS, BANK_BASE_RATE_PCT, USURY_CAP_PCT_BY_YEAR, COIN_DESIGN_RULE } from '../src/config/bankRules';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';

describe('banque : échéancier en pièces (centièmes entiers)', () => {
  it('capital remboursé = capital emprunté, intérêts cohérents, dernière échéance solde exactement', () => {
    for (const [principal, rate, months] of [[1000, 6, 36], [500, 0, 12], [12345, 8.4, 60], [100, 4.5, 7], [50, 12, 84]] as const) {
      const s = buildCoinSchedule({ principalCoins: principal, annualRatePct: rate, months });
      expect(s.rows).toHaveLength(months);
      expect(s.rows.reduce((a, r) => a + r.principalH, 0)).toBe(principal * 100);
      expect(s.rows[months - 1].balanceAfterH).toBe(0);
      expect(s.totalInterestH).toBe(s.rows.reduce((a, r) => a + r.interestH, 0));
      expect(s.totalPaidH).toBe(s.rows.reduce((a, r) => a + r.paymentH, 0));
      for (const r of s.rows) { expect(Number.isInteger(r.paymentH)).toBe(true); expect(r.principalH).toBeGreaterThanOrEqual(0); expect(r.paymentH).toBe(r.principalH + r.interestH); }
    }
  });
  it('annuité constante (sauf la dernière), intérêts décroissants, capital croissant', () => {
    const s = buildCoinSchedule({ principalCoins: 2000, annualRatePct: 7.2, months: 48 });
    const first = s.rows[0].paymentH;
    for (const r of s.rows.slice(0, -1)) expect(Math.abs(r.paymentH - first)).toBeLessThanOrEqual(1);
    expect(s.rows[0].interestH).toBeGreaterThan(s.rows[40].interestH);
    expect(s.rows[0].principalH).toBeLessThan(s.rows[40].principalH);
  });
  it('sans intérêts : mensualités égales', () => {
    const s = buildCoinSchedule({ principalCoins: 1200, annualRatePct: 0, months: 12 });
    expect(s.totalInterestH).toBe(0);
    expect(s.rows[0].paymentH).toBe(10000);
  });
  it('cas de référence : 100 000 € (ici 100 000  InvestCoins) à 3 % sur 20 ans ≈ 554,60 par mois', () => {
    const s = buildCoinSchedule({ principalCoins: 100000, annualRatePct: 3, months: 240 });
    expect(s.rows[0].paymentH / 100).toBeCloseTo(554.6, 1);
  });
  it('entrées invalides refusées', () => {
    for (const bad of [{ principalCoins: 0, annualRatePct: 5, months: 12 }, { principalCoins: 10.5, annualRatePct: 5, months: 12 }, { principalCoins: 100, annualRatePct: -1, months: 12 },
      { principalCoins: 100, annualRatePct: 5, months: 0 }, { principalCoins: 100, annualRatePct: NaN, months: 12 }, { principalCoins: 100, annualRatePct: 5, months: 601 }]) {
      expect(() => buildCoinSchedule(bad)).toThrow(BankInputError);
    }
  });
  it('indemnité de remboursement anticipé : 1 % si plus d\'un an reste, 0,5 % sinon, arrondie au-dessus', () => {
    const rules = { longRemainingMonths: 12, longPct: 1, shortPct: 0.5 };
    expect(earlyRepaymentPenaltyH(100000, 13, rules)).toBe(1000);
    expect(earlyRepaymentPenaltyH(100000, 12, rules)).toBe(500);
    expect(earlyRepaymentPenaltyH(101, 24, rules)).toBe(2);   // 1,01 arrondi à 2
    expect(earlyRepaymentPenaltyH(0, 24, rules)).toBe(0);
    expect(() => earlyRepaymentPenaltyH(-1, 5, rules)).toThrow(BankInputError);
  });
});

describe('banque : taux (base + écart) et règle de conception', () => {
  it('taux de base disponible pour toutes les années du catalogue, jamais négatif', () => {
    for (let y = src.minYear; y <= src.maxYear; y++) expect(bankBaseRatePct(y)).toBeGreaterThanOrEqual(0);
    expect(() => bankBaseRatePct(1999)).toThrow(RangeError);
    expect(Object.keys(BANK_BASE_RATE_PCT).map(Number).sort()).toEqual(Array.from({ length: src.maxYear - src.minYear + 1 }, (_, i) => src.minYear + i));
  });
  it('le prêt personnel coûte toujours plus cher que le prêt immobilier de la même année (non garanti)', async () => {
    for (let y = src.minYear; y <= src.maxYear; y++) {
      const mortgage = await src.getLoanRatePct(y, 300);
      expect(bankProductRatePct('personal', y)).toBeGreaterThan(mortgage);
    }
  });
  it('taux du produit = base + écart', () => {
    expect(bankProductRatePct('personal', 2023)).toBeCloseTo(bankBaseRatePct(2023) + BANK_SPREAD_POINTS.personal, 2);
    expect(bankProductRatePct('portfolio', 2021)).toBeCloseTo(0 + BANK_SPREAD_POINTS.portfolio, 2);
  });
  it('taux d\'usure : structure prête mais désactivée en v1 (aucun plafond appliqué) ; la structure plafonne quand une table existe', () => {
    expect(USURY_CAP_PCT_BY_YEAR).toBeNull();
    expect(applyUsuryCap(9.9, 'personal', 2023)).toBe(9.9);
  });
  it('la règle de conception « les pièces ne sortent jamais du jeu » est écrite dans le code', () => {
    expect(COIN_DESIGN_RULE).toContain('pas de boutique');
    expect(COIN_DESIGN_RULE).toContain('échange entre joueurs');
  });
});
