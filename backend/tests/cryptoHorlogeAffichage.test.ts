// Après une avance du temps : la liste des actifs, la fiche et le bandeau des prix suivent la nouvelle date (jamais de valeur gardée en mémoire),
// et le premier achat verse le bonus « premier investissement » (+30) visible au registre.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser, setFlatFx, calmUserId, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { importDemo } from '../src/services/crypto/importer';
import { FIRST_STEP_BONUSES } from '../src/config/economy';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const d = (s: string) => Date.parse(`${s}T00:00:00Z`);

describe('affichage : rien n\'est gardé en mémoire après une avance du temps (code)', () => {
  it('le bandeau des prix se recharge quand la date change et ne réutilise son cache que pour la même date', () => {
    const t = read('app/components/shell/TickerBar.jsx');
    expect(t).toContain('CLOCK_EVENT');
    expect(t).toMatch(/c\.simulatedAt === at/);
    expect(t).toContain("cache: 'no-store'");
    expect(t).toContain('}, [version]);');
  });
  it('chaque page qui fait avancer le temps prévient le bandeau', () => {
    for (const f of ['app/crypto/page.jsx', 'app/bourse/page.jsx', 'app/immobilier/page.jsx']) expect(read(f), f).toContain('notifyClockAdvanced();');
  });
  it('la liste des actifs et la fiche se rechargent à chaque avance, sans qu\'une vieille réponse écrase une récente', () => {
    const c = read('app/crypto/page.jsx');
    expect(c).toContain('[simulatedAt, filters, refreshKey]');
    expect(c).toContain('[symbol, simulatedAt, refreshKey]');
    expect(c).toContain('if (!off && Array.isArray(r.assets)) setAssets(r.assets)');
    expect(c).toContain("cache: 'no-store'");
  });
  it('toutes les requêtes vers l\'API du jeu partent sans cache navigateur', () => {
    expect(read('app/lib/session.js')).toContain("cache: init.cache ?? 'no-store'");
  });
});

describe.skipIf(!hasDb)('serveur : valeurs à la nouvelle date, en-têtes, bonus du premier achat', () => {
  beforeAll(async () => { await setupDb(); await importDemo(); await setFlatFx(1.1); }, 120_000);
  afterAll(teardownDb);
  const player = async (o: { balance?: number; firstStepsPending?: boolean } = {}) => {
    const u = await createUser({ id: calmUserId(d('2020-01-01'), 800), balance: o.balance ?? 60_010, tier: 'pro', activeDays: 5, firstStepsPending: o.firstStepsPending });
    await request(app).post('/api/v1/crypto/account').set('Authorization', tok(u)).send({ start: 'y2020' });
    return u;
  };
  const get = (u: string, p: string) => request(app).get(`/api/v1/crypto${p}`).set('Authorization', tok(u));
  const adv = (u: string, step: string) => request(app).post('/api/v1/crypto/time/advance').set('Authorization', tok(u)).send({ step });

  it('les données de jeu ne sont jamais mises en cache (en-tête no-store sur les lectures)', async () => {
    const u = await player();
    for (const p of ['/api/v1/crypto/state', '/api/v1/crypto/assets', '/api/v1/clock', '/api/v1/trading/portfolio?domain=stocks', '/api/v1/economy/balance']) {
      const r = await request(app).get(p).set('Authorization', tok(u));
      expect(r.headers['cache-control'], p).toBe('no-store');
    }
  });

  it('après +1 mois (trois fois de suite) : liste non vide, date et prix à jour, fiche à jour', async () => {
    const u = await player();
    let last = await get(u, '/assets?sort=marketCap');
    expect(last.body.assets.length).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) {
      const before = last.body;
      const a = await adv(u, 'month');
      expect(a.status).toBe(200);
      const list = await get(u, '/assets?sort=marketCap');
      expect(list.status).toBe(200);
      expect(list.body.assets.length).toBeGreaterThan(0);
      expect(list.body.simulatedAt).toBe(a.body.simulatedAt);
      expect(list.body.simulatedAt).toBeGreaterThan(before.simulatedAt);
      const sym = list.body.assets[0].symbol;
      const prev = before.assets.find((x: any) => x.symbol === sym);
      const fiche = await get(u, `/assets/${sym}`);
      expect(fiche.body.asset.price).toBe(list.body.assets[0].price);          // la fiche et la liste disent la même chose, à la même date
      expect(fiche.body.asset.priceAt).toBeGreaterThan(prev.priceAt);          // et ce n'est plus le prix de la date précédente
      last = list;
    }
  });

  it('premier achat : le registre montre l\'achat, les frais ET le bonus « premier investissement » (+30), dans cet ordre', async () => {
    const u = await player({ firstStepsPending: true });
    const before = await balanceOf(u);
    const r = await request(app).post('/api/v1/crypto/orders').set('Authorization', tok(u)).send({ clientOrderId: `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`, symbol: 'DEMO1', side: 'buy', type: 'market', amountCoins: 1000 });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const led = (await query(`SELECT reason, amount, nature, domain FROM investcoins_transactions WHERE user_id = $1 AND reason IN ('trade_buy','fee_brokerage','first_step_bonus') ORDER BY id`, [u])).rows;
    const buy = led.find((x: any) => x.reason === 'trade_buy'), fee = led.find((x: any) => x.reason === 'fee_brokerage'), bonus = led.find((x: any) => x.reason === 'first_step_bonus');
    expect(buy!.amount).toBeLessThan(0); expect(fee!.amount).toBeLessThan(0);
    expect(bonus).toMatchObject({ amount: FIRST_STEP_BONUSES.first_investment, nature: 'creation' });
    expect(FIRST_STEP_BONUSES.first_investment).toBe(30);
    expect(await balanceOf(u)).toBe(before + buy!.amount + fee!.amount + 30);
    expect(buy!.amount + fee!.amount).toBe(-1000);                              // achat + frais = exactement le montant demandé
  });
});
