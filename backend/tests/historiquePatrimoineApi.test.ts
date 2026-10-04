// Historique du patrimoine (6g, G3) : l'accès (gratuit / Pro) est décidé par le serveur, jamais par la requête.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { FREE_HISTORY_POINTS } from '../src/config/wealthHistoryRules';

const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const hist = (u: string, qs = '') => request(app).get(`/api/v1/wealth/history${qs}`).set('Authorization', tok(u));
const seed = async (u: string, n: number) => {
  for (let i = 0; i < n; i++) {
    await query(`INSERT INTO wealth_snapshots (user_id, day, liquidity, stocks, crypto, real_estate_net, debts, financial, total)
                 VALUES ($1, CURRENT_DATE - $2::int, $3, 0, 0, 0, 0, $3, $3)`, [u, n - i, 1000 + i]);
  }
};

describe.skipIf(!hasDb)('API historique du patrimoine', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('authentification obligatoire', async () => {
    expect((await request(app).get('/api/v1/wealth/history')).status).toBe(401);
  });

  it('compte gratuit : seulement les points récents, avec le nombre de points masqués', async () => {
    const u = await createUser();
    await seed(u, FREE_HISTORY_POINTS + 10);
    const r = (await hist(u)).body;
    expect(r.points).toHaveLength(FREE_HISTORY_POINTS);
    expect(r.hiddenPoints).toBe(10); expect(r.lockedForFree).toBe(true);
    expect(r.points[r.points.length - 1].total).toBe(1000 + FREE_HISTORY_POINTS + 9);   // les plus récents
    expect(r.points[0].day < r.points[1].day).toBe(true);                               // du plus ancien au plus récent
  });

  it('compte Pro : tout l\'historique ; le droit vient de la base, pas de la requête', async () => {
    const pro = await createUser({ tier: 'pro' }); const free = await createUser();
    await seed(pro, FREE_HISTORY_POINTS + 10); await seed(free, FREE_HISTORY_POINTS + 10);
    expect((await hist(pro)).body.points).toHaveLength(FREE_HISTORY_POINTS + 10);
    const sneaky = await request(app).get('/api/v1/wealth/history?limit=500&tier=pro&isPro=true').set('Authorization', tok(free));
    expect(sneaky.body.points).toHaveLength(FREE_HISTORY_POINTS);
  });

  it('limit : entier positif seulement ; chacun ne voit que son historique', async () => {
    const a = await createUser(); const b = await createUser();
    await seed(a, 5);
    expect((await hist(a, '?limit=2')).body.points).toHaveLength(2);
    for (const bad of ['0', '-1', 'abc', '1.5']) expect((await hist(a, `?limit=${bad}`)).status).toBe(400);
    expect((await hist(b)).body.points).toEqual([]);
  });
});
