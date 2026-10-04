// Frais de notaire de l'ancien calculés par département et par date de jeu : droits de mutation (taux du département, aucun futur) + émoluments (barème) + TVA + CSI (aucun forfait de frais divers).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { dmtoPctAt, emolumentsHT, notaryFeesOld } from '../src/engine/immo/notaryDepartment';
import { DMTO_RAISED_PCT, DMTO_STANDARD_PCT, DMTO_STAYED_STANDARD, DMTO_RAISED_FROM, EMOLUMENTS_BRACKETS, NOTARY_NEW_PCT } from '../src/config/notaryRules';
import * as rules from '../src/config/notaryRules';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { assessPurchase, maxApprovedPrice, LevelScenario } from '../src/engine/immo/levelSimulation';
import { BANK_RULES, STARTING_PROFILES, NOTARY_RULE, LOAN_INSURANCE_RATE_PCT, loanApplicationFee } from '../src/config/immoRules';

describe('droits de mutation par département et par date', () => {
  it('constantes : 5,80665 % (4,5 %) et 6,32 % (5 %) ; 11 départements restés à 4,5 % dont les Alpes-Maritimes', () => {
    expect([DMTO_STANDARD_PCT, DMTO_RAISED_PCT]).toEqual([5.80665, 6.32]);
    expect(DMTO_STAYED_STANDARD).toHaveLength(11);
    expect(DMTO_STAYED_STANDARD).toContain('06');
  });
  it('avant le 1er avril 2025 : taux de base partout ; après : 6,32 % sauf les départements restés à 4,5 % ; Bouches-du-Rhône, Gironde et Nord : à partir du 1er mai', () => {
    expect(dmtoPctAt('33', '2025-03-31')).toBe(5.80665);
    expect(dmtoPctAt('69', '2025-03-31')).toBe(5.80665);
    expect(dmtoPctAt('69', '2025-04-01')).toBe(6.32);
    expect(dmtoPctAt('33', '2025-04-30')).toBe(5.80665);            // Gironde : 1er mai 2025
    expect(dmtoPctAt('33', '2025-05-01')).toBe(6.32);
    expect(dmtoPctAt('13', '2025-04-30')).toBe(5.80665);
    expect(dmtoPctAt('13', '2025-05-01')).toBe(6.32);
    expect(dmtoPctAt('75', '2025-03-31')).toBe(5.80665);            // Paris : 1er avril 2025
    expect(dmtoPctAt('75', '2025-04-01')).toBe(6.32);
    expect(dmtoPctAt('59', '2025-04-30')).toBe(5.80665);            // Nord : 1er mai 2025 (à confirmer sur la délibération du département)
    expect(dmtoPctAt('59', '2025-05-01')).toBe(6.32);
    expect(dmtoPctAt('06', '2026-06-01')).toBe(5.80665);             // Alpes-Maritimes : jamais augmenté
    expect(dmtoPctAt('99', '2022-01-01')).toBe(5.80665);             // jamais un taux élevé avant la date légale
  });
  it('chacun des 12 départements des villes du jeu a une règle (hausse datée ou maintien à 4,5 %)', () => {
    const deps = [...new Set(DVF_CITIES.map((c) => c.department))];
    expect(deps).toHaveLength(12);
    for (const d of deps) expect(DMTO_STAYED_STANDARD.includes(d) || d in DMTO_RAISED_FROM, d).toBe(true);
  });
});

