import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { tradingService } from '../src/services/tradingService';
import { bankPortfolioService as lombard } from '../src/services/bankPortfolioService';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

describe('outils de risque : API publique (HTTP)', () => {
  const mc = { initial: 5000, monthly: 150, years: 12, annualReturnPct: 6.5, annualVolPct: 14, paths: 1000 };

  it('Monte Carlo : sans compte, percentiles, note pédagogique, déterministe', async () => {
    const r = await request(app).post('/api/v1/tools/monte-carlo').send(mc);
    expect(r.status).toBe(200);
    expect(r.body.p10).toHaveLength(13);
    expect(r.body.final.p10).toBeLessThan(r.body.final.p50);
    expect(r.body.final.p50).toBeLessThan(r.body.final.p90);
    expect(r.body.note).toMatch(/pas un conseil/);
    const again = await request(app).post('/api/v1/tools/monte-carlo').send(mc);
    expect(again.body.final).toEqual(r.body.final);
  });

  it('Monte Carlo : entrées invalides refusées (400) sans planter le serveur', async () => {
    for (const body of [{}, { ...mc, years: 1000 }, { ...mc, annualVolPct: 'beaucoup' }, { ...mc, paths: 1e9 }, { ...mc, initial: 0, monthly: 0 }, [], 'texte']) {
      const r = await request(app).post('/api/v1/tools/monte-carlo').send(body as any);
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(r.body.code).toBe('INVALID_INPUT');
    }
  });

  it('test de résistance et score de risque', async () => {
    const st = await request(app).post('/api/v1/tools/stress-test').send({ allocation: { equity_world: 60, bonds: 40 }, capital: 20000 });
    expect(st.status).toBe(200);
    expect(st.body.results).toHaveLength(5);
    expect(st.body.worst.lossAmount).toBeLessThan(0);
    expect((await request(app).post('/api/v1/tools/stress-test').send({ allocation: { equity_world: 60 }, capital: -1 })).status).toBe(400);
    expect((await request(app).post('/api/v1/tools/stress-test').send({ allocation: { bitcoin: 1 } })).status).toBe(400);

    const sc = await request(app).post('/api/v1/tools/risk-score').send({ allocation: { equity_world: 40, crypto: 60 }, horizonYears: 2, leverage: 0.5 });
    expect(sc.status).toBe(200);
    expect(sc.body.factors).toHaveLength(6);
    expect(sc.body.score).toBeGreaterThan(60);
    expect((await request(app).post('/api/v1/tools/risk-score').send({ allocation: { cash: 1 }, horizonYears: 'x' })).status).toBe(400);
  });

  it('corrélations : matrice symétrique, diagonale = 1 ; domaine inconnu refusé', async () => {
    const r = await request(app).get('/api/v1/tools/correlation?domain=all');
    expect(r.status).toBe(200);
    const { symbols, matrix } = r.body;
    expect(symbols).toEqual(expect.arrayContaining(['LVMH', 'SP500', 'BTC', 'ETH']));
    const i = symbols.indexOf('SP500'), j = symbols.indexOf('CAC40');
    expect(matrix[i][i]).toBe(1);
    expect(matrix[i][j]).toBe(matrix[j][i]);
    expect(matrix[i][j]).toBeGreaterThan(0.3);   // indices actions : corrélés dans le jeu de données
    expect((await request(app).get('/api/v1/tools/correlation?domain=stocks')).body.symbols).not.toContain('BTC');
    expect((await request(app).get('/api/v1/tools/correlation?domain=nimportequoi')).status).toBe(400);
  });

  it('limite de débit : 40 requêtes par 15 minutes et par IP', async () => {
    let last = 0;
    for (let i = 0; i < 45; i++) last = (await request(app).post('/api/v1/tools/risk-score').send({ allocation: { cash: 1 } })).status;
    expect(last).toBe(429);
  });
});

describe.skipIf(!hasDb)('risque du portefeuille simulé (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const get = (tok: string, q = '') => request(app).get(`/api/v1/risk/portfolio${q}`).set('Authorization', `Bearer ${tok}`);

  it('authentification requise ; portefeuille vide : message clair', async () => {
    expect((await request(app).get('/api/v1/risk/portfolio')).status).toBe(401);
    const uid = await createUser({ balance: 1000, freeDomain: 'stocks' });
    const r = await get(generateToken(uid, `${uid}@test.local`));
    expect(r.status).toBe(200);
    expect(r.body.empty).toBe(true);
  });

  it('répartition par classe, score, crises ; la dette (prêt sur portefeuille) augmente le levier', async () => {
    const uid = await createUser({ balance: 3000, freeDomain: 'stocks' });
    const tok = generateToken(uid, `${uid}@test.local`);
    await tradingService.getPortfolioView(uid, 'stocks');
    await query(`UPDATE virtual_portfolios SET simulated_year = 2019 WHERE user_id = $1 AND domain = 'stocks'`, [uid]);
    await tradingService.buy(uid, 'stocks', 'TTE', 20, 'cto');          // action française
    await tradingService.buy(uid, 'stocks', 'SP500', 0.2, 'cto');       // ETF actions internationales
    const before = await get(tok);
    expect(before.status).toBe(200);
    expect(before.body.empty).toBe(false);
    const classes = before.body.allocation.map((a: any) => a.cls);
    expect(classes).toEqual(expect.arrayContaining(['equity_fr', 'equity_world', 'cash']));
    expect(before.body.allocation.reduce((s: number, a: any) => s + a.weightPct, 0)).toBeGreaterThan(99.5);
    expect(before.body.score.factors).toHaveLength(6);
    expect(before.body.stress.results).toHaveLength(5);
    expect(before.body.leverage).toBe(0);

    await lombard.borrow(uid, { domain: 'stocks', amountCoins: 300 });
    const after = await get(tok);
    expect(after.body.leverage).toBeGreaterThan(0);
    const lev = (b: any) => b.score.factors.find((f: any) => f.key === 'leverage').score;
    expect(lev(after.body)).toBeGreaterThan(lev(before.body));   // le facteur « endettement » monte (le score global peut baisser : les pièces empruntées, non dépensées, comptent comme liquidités)
    expect((await get(tok, '?horizon=-3')).status).toBe(400);
    expect((await get(tok, '?domain=inconnu')).status).toBe(400);
  });
});
