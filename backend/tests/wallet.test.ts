import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { netWorthCoins } from '../src/engine/wealth';
import { withTx, originateLoan } from '../src/services/bankService';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import fs from 'fs';
import path from 'path';

const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('patrimoine : une seule définition (fonction pure)', () => {
  it('liquidités + titres − dettes ; un prêt ne change pas le patrimoine, ses intérêts le font baisser', () => {
    expect(netWorthCoins({ coins: 500, tradingValue: 300, debtCoins: 0 })).toBe(800);
    expect(netWorthCoins({ coins: 500, tradingValue: 300, debtCoins: 120 })).toBe(680);
    // emprunter 100 : +100 de liquidités ET +100 de dette = même patrimoine
    expect(netWorthCoins({ coins: 600, tradingValue: 300, debtCoins: 100 })).toBe(netWorthCoins({ coins: 500, tradingValue: 300, debtCoins: 0 }));
    // intérêts payés (pièces détruites) : le patrimoine baisse
    expect(netWorthCoins({ coins: 595, tradingValue: 300, debtCoins: 100 })).toBeLessThan(800);
    expect(netWorthCoins({ coins: 0.1, tradingValue: 0.2, debtCoins: 0 })).toBe(0.3);       // arrondi propre, pas 0.30000000000000004
    expect(netWorthCoins({ coins: 0, tradingValue: 0, debtCoins: 50 })).toBe(-50);           // une dette sans actifs : négatif, honnête
    for (const bad of [NaN, Infinity]) expect(() => netWorthCoins({ coins: bad, tradingValue: 0, debtCoins: 0 })).toThrow();
  });
});

describe.skipIf(!hasDb)('InvestCoins : le serveur renvoie le portefeuille à jour après chaque action', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const player = (balance = 1000) => createUser({ balance, freeDomain: 'stocks' });
  const wallet = async (id: string) => (await request(app).get('/api/v1/economy/balance').set('Authorization', tok(id))).body;

  it('GET /economy/balance : solde, titres, dettes, patrimoine, série ; patrimoine = vue d\'ensemble', async () => {
    const id = await player(800);
    const w = await wallet(id);
    expect(w).toMatchObject({ balance: 800, tradingValue: 0, debtCoins: 0, netWorth: 800, dailyStreak: 0, canClaimToday: true });
    expect(typeof w.at).toBe('number');
    const ov = (await request(app).get('/api/v1/overview').set('Authorization', tok(id))).body;
    expect(ov.totals.netWorth).toBe(w.netWorth);
  });

  it('récompense quotidienne : la réponse contient le vrai portefeuille ; deuxième demande refusée sans portefeuille', async () => {
    const id = await player(0);
    const r = await request(app).post('/api/v1/economy/daily-reward').set('Authorization', tok(id));
    expect(r.status).toBe(200);
    expect(r.body.balance).toBe(await balanceOf(id));
    expect(r.body.wallet).toMatchObject({ balance: await balanceOf(id), netWorth: await balanceOf(id), canClaimToday: false, dailyStreak: 1 });
    const again = await request(app).post('/api/v1/economy/daily-reward').set('Authorization', tok(id));
    expect(again.status).toBe(400);
    expect(again.body.wallet).toBeUndefined();                                 // jamais d'affichage « optimiste » pour un refus
    expect(await balanceOf(id)).toBe(r.body.reward);
  });

  it('double clic rapide / plusieurs onglets : UN seul gain, registre intact', async () => {
    const id = await player(0);
    const rs = await Promise.all(Array.from({ length: 6 }, () => request(app).post('/api/v1/economy/daily-reward').set('Authorization', tok(id))));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 400)).toHaveLength(5);
    const ok = rs.find((r) => r.status === 200)!;
    expect(await balanceOf(id)).toBe(ok.body.reward);
    expect(await ledgerSum(id)).toBe(await balanceOf(id));
    expect((await query(`SELECT COUNT(*)::int AS n FROM investcoins_transactions WHERE user_id = $1 AND reason = 'daily_reward'`, [id])).rows[0].n).toBe(1);
    // un autre onglet relit la vraie valeur
    expect((await wallet(id)).balance).toBe(ok.body.reward);
  });

  it('quiz réussi : la réponse porte le portefeuille ; rejouer le même quiz ne donne rien de plus', async () => {
    const { EDUCATION_QUIZZES } = await import('../src/data/educationQuizzes');
    const id = await player(0);
    const answers = Object.fromEntries(EDUCATION_QUIZZES.crypto.chapters['1'].questions.map((q: any) => [q.id, q.correct]));
    const a = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', tok(id)).send({ domainId: 'crypto', scope: '1', answers });
    expect(a.status).toBe(200);
    expect(a.body.rewarded).toBe(true);
    expect(a.body.wallet.balance).toBe(await balanceOf(id));
    expect(a.body.wallet.balance).toBe(a.body.coinsEarned);
    const b = await request(app).post('/api/v1/education/submit-quiz').set('Authorization', tok(id)).send({ domainId: 'crypto', scope: '1', answers });
    expect(b.body.rewarded).toBe(false);
    expect(b.body.wallet.balance).toBe(a.body.wallet.balance);
    expect(await ledgerSum(id)).toBe(await balanceOf(id));
  });

  it('mission (checklist) : la récompense revient avec le portefeuille ; deuxième récupération = 0', async () => {
    const id = await player(0);
    await query(`UPDATE users SET username = 'mission' || substr(id::text,1,5), verified = TRUE WHERE id = $1`, [id]);
    const r = await request(app).post('/api/v1/onboarding/claim').set('Authorization', tok(id));
    expect(r.status).toBe(200);
    expect(r.body.wallet.balance).toBe(await balanceOf(id));
    const r2 = await request(app).post('/api/v1/onboarding/claim').set('Authorization', tok(id));
    expect(r2.body.coins).toBe(0);
    expect(r2.body.wallet.balance).toBe(r.body.wallet.balance);
  });

  it('dépense (achat de titres) : liquidités ↓, titres ↑, patrimoine cohérent avec le serveur', async () => {
    const id = await player(5000);
    const assets = (await request(app).get('/api/v1/trading/assets?domain=stocks').set('Authorization', tok(id))).body.assets;
    const symbol = assets[0].symbol;
    const r = await request(app).post('/api/v1/trading/buy').set('Authorization', tok(id)).send({ domain: 'stocks', symbol, quantity: 3 });
    expect(r.status).toBe(200);
    expect(r.body.wallet.balance).toBe(await balanceOf(id));
    expect(r.body.wallet.balance).toBeLessThan(5000);
    expect(r.body.wallet.tradingValue).toBeGreaterThan(0);
    expect(r.body.wallet.netWorth).toBeCloseTo(r.body.wallet.balance + r.body.wallet.tradingValue, 2);
    expect(r.body.wallet.netWorth).toBeLessThanOrEqual(5000);               // les frais ne créent jamais de richesse
    expect(r.body.wallet).toMatchObject(await wallet(id).then((w) => ({ balance: w.balance, tradingValue: w.tradingValue, netWorth: w.netWorth })));
    // refus (symbole inconnu) : pas de portefeuille dans la réponse, rien ne change
    const before = await balanceOf(id);
    const bad = await request(app).post('/api/v1/trading/buy').set('Authorization', tok(id)).send({ domain: 'stocks', symbol: 'INCONNU', quantity: 1 });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect(bad.body.wallet).toBeUndefined();
    expect(await balanceOf(id)).toBe(before);
  });

  it('prêt : liquidités et dette montent ensemble, le patrimoine ne bouge pas', async () => {
    const id = await player(1000);
    const w0 = await wallet(id);
    await withTx((c) => originateLoan(c, { userId: id, product: 'personal', domain: 'real_estate', principalCoins: 200, annualRatePct: 6, months: 12, clockTotal: 24120 }));
    const w1 = await wallet(id);
    expect(w1.balance).toBe(w0.balance + 200);
    expect(w1.debtCoins).toBe(200);
    expect(w1.netWorth).toBe(w0.netWorth);
  });

  it('lecture (GET) : pas de portefeuille ajouté aux autres routes ; non connecté = 401', async () => {
    const id = await player(10);
    const ov = await request(app).get('/api/v1/overview').set('Authorization', tok(id));
    expect(ov.body.wallet).toBeUndefined();
    expect((await request(app).get('/api/v1/economy/balance')).status).toBe(401);
  });
});

