// Fiscalité des revenus fonciers : micro-foncier, régime réel (déficit, report), comparaison, garde « le moteur ne le lit pas », script. Cas calculés à la main.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { microFoncierTax, realRegimeTax, compareRegimes, RentTaxInput } from '../src/engine/immo/rentTaxRegimes';
import { MICRO_FONCIER, REAL_REGIME, RENT_TAX_REGIMES_ENABLED } from '../src/config/rentTaxRules';
import { SOCIAL_CHARGES_ON_RENT_PCT } from '../src/config/immoRules';

const base = (o: Partial<RentTaxInput> = {}): RentTaxInput => ({ grossRentEur: 7_200, otherChargesEur: 1_500, loanInterestEur: 3_000, irMarginalPct: 11, socialChargesPct: 17.2, ...o });

describe('micro-foncier', () => {
  it('abattement de 30 % puis IR et prélèvements sociaux sur la même base', () => {
    expect(MICRO_FONCIER).toEqual({ abatementPct: 30, ceilingEur: 15_000 });
    const r = microFoncierTax(base());
    expect(r.taxableBaseEur).toBe(5_040);                // 7 200 × 0,70
    expect(r.incomeTaxEur).toBe(554.4);                  // 5 040 × 11 %
    expect(r.socialChargesEur).toBe(866.88);             // 5 040 × 17,2 %
    expect(r.totalTaxEur).toBe(1_421.28);
    expect(r).toMatchObject({ regime: 'micro', eligible: true, deficitCarriedEur: 0 });
  });
  it('permis jusqu\'à 15 000 € de loyers bruts inclus, refusé au-dessus', () => {
    expect(microFoncierTax(base({ grossRentEur: 15_000 })).eligible).toBe(true);
    expect(microFoncierTax(base({ grossRentEur: 15_000.01 })).eligible).toBe(false);
  });
});

describe('régime réel', () => {
  it('base = loyers − charges − intérêts ; IR et prélèvements sociaux dessus', () => {
    const r = realRegimeTax(base());
    expect(r.taxableBaseEur).toBe(2_700);                // 7 200 − 1 500 − 3 000
    expect(r.incomeTaxEur).toBe(297); expect(r.socialChargesEur).toBe(464.4); expect(r.totalTaxEur).toBe(761.4);
  });
  it('déficit dû aux seuls intérêts : aucun impôt, tout est reporté, rien ne s\'impute sur le revenu global', () => {
    const r = realRegimeTax(base({ grossRentEur: 9_600, otherChargesEur: 3_500, loanInterestEur: 8_500 }));   // résultat −2 400, charges hors intérêts < loyers
    expect(r).toMatchObject({ taxableBaseEur: 0, deficitOnGlobalIncomeEur: 0, deficitCarriedEur: 2_400, totalTaxEur: 0 });
  });
  it('déficit dû aux charges hors intérêts : imputé sur le revenu global (plafond 10 700 €), le reste reporté', () => {
    expect(REAL_REGIME.deficitOnGlobalIncomeCeilingEur).toBe(10_700);
    const r = realRegimeTax(base({ grossRentEur: 6_000, otherChargesEur: 13_000, loanInterestEur: 2_000 }));   // résultat −9 000 ; part hors intérêts 7 000
    expect(r.deficitOnGlobalIncomeEur).toBe(7_000);
    expect(r.deficitCarriedEur).toBe(2_000);             // 9 000 − 7 000 (la part due aux intérêts)
    expect(r.incomeTaxSavingOnGlobalEur).toBe(770);      // 7 000 × 11 %
    expect(r.totalTaxEur).toBe(-770);
    const big = realRegimeTax(base({ grossRentEur: 0, otherChargesEur: 20_000, loanInterestEur: 0 }));
    expect(big.deficitOnGlobalIncomeEur).toBe(10_700); expect(big.deficitCarriedEur).toBe(9_300);
  });
  it('déficits antérieurs : imputés d\'abord sur les revenus fonciers, le solde reste reportable', () => {
    const r = realRegimeTax(base({ carriedDeficitEur: 1_000 }));
    expect(r.taxableBaseEur).toBe(1_700); expect(r.deficitCarriedEur).toBe(0);
    const r2 = realRegimeTax(base({ carriedDeficitEur: 5_000 }));
    expect(r2.taxableBaseEur).toBe(0); expect(r2.deficitCarriedEur).toBe(2_300);
  });
});

describe('comparaison indicative', () => {
  it('le réel gagne quand les charges dépassent l\'abattement de 30 %, le micro sinon', () => {
    expect(compareRegimes(base({ otherChargesEur: 1_000, loanInterestEur: 0 })).best).toBe('micro');     // charges 14 % < 30 %
    expect(compareRegimes(base()).best).toBe('real');                                                   // charges 62 %
  });
  it('au-dessus du plafond, le réel est obligatoire même s\'il coûte plus cher', () => {
    const r = compareRegimes(base({ grossRentEur: 18_000, otherChargesEur: 500, loanInterestEur: 0 }));
    expect(r.micro.eligible).toBe(false); expect(r.best).toBe('real');
  });
  it('les prélèvements sociaux de la config sont repris sans copie : 17,2 %', () => { expect(SOCIAL_CHARGES_ON_RENT_PCT).toBe(17.2); });
  it('valeurs refusées : loyer négatif ou non fini', () => {
    expect(() => microFoncierTax(base({ grossRentEur: -1 }))).toThrow();
    expect(() => realRegimeTax(base({ irMarginalPct: NaN }))).toThrow();
  });
});

describe('garde et script', () => {
  it('le moteur actuel ne lit pas ces règles : aucune route ni moteur n\'importe ces modules', () => {
    expect(RENT_TAX_REGIMES_ENABLED).toBe(false);
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const own = /rentTaxRules\.ts$|engine[\\/]immo[\\/]rentTaxRegimes\.ts$/;
    const users = files.filter((f) => /rentTaxRules|rentTaxRegimes/.test(readFileSync(f, 'utf8')) && !own.test(f));
    expect(users, 'aucun moteur ni route ne doit lire ces règles tant que ce n\'est pas décidé').toEqual([]);
  });
  it('immo:simulate-fiscalite s\'exécute sans base, affiche les trois profils et le rappel « à relire »', () => {
    const out = execFileSync('npx', ['ts-node', 'scripts/immo-simulate-fiscalite.ts'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe', env: { ...process.env, DATABASE_URL: '' } });
    for (const p of ['student', 'employee', 'executive']) expect(out).toContain(`Profil ${p}`);
    expect(out).toContain('À RELIRE'); expect(out).toContain('non permis'); expect(out).toContain('déficit reporté');
  }, 120_000);
});
