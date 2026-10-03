import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import * as E from '../src/config/economy';
import { BANK_LIMITS, RECOVERY } from '../src/config/bankRules';

// Un seul fichier décide des montants d'InvestCoins : config/economy.ts.
describe('économie : 1 InvestCoin = 1 €', () => {
  it('règle unique dans tous les domaines', () => {
    expect(E.EUROS_PER_COIN).toBe(1);
  });

  it('le pouvoir d\'achat du capital de départ ne change pas (500 pièces × 20 € avant, 10 000 × 1 € maintenant)', () => {
    expect(E.STARTING_CAPITAL * E.EUROS_PER_COIN).toBe(500 * 20);
    expect((E.STARTING_CAPITAL + E.PRO_STARTING_BONUS) * E.EUROS_PER_COIN).toBe(1000 * 20);
  });

  it('le plafond de dette est plus strict qu\'avant en euros (500 000 € contre 1 000 000 €)', () => {
    expect(E.MAX_OUTSTANDING_DEBT_COINS * E.EUROS_PER_COIN).toBeLessThan(50_000 * 20);
    expect(E.MAX_OUTSTANDING_DEBT_COINS).toBe(500_000);
  });
});

describe('économie : valeurs de départ', () => {
  it('capital de départ 10 000, Pro : le double une seule fois', () => {
    expect(E.STARTING_CAPITAL).toBe(10_000);
    expect(E.PRO_STARTING_BONUS).toBe(10_000);
    expect(E.proStartingBonus()).toBe(10_000);
  });

  it('seuil de classement unique : 2 500 investis et 5 jours actifs', () => {
    expect(E.RANKING_MIN_INVESTED).toBe(2_500);
    expect(E.RANKING_MIN_ACTIVE_DAYS).toBe(5);
  });

  it('le rétablissement et le plafond de dette lisent le fichier d\'économie', () => {
    expect(RECOVERY.baseCapitalCoins).toBe(E.STARTING_CAPITAL);
    expect(BANK_LIMITS.maxOutstandingPrincipalCoins).toBe(E.MAX_OUTSTANDING_DEBT_COINS);
  });

  it('les récompenses restent petites face au capital (aucun gain en boucle par ce biais)', () => {
    expect(E.EDUCATION_CHAPTER_COINS).toBeLessThan(E.STARTING_CAPITAL / 100);
    expect(E.EDUCATION_DOMAIN_COMPLETE_COINS).toBeLessThan(E.STARTING_CAPITAL / 50);
    expect(E.CHECKLIST_REWARD_COINS).toBeLessThan(E.STARTING_CAPITAL / 100);
  });

  it('tous les montants sont des entiers positifs', () => {
    for (const [k, v] of Object.entries(E)) {
      if (typeof v === 'number') { if (k !== 'FX_DEMO_USD_PER_EUR') expect(Number.isInteger(v), k).toBe(true); expect(v, k).toBeGreaterThan(0); }   // le taux de démonstration est un nombre à virgule
    }
  });
});

describe('économie : pas de montant en dur ailleurs', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
  const files = walk(join(__dirname, '..', 'src')).filter((f) => !f.endsWith(join('config', 'economy.ts')));

  it('aucune autre définition du capital de départ, du seuil de classement ou des récompenses', () => {
    const bad = /\b(export\s+)?const\s+(EUROS_PER_COIN|FX_MAX_STALE_DAYS|FX_DEMO_USD_PER_EUR|DAILY_REWARD_COINS|DAILY_REWARD_MAX_DAYS_PER_WEEK|FIRST_STEP_MIN_INVESTMENT_COINS|STARTING_CAPITAL|PRO_STARTING_BONUS|RANKING_MIN_INVESTED|RANKING_MIN_ACTIVE_DAYS|MIN_RANKED_CAPITAL|CHECKLIST_REWARD_COINS|EDUCATION_CHAPTER_COINS|EDUCATION_DOMAIN_COMPLETE_COINS)\s*=\s*[0-9_]+/;
    expect(files.filter((f) => /const\s+FIRST_STEP_BONUSES\s*=/.test(readFileSync(f, 'utf8')))).toEqual([]);
    const hits = files.filter((f) => bad.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