describe('interface : une seule source de vérité, instantanée, sans affichage optimiste', () => {
  const store = read('app/lib/coinStore.js');
  it('le magasin applique la valeur du serveur, ignore un instantané plus ancien, se synchronise entre onglets', () => {
    expect(store).toContain('applyWallet');
    expect(store).toMatch(/at\s*<\s*|\.at\b/);
    expect(store).toContain('BroadcastChannel');
    expect(store).toContain('refreshCoins');
    expect(store).not.toMatch(/balance\s*\+=|balance\s*=\s*\w+\.balance\s*\+/);   // jamais de calcul local du solde
  });
  it('barre du haut, carte Patrimoine, Liquidités, accueil du tableau de bord lisent ce même magasin', () => {
    for (const f of ['app/components/shell/useShellData.js', 'app/dashboard/OverviewTab.jsx']) expect(read(f), f).toMatch(/coinStore|useCoins/);
    expect(read('app/dashboard/DashHero.jsx')).toContain('shell.claimDaily');   // le bouton de l'accueil et celui de la barre du haut font la même action partagée
    expect(read('app/dashboard/page.jsx')).not.toMatch(/setCoinsBalance|const \[coinsBalance/);   // plus de second solde dans la page
    // quiz, missions, achats, prêts... : toute réponse d'action réussie qui porte `wallet` est affichée tout de suite (interception unique)
    const session = read('app/lib/session.js');
    expect(session).toContain('applyWallet(d.wallet)');
    expect(session).toMatch(/refreshCoins/);                                   // réseau coupé pendant une écriture : on relit la vraie valeur
  });
  it('compteur animé : moins d\'une seconde, coupé par « réduire les animations »', () => {
    const m = read('app/components/ui/motion.jsx');
    const d = Number(/duration = (\d+)/.exec(m)![1]);
    expect(d).toBeLessThan(1000);
    expect(m).toContain('motionEnabled');
  });
});
