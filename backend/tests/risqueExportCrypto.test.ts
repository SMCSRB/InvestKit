// Point 19 : l'analyse de risque, le tableau de bord et l'export de compte lisent aussi le nouveau marché Crypto (« crypto_market »).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, calmUserId, setFlatFx } from './helpers';
import { importDemo } from '../src/services/crypto/importer';
import { clockService } from '../src/services/crypto/clockService';
import { cryptoTradingService as crypto } from '../src/services/crypto/tradingService';
import { riskService } from '../src/services/riskService';
import { overviewService } from '../src/services/overviewService';
import { exportUserData } from '../src/services/accountService';

const cid = () => `ord-${Math.random().toString(36).slice(2)}-${Date.now()}`;

describe.skipIf(!hasDb)('risque et export sur le nouveau marché Crypto (base réelle)', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); await setFlatFx(1.1234); }, 120_000);
  afterAll(teardownDb);

  const player = async () => {
    const id = await createUser({ id: calmUserId(), balance: 50_000, tier: 'pro', activeDays: 5 });
    await clockService.create(id, 'y2020');
    return id;
  };
  const buy = (u: string, amountCoins: number) => crypto.placeOrder(u, { clientOrderId: cid(), symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins });

  it('sans position : « Aucune position », pas d\'erreur', async () => {
    const u = await player();
    const r: any = await riskService.portfolioRisk(u, 'crypto_market');
    expect(r.empty).toBe(true);
    expect(r.domain).toBe('crypto_market');
  });

  it('avec une position : score, allocation 100 % crypto + liquidités, valeur en pièces', async () => {
    const u = await player();
    await buy(u, 500);
    const r: any = await riskService.portfolioRisk(u, 'crypto_market');
    expect(r.empty).toBe(false);
    expect(r.domain).toBe('crypto_market');
    expect(r.positionsValue).toBeGreaterThan(0);
    expect(r.positionsValue).toBeLessThanOrEqual(500);
    const crypto100 = r.allocation.find((a: any) => a.cls === 'crypto');
    expect(crypto100.value).toBe(r.positionsValue);
    expect(r.score.score).toBeGreaterThan(0);
    expect(r.allocation.reduce((s: number, a: any) => s + a.weightPct, 0)).toBeGreaterThan(99);
  });

  it('le tableau de bord calcule le risque quand seul le nouveau marché est utilisé', async () => {
    const u = await player();
    await buy(u, 500);
    const ov: any = await overviewService.get(u);
    expect(ov.risk).not.toBeNull();
    expect(ov.risk.domain).toBe('crypto_market');
  });

  it('l\'export de compte contient le compte, les positions, les ordres, les exécutions du nouveau marché', async () => {
    const u = await player();
    await buy(u, 300);
    const data: any = await exportUserData(u);
    expect(data.cryptoMarket.account).not.toBeNull();
    expect(data.cryptoMarket.positions.length).toBe(1);
    expect(data.cryptoMarket.positions[0].symbol).toBe('DEMO1');
    expect(data.cryptoMarket.orders.length).toBe(1);
    expect(data.cryptoMarket.fills.length).toBe(1);
    expect(JSON.stringify(data)).not.toMatch(/password_hash|two_factor_secret/);
  });
});

describe('page Crypto : analyse de risque', () => {
  it('l\'onglet portefeuille affiche l\'analyse de risque du domaine crypto_market', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const page = readFileSync(join(__dirname, '../../app/crypto/page.jsx'), 'utf8');
    expect(page).toContain('<PortfolioRisk domain="crypto_market"');
  });
});
