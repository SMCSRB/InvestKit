import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc } from '../src/services/realEstateService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { bankPortfolioService as lombard } from '../src/services/bankPortfolioService';
import { tradingService as trading } from '../src/services/tradingService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { EVENT_PARAMS } from '../src/config/immoRules';

// Phase 6A — contrôle d'accès (anti-IDOR) : un joueur qui connaît l'identifiant d'un bien ou d'un prêt d'un AUTRE joueur
// ne peut ni le lire ni le modifier. Chaque route à identifiant est appelée avec les identifiants de la victime.
describe.skipIf(!hasDb)('SÉCURITÉ : anti-IDOR sur toutes les routes à identifiant (HTTP)', () => {
  let victim: string, attacker: string, victimToken: string, attackerToken: string;
  let propertyId: string, personalLoanId: string, portfolioLoanId: string;

  const snapshot = async () => ({
    balance: await balanceOf(victim),
    property: (await query('SELECT to_jsonb(p) AS row FROM re_properties p WHERE id = $1', [propertyId])).rows[0].row,
    loans: (await query('SELECT id, status, balance_h FROM bank_loans WHERE user_id = $1 ORDER BY id', [victim])).rows,
    positions: (await query(`SELECT positions FROM virtual_portfolios WHERE user_id = $1 AND domain = 'stocks'`, [victim])).rows[0].positions,
  });

  beforeAll(async () => {
    await setupDb();
    for (const t of Object.values(EVENT_PARAMS.tenants)) { t.lateProbPerMonth = 0; t.defaultProbPerMonth = 0; t.tenureMonths = 1e9; }
    victim = await createUser({ balance: 30000, freeDomain: 'real_estate', tier: 'pro' });
    attacker = await createUser({ balance: 30000, freeDomain: 'real_estate', tier: 'pro' });
    victimToken = generateToken(victim, `${victim}@test.local`);
    attackerToken = generateToken(attacker, `${attacker}@test.local`);
    await svc.startGame(victim, 'executive');
    await svc.startGame(attacker, 'executive');

    let listing: any;
    for (const l of await src.listListings(2010)) {
      if (l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 50000 && l.price < 90000 && (await src.getExpertise(l.id, 2010))!.hiddenDefects.length === 0) { listing = l; break; }
    }
    await svc.purchase(victim, { listingId: listing.id, downPaymentCoins: 1500, months: 240 });
    propertyId = (await svc.listProperties(victim)).properties[0].id;

    await personal.borrow(victim, { amountCoins: 300, months: 24 });
    personalLoanId = (await query(`SELECT id FROM bank_loans WHERE user_id = $1 AND product = 'personal'`, [victim])).rows[0].id;

    await trading.getPortfolioView(victim, 'stocks');
    await query(`UPDATE virtual_portfolios SET simulated_year = 2019 WHERE user_id = $1 AND domain = 'stocks'`, [victim]);
    await trading.buy(victim, 'stocks', 'TTE', 10);
    await lombard.borrow(victim, { domain: 'stocks', amountCoins: 100 });
    portfolioLoanId = (await query(`SELECT id FROM bank_loans WHERE user_id = $1 AND product = 'portfolio'`, [victim])).rows[0].id;
  });
  afterAll(teardownDb);

  const asAttacker = (method: 'get' | 'post', path: string, body: object = {}) => {
    const r = request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${attackerToken}`);
    return method === 'post' ? r.send(body) : r;
  };

  it('la victime accède bien à ses propres ressources (contrôle du test)', async () => {
    const r = await request(app).get(`/api/v1/realestate/properties/${propertyId}/statements`).set('Authorization', `Bearer ${victimToken}`);
    expect(r.status).toBe(200);
  });

  it('toutes les routes /realestate/properties/:id/* refusent le bien d\'un autre (404) et ne changent rien', async () => {
    const before = await snapshot();
    const routes: ['get' | 'post', string, object?][] = [
      ['get', `/realestate/properties/${propertyId}/statements`],
      ['post', `/realestate/properties/${propertyId}/pay-works`],
      ['post', `/realestate/properties/${propertyId}/list`, { askingRentRatio: 1 }],
      ['post', `/realestate/properties/${propertyId}/reprice`, { askingRentRatio: 1 }],
      ['post', `/realestate/properties/${propertyId}/gli`, { active: true }],
      ['post', `/realestate/properties/${propertyId}/landlord-notice`, { reason: 'sale' }],
      ['post', `/realestate/properties/${propertyId}/sell`, { askingRatio: 1 }],
      ['get', `/realestate/properties/${propertyId}/sell/options`],
      ['post', `/realestate/properties/${propertyId}/sell/reprice`, { askingRatio: 1 }],
      ['get', `/realestate/properties/${propertyId}/renovate/preview`],
      ['post', `/realestate/properties/${propertyId}/renovate`],
    ];
    for (const [m, p, b] of routes) {
      const r = await asAttacker(m, p, b);
      expect(r.status, `${m.toUpperCase()} ${p}`).toBeGreaterThanOrEqual(400);
      expect(r.status, `${m.toUpperCase()} ${p}`).toBeLessThan(500);
      expect(JSON.stringify(r.body), `${p} ne doit rien révéler du bien`).not.toMatch(/asking_rent|purchase_price|"user_id"/);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('les routes /bank/*/repay refusent le prêt d\'un autre (404) et ne changent rien', async () => {
    const before = await snapshot();
    const a = await asAttacker('post', `/bank/loans/${personalLoanId}/repay`);
    const b = await asAttacker('post', `/bank/portfolio/loans/${portfolioLoanId}/repay`, { coins: 10 });
    const c = await asAttacker('post', `/bank/loans/${portfolioLoanId}/repay`);
    for (const r of [a, b, c]) { expect([400, 404]).toContain(r.status); expect(JSON.stringify(r.body)).toMatch(/introuvable|invalide|NOT_FOUND|INVALID/i); }
    expect(await snapshot()).toEqual(before);
  });

  it('les listes ne renvoient que les données de l\'appelant', async () => {
    const props = await asAttacker('get', '/realestate/properties');
    expect(props.status).toBe(200);
    expect(JSON.stringify(props.body)).not.toContain(propertyId);
    const overview = await asAttacker('get', '/bank/overview');
    expect(JSON.stringify(overview.body)).not.toContain(personalLoanId);
    expect(JSON.stringify(overview.body)).not.toContain(portfolioLoanId);
    const events = await asAttacker('get', '/bank/events');
    expect(JSON.stringify(events.body)).not.toContain(portfolioLoanId);
  });

  it('un identifiant qui n\'est pas un UUID ou une injection SQL est refusé proprement (400/404, jamais 500)', async () => {
    for (const id of ["' OR 1=1 --", '../../etc/passwd', '00000000-0000-0000-0000-000000000000', '%00', 'x'.repeat(500)]) {
      const r = await asAttacker('get', `/realestate/properties/${encodeURIComponent(id)}/statements`);
      expect([400, 404]).toContain(r.status);
      const l = await asAttacker('post', `/bank/loans/${encodeURIComponent(id)}/repay`);
      expect([400, 404]).toContain(l.status);
    }
  });

  it('les routes d\'administration sont fermées à un compte non-admin, même avec 2FA', async () => {
    for (const p of ['/economy/admin/coins-by-domain', '/bank/admin/stats']) {
      const r = await asAttacker('get', p);
      expect(r.status).toBe(403);
    }
    await query('UPDATE users SET enable_2fa = TRUE WHERE id = $1', [attacker]);
    for (const p of ['/economy/admin/coins-by-domain', '/bank/admin/stats']) expect((await asAttacker('get', p)).status).toBe(403);
    await query('UPDATE users SET enable_2fa = FALSE WHERE id = $1', [attacker]);
  });

  it('le rôle admin vient de la base : un jeton ne peut pas se l\'attribuer', async () => {
    const forged = generateToken(attacker, `${attacker}@test.local`);
    // Le jeton ne porte aucun rôle ; même avec un champ « role » ajouté par erreur côté client, seul users.role compte.
    const r = await request(app).get('/api/v1/economy/admin/coins-by-domain').set('Authorization', `Bearer ${forged}`).set('X-Role', 'admin');
    expect(r.status).toBe(403);
  });

  it('anti-énumération : il n\'existe plus de route qui dit si un e-mail a un compte', async () => {
    const r = await request(app).get('/api/v1/auth/check-email/quelquun%40test.local');
    expect(r.status).toBe(404);
  });
});
