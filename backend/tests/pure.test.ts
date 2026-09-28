import { describe, it, expect } from 'vitest';
import { chargeForBuy, creditForSell, computePerformancePct } from '../src/utils/performance';
import { getBuyAccess, hasProAccess } from '../src/utils/entitlements';

describe('arrondis du ledger (toujours contre le joueur)', () => {
  it('0,1 × 30 vaut exactement 3 pièces (pas 4 à cause du flottant)', () => {
    expect(chargeForBuy(0.1, 30)).toBe(3);
  });
  it('un achat fractionnaire est arrondi au-dessus', () => {
    expect(chargeForBuy(0.4, 1)).toBe(1);
    expect(chargeForBuy(0.35, 3)).toBe(2); // 1.05 -> 2
  });
  it('une vente fractionnaire est arrondie en dessous', () => {
    expect(creditForSell(0.35, 3)).toBe(1); // 1.05 -> 1
    expect(creditForSell(0.4, 1)).toBe(0);
  });
  it('acheter puis revendre au même prix ne crée jamais de pièces', () => {
    for (const [p, q] of [[0.37, 7], [1.13, 0.9], [12.345, 3.3]]) {
      expect(creditForSell(p, q)).toBeLessThanOrEqual(chargeForBuy(p, q));
    }
  });
});

describe('performance', () => {
  it('0 quand rien n\'a été acheté', () => {
    expect(computePerformancePct({ marketValue: 0, totalBought: 0, totalProceeds: 0 })).toBe(0);
  });
  it('un gain encaissé reste un gain après vente totale', () => {
    expect(computePerformancePct({ marketValue: 0, totalBought: 100, totalProceeds: 150 })).toBeCloseTo(50);
  });
  it('mélange positions ouvertes et ventes', () => {
    expect(computePerformancePct({ marketValue: 60, totalBought: 100, totalProceeds: 40 })).toBeCloseTo(0);
  });
  it('supporte un gain de +14 900 %', () => {
    expect(computePerformancePct({ marketValue: 15000, totalBought: 100, totalProceeds: 0 })).toBeCloseTo(14900);
  });
});

describe('droits d\'achat (abonnements)', () => {
  it('Pro (Stripe) achète partout', () => {
    expect(getBuyAccess({ subscription_tier: 'pro' }, 'crypto')).toEqual({ allowed: true });
  });
  it('Pro manuel (override) achète partout', () => {
    expect(hasProAccess({ subscription_tier: 'free', pro_override: true })).toBe(true);
    expect(getBuyAccess({ subscription_tier: 'free', pro_override: true }, 'stocks')).toEqual({ allowed: true });
  });
  it('gratuit sans domaine choisi : achat bloqué', () => {
    expect(getBuyAccess({ subscription_tier: 'free', free_domain: null }, 'stocks'))
      .toEqual({ allowed: false, reason: 'FREE_DOMAIN_NOT_CHOSEN' });
  });
  it('gratuit : seul son domaine est ouvert', () => {
    const u = { subscription_tier: 'free', free_domain: 'stocks' };
    expect(getBuyAccess(u, 'stocks')).toEqual({ allowed: true });
    expect(getBuyAccess(u, 'crypto')).toEqual({ allowed: false, reason: 'DOMAIN_LOCKED' });
  });
});