describe('émoluments et total', () => {
  it('barème par tranche : 3,870 % jusqu\'à 6 500, 1,596 % jusqu\'à 17 000, 1,064 % jusqu\'à 60 000, 0,799 % au-delà', () => {
    expect(EMOLUMENTS_BRACKETS.map((b) => b.ratePct)).toEqual([3.87, 1.596, 1.064, 0.799]);
    expect(emolumentsHT(6_500)).toBeCloseTo(251.55, 2);
    expect(emolumentsHT(17_000)).toBeCloseTo(251.55 + 167.58, 2);
    expect(emolumentsHT(60_000)).toBeCloseTo(251.55 + 167.58 + 457.52, 2);
    expect(emolumentsHT(200_000)).toBeCloseTo(251.55 + 167.58 + 457.52 + 140_000 * 0.00799, 2);
    expect(emolumentsHT(1_000)).toBeCloseTo(38.7, 2);
  });
  it('détail et total à 200 000 euros : Gironde (6,32 % depuis mai 2025) ou Alpes-Maritimes (5,81 %)', () => {
    const g = notaryFeesOld(200_000, '33', '2025-06-01');
    expect(g.dmto).toBe(12_640);
    expect(g.emoluments).toBeCloseTo(1_995.25, 2);
    expect(g.vat).toBeCloseTo(399.05, 2);
    expect(g.csi).toBe(200);
    expect(g).not.toHaveProperty('misc');
    expect(g.total).toBeCloseTo(12_640 + 1_995.25 + 399.05 + 200, 1);
    expect(g.pct).toBeGreaterThan(7.4); expect(g.pct).toBeLessThan(7.9);
    const n = notaryFeesOld(200_000, '06', '2026-01-01');
    expect(n.dmtoPct).toBe(5.80665);
    expect(n.total).toBeLessThan(g.total);
    expect(g.total - n.total).toBeCloseTo((200_000 * (6.32 - 5.80665)) / 100, 0);
  });
  it('aucun forfait de frais divers : total = droits + émoluments + TVA + CSI, au centime près', () => {
    const f = notaryFeesOld(100_000, '33', '2025-06-01');
    expect(f.total).toBeCloseTo(f.dmto + f.emoluments + f.vat + f.csi, 1);
    expect('NOTARY_MISC_EUR' in rules).toBe(false);          // plus aucun forfait dans la config
  });
  it('le taux effectif baisse quand le prix monte (barème dégressif) et reste dans la fourchette connue (7 à 9 %, un peu plus pour un très petit prix)', () => {
    const at = (p: number) => notaryFeesOld(p, '75', '2025-06-01').pct;
    expect(at(50_000)).toBeGreaterThan(at(300_000));
    for (const p of [80_000, 150_000, 300_000, 600_000]) { expect(at(p)).toBeGreaterThan(7); expect(at(p)).toBeLessThan(9.5); }
    expect(NOTARY_NEW_PCT).toBe(2.5);
    expect(() => notaryFeesOld(0, '75', '2025-06-01')).toThrow();
  });
  it('aucun moteur ni route ne lit encore ce calcul (catalogue fictif sans département) : seule la règle d\'une annonce avec département l\'utilise', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(path.join(__dirname, '..', 'src'));
    const own = /notaryDepartment\.ts$|notaryRules\.ts$/;
    // Branchement 5/6 : seul le service des annonces (realEstateService) l'importe, et il ne l'applique qu'aux annonces qui portent un département (annonces réelles, désactivées) ; le catalogue fictif garde le taux forfaitaire.
    expect(files.filter((f) => /notaryDepartment|notaryRules/.test(readFileSync(f, 'utf8')) && !own.test(f)).map((f) => path.basename(f))).toEqual(['realEstateService.ts']);
  });
});

describe('simulation de niveau avec le notaire du département', () => {
  const mk = (pct?: (p: number) => number): LevelScenario => ({
    capital: 10_000, profile: 'employee', salary: STARTING_PROFILES.employee.netMonthlyIncome, livingCharges: STARTING_PROFILES.employee.livingCharges, months: 300, annualRatePct: 3.5,
    insuranceRatePct: LOAN_INSURANCE_RATE_PCT, notaryRule: NOTARY_RULE, bankRules: BANK_RULES, loanFees: loanApplicationFee, age: 'old', rentYieldPct: 0, ...(pct ? { notaryPctAt: pct } : {}),
  });
  it('un département plus cher en notaire abaisse le plafond d\'achat ; sans taux fourni : taux forfaitaire inchangé', () => {
    const flat = maxApprovedPrice(mk());
    const gironde = maxApprovedPrice(mk((p) => notaryFeesOld(p, '33', '2025-06-01').pct));
    const nice = maxApprovedPrice(mk((p) => notaryFeesOld(p, '06', '2025-06-01').pct));
    expect(gironde).toBeLessThan(nice);
    expect(Math.abs(flat - gironde)).toBeGreaterThan(0);
    expect(assessPurchase(mk(), 30_000).approved).toBe(true);
  });
});
