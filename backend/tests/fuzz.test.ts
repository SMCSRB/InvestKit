import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { listRoutes } from '../src/utils/listRoutes';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { STATUS_CODES } from 'http';

// Phase 6B — robustesse face aux entrées malveillantes ou absurdes : chaque route reçoit des corps et des paramètres piégés
// (types inattendus, objets imbriqués, énormes chaînes, pollution de prototype, null, tableaux) avec et sans authentification.
// Règle : JAMAIS d'erreur serveur (5xx) ni de plantage ; uniquement des refus propres (4xx) ou des succès.
const UUID = '11111111-1111-1111-1111-111111111111';
const EVIL: unknown[] = [
  {}, [], null, 'texte', 12345, true,
  { email: { $ne: null }, password: { $gt: '' } },
  { email: ['a@b.fr'], password: ['x'] },
  { symbol: { a: 1 }, quantity: 'NaN', domain: [], account: {} },
  { quantity: -1, amount: -1, coins: -1, amountCoins: 1e308, months: 1e9 },
  { quantity: 1e400, amountCoins: 'Infinity', askingRatio: NaN },
  { __proto__: { admin: true }, constructor: { prototype: { admin: true } } },
  JSON.parse('{"__proto__": {"polluted": true}, "a": {"__proto__": {"polluted2": true}}}'),
  { reason: 'x'.repeat(100000), message: 'y'.repeat(100000) },
  { id: "'; DROP TABLE users; --", key: '../../etc/passwd', token: '\u0000\u0001' },
  { a: { b: { c: { d: { e: { f: { g: 'profond' } } } } } } },
  { emoji: '💥'.repeat(1000), rtl: '‮txt', nul: 'a\u0000b' },
  { kind: 'bug', message: 12345, rating: '1', page: { x: 1 } },
  { allocation: 'beaucoup', horizonYears: {}, leverage: [] },
  { initial: '1e999', monthly: {}, years: [], annualReturnPct: null },
];

describe.skipIf(!hasDb)('SÉCURITÉ : aucune entrée piégée ne provoque d\'erreur serveur (fuzz de toutes les routes)', () => {
  let userTok: string, adminTok: string;
  beforeAll(async () => {
    await setupDb();
    const u = await createUser({ balance: 500, freeDomain: 'stocks', tier: 'pro' });
    const a = await createUser({ balance: 500 });
    await query(`UPDATE users SET role = 'admin', enable_2fa = TRUE WHERE id = $1`, [a]);
    userTok = generateToken(u, `${u}@test.local`); adminTok = generateToken(a, `${a}@test.local`);
    app.set('trust proxy', true);
  });
  afterAll(async () => { app.set('trust proxy', false); await teardownDb(); });

  const routes = listRoutes(app)
    .filter((r) => r.includes('/api/v1/') && !r.includes('/billing/webhook') && !r.endsWith('/openapi.json') && !r.endsWith('/docs'))
    .map((r) => { const [m, ...p] = r.split(' '); return { method: m.toLowerCase() as 'get' | 'post' | 'put' | 'delete', path: p.join(' ').replace(/:[A-Za-z]+/g, UUID) }; });
  let ip = 0;
  const send = (method: string, path: string, body: unknown, token?: string) => {
    let r = (request(app) as any)[method](path).set('X-Forwarded-For', `10.${Math.floor(ip / 65000)}.${Math.floor((ip % 65000) / 250)}.${(ip++ % 250) + 1}`);
    if (token) r = r.set('Authorization', `Bearer ${token}`);
    return method === 'get' || method === 'delete' ? r : r.set('Content-Type', 'application/json').send(typeof body === 'string' ? JSON.stringify(body) : body as any);
  };

  it(`${routes.length} routes × ${EVIL.length} corps piégés × (sans jeton, utilisateur, administrateur) : jamais de 5xx`, async () => {
    const failures: string[] = [];
    for (const { method, path } of routes) {
      for (const [i, body] of EVIL.entries()) {
        for (const [who, tok] of [['anonyme', undefined], ['joueur', userTok], ['admin', adminTok]] as const) {
          if (who === 'anonyme' && i > 3) continue;   // l'anonyme est refusé avant tout traitement : quelques corps suffisent
          const r = await send(method, path, body, tok);
          // 503 = service volontairement indisponible (ex. paiement non configuré sur ce serveur de test) : refus propre, pas un bug.
          if (r.status >= 500 && r.status !== 503) failures.push(`${method.toUpperCase()} ${path} [${who}] corps#${i} → ${r.status} ${STATUS_CODES[r.status]} ${JSON.stringify(r.body).slice(0, 120)}`);
        }
      }
    }
    if (failures.length) {
      const grouped = new Map<string, number>();
      for (const f of failures) { const k = f.replace(/ corps#\d+ →/, ' →').replace(/\[(anonyme|joueur|admin)\] /, ''); grouped.set(k, (grouped.get(k) ?? 0) + 1); }
      console.log('ÉCHECS FUZZ (groupés) :\n' + [...grouped.entries()].map(([k, n]) => `${n}× ${k}`).join('\n'));
    }
    expect(failures).toEqual([]);
  }, 600000);

  it('requêtes malformées : JSON invalide, type de contenu inattendu, corps énorme → 4xx, jamais 5xx', async () => {
    const bad = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(bad.status).toBe(400);
    const odd = await request(app).post('/api/v1/auth/login').set('Content-Type', 'text/plain').send('email=a');
    expect(odd.status).toBeLessThan(500);
    const huge = await request(app).post('/api/v1/feedback').set('Authorization', `Bearer ${userTok}`).set('Content-Type', 'application/json').send(JSON.stringify({ kind: 'bug', message: 'x'.repeat(2_000_000) }));
    expect(huge.status).toBe(413);
  });

  it('pollution de prototype : aucune propriété injectée sur Object.prototype', async () => {
    await send('post', '/api/v1/trading/buy', JSON.parse('{"__proto__": {"polluted": true}}'), userTok);
    await send('post', '/api/v1/auth/login', JSON.parse('{"constructor": {"prototype": {"polluted": true}}}'));
    expect(({} as any).polluted).toBeUndefined();
    expect(({} as any).admin).toBeUndefined();
  });
});
