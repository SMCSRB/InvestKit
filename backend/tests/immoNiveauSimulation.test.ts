// Simulation d'un niveau Immobilier : la banque du jeu, avec un petit capital, ville par ville. Données de test FABRIQUÉES (les vrais prix DVF ne sont que sur le serveur d'Andreja).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { assessPurchase, maxApprovedPrice, maxSurfaceAt, unitPrice, UNIT_KINDS, LevelScenario } from '../src/engine/immo/levelSimulation';
import { BANK_RULES, STARTING_PROFILES, NOTARY_RULE, LOAN_INSURANCE_RATE_PCT, loanApplicationFee } from '../src/config/immoRules';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';

const mk = (capital: number, profile: 'student' | 'employee' | 'executive', age: 'old' | 'new' = 'old', rentYieldPct = 0, rate = 2): LevelScenario => ({
  capital, profile, salary: STARTING_PROFILES[profile].netMonthlyIncome, livingCharges: STARTING_PROFILES[profile].livingCharges, months: 300, annualRatePct: rate,
  insuranceRatePct: LOAN_INSURANCE_RATE_PCT, notaryRule: NOTARY_RULE, bankRules: BANK_RULES, loanFees: loanApplicationFee, age, rentYieldPct,
});

describe('plafond d\'achat selon les règles de banque du jeu', () => {
  it('Expert Immobilier (étudiant, 2 500 pièces) : la banque accepte au plus environ 13 000 euros dans l\'ancien, 18 000 dans le neuf (c\'est l\'apport qui limite)', () => {
    const old = maxApprovedPrice(mk(2500, 'student', 'old'));
    const neuf = maxApprovedPrice(mk(2500, 'student', 'new'));
    expect(old).toBeGreaterThan(12_000); expect(old).toBeLessThan(14_500);
    expect(neuf).toBeGreaterThan(17_000); expect(neuf).toBeLessThan(19_500);
    const refus = assessPurchase(mk(2500, 'student', 'old'), old + 1_000);
    expect(refus).toMatchObject({ approved: false, reason: 'DOWN_PAYMENT_TOO_LOW' });
  });
  it('un logement à 60 000 euros, un studio parisien : refusé ; un petit parking à 6 000 euros : accepté', () => {
    const s = mk(2500, 'student');
    expect(assessPurchase(s, 60_000).approved).toBe(false);
    expect(assessPurchase(s, 6_000).approved).toBe(true);
  });
  it('le plafond croît avec le capital, et un étudiant est limité par son reste à vivre même avec 10 000 pièces', () => {
    const p25 = maxApprovedPrice(mk(2500, 'student')); const p50 = maxApprovedPrice(mk(5000, 'student')); const p100 = maxApprovedPrice(mk(10_000, 'student'));
    expect(p25).toBeLessThan(p50); expect(p50).toBeLessThan(p100);
    expect(p100).toBeLessThan(35_000);                                    // reste à vivre de l'étudiant : mensualité d'environ 100 euros au plus
    expect(maxApprovedPrice(mk(10_000, 'employee'))).toBeGreaterThan(50_000);
  });
  it('un loyer prévisionnel retenu par la banque augmente le plafond (étudiant, 5 000 pièces)', () => {
    expect(maxApprovedPrice(mk(5000, 'student', 'old', 5, 4))).toBeGreaterThan(maxApprovedPrice(mk(5000, 'student', 'old', 0, 4)));
  });
  it('décision monotone : si un prix est accepté, tout prix plus bas l\'est aussi', () => {
    const s = mk(5000, 'employee');
    const ceil = maxApprovedPrice(s);
    for (const p of [1_000, ceil / 4, ceil / 2, ceil - 100]) expect(assessPurchase(s, Math.round(p)).approved).toBe(true);
  });
  it('surfaces et prix des types de bien repris du catalogue du jeu', () => {
    expect(UNIT_KINDS.map((k) => [k.id, k.surface])).toEqual([['parking', 11], ['studio', 20], ['t2', 40], ['t3', 60], ['house', 95]]);
    expect(unitPrice(UNIT_KINDS[0], 1000)).toBe(4400);                   // 11 m² × 1 000 × 0,40
    expect(maxSurfaceAt(13_000, 1_300)).toBe(10);
    expect(maxSurfaceAt(13_000, 0)).toBe(0);
  });
});

describe('script de simulation (fichier fabriqué)', () => {
  it('affiche le tableau par ville et un verdict : tout refusé pour des prix de grande ville, parkings acceptés pour une ville bon marché', () => {
    const rows: unknown[] = [];
    const price = (id: string) => (id === 'saint-etienne' ? 800 : id === 'dijon' ? 1_500 : 6_000);       // prix FABRIQUÉS
    for (const c of DVF_CITIES) for (const code of c.districts ? c.codes : [c.codes[0]]) rows.push([code, '2022-01', 'a', 30, price(c.id), price(c.id) - 100, price(c.id) + 100, null], [code, '2022-01', 'm', 30, price(c.id), price(c.id) - 100, price(c.id) + 100, null]);
    const f = path.join(mkdtempSync(path.join(tmpdir(), 'niv-')), 'marche.json');
    writeFileSync(f, JSON.stringify({ source: 'DVF fabriqué', windowMonths: 12, minSales: 10, range: { from: '2022-01', to: '2022-01' }, rows }));
    const out = execFileSync('npx', ['ts-node', 'scripts/immo-simulate-niveau.ts', '--file', f], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    expect(out).toContain('Étudiant, 2500 pièces');
    expect(out).toContain('2022-01');
    expect(out).toMatch(/Paris\s+6000\s/);
    expect(out).toMatch(/Saint-Étienne\s+800\s/);
    expect(out).toMatch(/Saint-Étienne\s+800\s.*\s1\/1\s+0\/1\s+0\/1\s+0\/1\s+0\/1/);   // parking à 3 520 euros accepté, aucun logement
    expect(out).toContain('0 sur 54 × 4 types ; parkings : 2 sur 54');
    expect(out).toContain('VERDICT : la banque refuse tout logement');
    expect(out).toContain('VERDICT');
  }, 90_000);
});
