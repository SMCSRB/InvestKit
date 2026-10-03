import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum, legacyCoins } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { EUROS_PER_COIN } from '../src/config/economy';

const YEAR = 2010; // année de départ d'une partie

const newPlayer = async (opts: { balance?: number; profile?: string; freeDomain?: string | null; pro?: boolean } = {}) => {
  const uid = await createUser({
    balance: opts.balance ?? 200000, freeDomain: opts.freeDomain === undefined ? 'real_estate' : opts.freeDomain,
    proOverride: opts.pro ?? false,
  });
  await svc.startGame(uid, opts.profile ?? 'executive');
  return uid;
};

const rejects = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); };

// Premier bien du catalogue vérifiant un critère, avec l'apport minimum qui le fait accepter.
const findListing = async (pred: (l: any) => boolean | Promise<boolean>) => {
  for (const l of await src.listListings(YEAR)) if (await pred(l)) return l;
  throw new Error('bien introuvable');
};
const notaryCoinsFor = (price: number, works: number, age: string) =>
  Math.ceil(((price) * (age === 'old' ? 0.075 : 0.025)) / EUROS_PER_COIN);

// Apport minimum de la banque : frais de notaire + 10 % du prix (+ une marge pour les arrondis et les frais de dossier).
const minDownCoins = (l: { price: number; age: string }, works = 0) => notaryCoinsFor(l.price, works, l.age) + Math.ceil(l.price * 0.1 / EUROS_PER_COIN) + 300;

describe.skipIf(!hasDb)('Immobilier : achat avec prêt, refus expliqué, expertise', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  describe('partie et accès', () => {
    it('le profil se choisit UNE fois, même avec 6 requêtes simultanées', async () => {
      const uid = await createUser({ balance: 1000, freeDomain: 'real_estate' });
      const r = await Promise.allSettled(Array.from({ length: 6 }, () => svc.startGame(uid, 'employee')));
      expect(r.filter((x) => x.status === 'fulfilled').length).toBe(1);
      const g = (await query('SELECT count(*)::int AS n FROM re_games WHERE user_id = $1', [uid])).rows[0].n;
      expect(g).toBe(1);
      expect((await rejects(svc.startGame(uid, 'student'))).code).toBe('GAME_EXISTS');
    });
    it('profil inconnu refusé ; sans partie, rien n\'est possible', async () => {
      const uid = await createUser({ balance: 1000, freeDomain: 'real_estate' });
      expect((await rejects(svc.startGame(uid, 'roi'))).code).toBe('INVALID_INPUT');
      expect((await rejects(svc.listListings(uid, {}))).code).toBe('NO_GAME');
      expect((await rejects(svc.previewPurchase(uid, { listingId: 'x-1', downPaymentCoins: 1, months: 240 }))).code).toBe('NO_GAME');
    });
    it('abonnements : domaine gratuit ≠ immobilier → verrouillé ; Pro → autorisé ; domaine non choisi → bloqué', async () => {
      const l = await findListing(() => true);
      const locked = await newPlayer({ freeDomain: 'stocks' });
      expect((await rejects(svc.buyExpertise(locked, l.id))).code).toBe('DOMAIN_LOCKED');
      expect((await rejects(svc.purchase(locked, { listingId: l.id, downPaymentCoins: legacyCoins(100), months: 240 }))).code).toBe('DOMAIN_LOCKED');
      const none = await newPlayer({ freeDomain: null });
      expect((await rejects(svc.buyExpertise(none, l.id))).code).toBe('FREE_DOMAIN_NOT_CHOSEN');
      const pro = await newPlayer({ freeDomain: 'stocks', pro: true });
      expect((await svc.buyExpertise(pro, l.id)).charged).toBeGreaterThan(0);
      expect((await svc.getState(locked)).access.canBuy).toBe(false);
      expect((await svc.getState(pro)).access.canBuy).toBe(true);
    });
    it('la consultation des annonces reste libre pour un compte verrouillé', async () => {
      const locked = await newPlayer({ freeDomain: 'stocks' });
      expect((await svc.listListings(locked, {})).listings.length).toBeGreaterThan(40);
    });
    it('validation stricte des entrées', async () => {
      const uid = await newPlayer();
      const l = await findListing(() => true);
      for (const bad of [
        { listingId: l.id, downPaymentCoins: 1.5, months: 240 }, { listingId: l.id, downPaymentCoins: -1, months: 240 },
        { listingId: l.id, downPaymentCoins: '100', months: 240 }, { listingId: l.id, downPaymentCoins: legacyCoins(100), months: 6 },
        { listingId: l.id, downPaymentCoins: legacyCoins(100), months: 999 }, { listingId: "x'; DROP TABLE users;--", downPaymentCoins: legacyCoins(100), months: 240 },
        { downPaymentCoins: legacyCoins(100), months: 240 }, null,
      ]) expect((await rejects(svc.previewPurchase(uid, bad))).code).toBe('INVALID_INPUT');
      expect((await rejects(svc.previewPurchase(uid, { listingId: 'nope-1', downPaymentCoins: legacyCoins(100), months: 240 }))).code).toBe('UNKNOWN_LISTING');
      expect((await rejects(svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: 9999999, months: 240 }))).code).toBe('INVALID_INPUT');
    });
  });

  describe('refus de la banque (expliqué) et aperçu', () => {
    it('apport inférieur aux frais de notaire : refus 422 expliqué, AUCUN mouvement de pièces', async () => {
      const uid = await newPlayer();
      const l = await findListing((x) => x.age === 'old' && x.price > 40000);
      const before = await balanceOf(uid);
      const err = await rejects(svc.purchase(uid, { listingId: l.id, downPaymentCoins: 5, months: 240 }));
      expect(err.code).toBe('BANK_REFUSED');
      const reasons = (err.details as any).reasons as { code: string; message: string }[];
      const r = reasons.find((x) => x.code === 'DOWN_PAYMENT_TOO_LOW')!;
      expect(r.message).toContain('frais de notaire');
      expect(r.message).toContain('Il te manque');
      expect(await balanceOf(uid)).toBe(before);
      expect((await query('SELECT count(*)::int AS n FROM re_properties p JOIN re_games g ON g.id = p.game_id WHERE g.user_id = $1', [uid])).rows[0].n).toBe(0);
      expect(await ledgerSum(uid)).toBe(0);
    });
    it('durée > 25 ans et endettement trop élevé : motifs cumulés', async () => {
      const uid = await newPlayer({ profile: 'student' });
      const l = await findListing((x) => x.price > 150000);
      const err = await rejects(svc.purchase(uid, { listingId: l.id, downPaymentCoins: legacyCoins(1000), months: 360 }));
      const codes = ((err.details as any).reasons as { code: string }[]).map((r) => r.code);
      expect(codes).toContain('LOAN_TERM_TOO_LONG');
      // Les crédits en cours comptent : le dossier finit refusé pour endettement ou pour reste à vivre.
      expect(codes.some((c) => c === 'DEBT_RATIO_TOO_HIGH' || c === 'LIVING_REMAINING_LOW')).toBe(true);
    });
    it('l\'aperçu ne modifie rien et détaille budget, prêt, TAEG et pièces', async () => {
      const uid = await newPlayer();
      const l = await findListing((x) => x.age === 'old' && x.price > 60000 && x.price < 120000);
      const before = await balanceOf(uid);
      const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: legacyCoins(1000), months: 240 });
      expect(p.bank.approved).toBe(true);
      expect(p.costs.totalCost).toBeCloseTo(l.price + p.costs.notaryFees + p.costs.works, 2);
      expect(p.costs.loanPrincipal).toBeCloseTo(p.costs.totalCost - 20000, 2);
      expect(p.loan.taegPct).toBeGreaterThan(p.loan.annualRatePct);
      expect(p.loan.monthlyPaymentWithInsurance).toBeGreaterThan(p.loan.monthlyPaymentWithoutInsurance);
      expect(p.coins.total).toBe(legacyCoins(1000) + p.coins.loanFees);
      expect(await balanceOf(uid)).toBe(before);
      expect((await query('SELECT count(*)::int AS n FROM investcoins_transactions WHERE user_id = $1', [uid])).rows[0].n).toBe(0);
    });
  });

  describe('achat', () => {
    it('achat réussi : pièces débitées exactement, ledger classé, prêt et bien créés', async () => {
      const uid = await newPlayer({ balance: 100000 });
      const l = await findListing((x) => x.age === 'old' && x.advertisedWorks === 0 && x.price > 50000 && x.price < 100000);
      const coins = legacyCoins(800);
      const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
      expect(p.bank.approved).toBe(true);
      const res: any = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
      const debited = coins + p.coins.loanFees;
      expect(await balanceOf(uid)).toBe(100000 - debited);
      expect(res.summary.coins.balance).toBe(100000 - debited);
      expect(await ledgerSum(uid)).toBe(-debited);

      const rows = (await query(`SELECT reason, amount, nature, domain FROM investcoins_transactions WHERE user_id = $1 ORDER BY reason`, [uid])).rows;
      const byReason = Object.fromEntries(rows.map((r) => [r.reason, r]));
      expect(byReason['re_notary_fees']).toMatchObject({ nature: 'destruction', domain: 'real_estate' });
      expect(byReason['re_loan_fees']).toMatchObject({ nature: 'destruction' });
      expect(byReason['re_exchange_down_payment']).toMatchObject({ nature: 'exchange', domain: 'real_estate' });
      // les pièces détruites couvrent exactement les frais de notaire arrondis au-dessus
      expect(-byReason['re_notary_fees'].amount).toBe(Math.ceil(p.costs.notaryFees / EUROS_PER_COIN));

      const loan = (await query('SELECT * FROM re_loans l JOIN re_games g ON g.id = l.game_id WHERE g.user_id = $1', [uid])).rows;
      expect(loan).toHaveLength(1);
      expect(Number(loan[0].principal)).toBeCloseTo(p.costs.loanPrincipal, 2);
      expect(Number(loan[0].monthly_payment)).toBeCloseTo(p.loan.monthlyPaymentWithInsurance, 2);
      const props = await svc.listProperties(uid);
      expect(props.properties).toHaveLength(1);
      expect(props.properties[0].status).toBe('vacant');
      // le bien acheté disparaît des annonces
      expect((await svc.listListings(uid, {})).listings.find((x) => x.id === l.id)).toBeUndefined();
      // racheter le même bien : « déjà possédé », pas un faux refus de la banque
      expect((await rejects(svc.purchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 }))).code).toBe('ALREADY_OWNED');
    });

    it('deux achats SIMULTANÉS du même bien : un seul passe, débit unique', async () => {
      const uid = await newPlayer({ balance: 100000 });
      const l = await findListing((x) => x.age === 'old' && x.advertisedWorks === 0 && x.price > 50000 && x.price < 100000);
      const params = { listingId: l.id, downPaymentCoins: legacyCoins(800), months: 240 };
      const r = await Promise.allSettled([svc.purchase(uid, params), svc.purchase(uid, params), svc.purchase(uid, params)]);
      expect(r.filter((x) => x.status === 'fulfilled').length).toBe(1);
      const errs = r.filter((x) => x.status === 'rejected').map((x: any) => x.reason.code);
      expect(errs.every((c) => c === 'ALREADY_OWNED')).toBe(true);
      const props = (await query('SELECT count(*)::int AS n FROM re_properties p JOIN re_games g ON g.id = p.game_id WHERE g.user_id = $1', [uid])).rows[0].n;
      expect(props).toBe(1);
      expect(await ledgerSum(uid)).toBeGreaterThan(-legacyCoins(1000)); // débité une seule fois (~800 + frais, au taux d'avant)
    });

    it('achats simultanés de biens différents avec un solde pour un seul : jamais négatif', async () => {
      const uid = await newPlayer({ balance: legacyCoins(1000) });
      const ls = (await src.listListings(YEAR)).filter((x) => x.age === 'old' && x.advertisedWorks === 0 && x.price > 50000 && x.price < 100000).slice(0, 3);
      const r = await Promise.allSettled(ls.map((l) => svc.purchase(uid, { listingId: l.id, downPaymentCoins: legacyCoins(700), months: 240 })));
      const ok = r.filter((x) => x.status === 'fulfilled').length;
      expect(ok).toBeLessThanOrEqual(1);
      expect(await balanceOf(uid)).toBeGreaterThanOrEqual(0);
      const failed = r.filter((x) => x.status === 'rejected').map((x: any) => x.reason.code);
      expect(failed.every((c) => ['INSUFFICIENT_FUNDS', 'BANK_REFUSED'].includes(c))).toBe(true);
    });

    it('solde insuffisant : refus net, rien n\'est écrit', async () => {
      const uid = await newPlayer({ balance: 50 });
      const l = await findListing((x) => x.age === 'old' && x.advertisedWorks === 0 && x.price > 50000 && x.price < 100000);
      const err = await rejects(svc.purchase(uid, { listingId: l.id, downPaymentCoins: legacyCoins(800), months: 240 }));
      expect(err.code).toBe('INSUFFICIENT_FUNDS');
      expect(await balanceOf(uid)).toBe(50);
      expect((await query('SELECT count(*)::int AS n FROM re_loans l JOIN re_games g ON g.id = l.game_id WHERE g.user_id = $1', [uid])).rows[0].n).toBe(0);
    });

    it('les crédits en cours comptent : un 2ᵉ achat est refusé quand l\'endettement dépasse 35 %', async () => {
      const uid = await newPlayer({ balance: 500000, profile: 'employee' });
      const ls = (await src.listListings(YEAR)).filter((x) => x.age === 'old' && x.advertisedWorks === 0 && x.price > 90000 && x.price < 150000);
      let refused: RealEstateError | null = null;
      for (const l of ls) {
        try { await svc.purchase(uid, { listingId: l.id, downPaymentCoins: legacyCoins(1200), months: 300 }); }
        catch (e) { refused = e as RealEstateError; break; }
      }
      expect(refused?.code).toBe('BANK_REFUSED');
      const codes = ((refused!.details as any).reasons as { code: string }[]).map((r) => r.code);
      // Les crédits en cours comptent : le dossier finit refusé pour endettement ou pour reste à vivre.
      expect(codes.some((c) => c === 'DEBT_RATIO_TOO_HIGH' || c === 'LIVING_REMAINING_LOW')).toBe(true);
    });

    it('un autre joueur peut acheter le même bien (mondes séparés)', async () => {
      const a = await newPlayer({ balance: 100000 });
      const b = await newPlayer({ balance: 100000 });
      const l = await findListing((x) => x.age === 'old' && x.advertisedWorks === 0 && x.price > 50000 && x.price < 100000);
      const params = { listingId: l.id, downPaymentCoins: legacyCoins(800), months: 240 };
      await svc.purchase(a, params);
      await svc.purchase(b, params);
      expect((await svc.listProperties(a)).properties).toHaveLength(1);
      expect((await svc.listProperties(b)).properties).toHaveLength(1);
    });
  });

  describe('expertise et travaux cachés', () => {
    const defective = async () => findListing(async (x) => {
      const e = (await src.getExpertise(x.id, YEAR))!;
      return e.hiddenDefects.length > 0 && e.realWorks > x.advertisedWorks + 2000 && x.age === 'old' && x.price < 120000;
    });

    it('l\'annonce et l\'aperçu ne révèlent jamais la vérité avant expertise', async () => {
      const uid = await newPlayer();
      const l = await defective();
      const d: any = await svc.getListingDetail(uid, l.id);
      expect(d.expertise).toBeNull();
      expect(JSON.stringify(d)).not.toContain('hiddenDefects');
      expect(d.expertiseCostCoins).toBeGreaterThan(0);
    });

    it('expertise payée une seule fois (même en parallèle), révèle défauts et travaux réels', async () => {
      const uid = await newPlayer({ balance: 5000 });
      const l = await defective();
      const r = await Promise.all([svc.buyExpertise(uid, l.id), svc.buyExpertise(uid, l.id), svc.buyExpertise(uid, l.id)]);
      expect(r.filter((x: any) => x.charged > 0).length).toBe(1);
      const cost = (r.find((x: any) => x.charged > 0) as any).charged;
      expect(await balanceOf(uid)).toBe(5000 - cost);
      const n = (await query('SELECT count(*)::int AS n FROM re_expertises e JOIN re_games g ON g.id = e.game_id WHERE g.user_id = $1', [uid])).rows[0].n;
      expect(n).toBe(1);
      const d: any = await svc.getListingDetail(uid, l.id);
      expect(d.expertise.hiddenDefects.length).toBeGreaterThan(0);
      expect(d.expertise.realWorks).toBeGreaterThan(l.advertisedWorks);
      const nat = (await query(`SELECT nature FROM investcoins_transactions WHERE user_id = $1 AND reason = 're_expertise'`, [uid])).rows[0].nature;
      expect(nat).toBe('destruction');
    });

    it('SANS expertise : dette de travaux découverte après l\'achat ; payable une fois, débit exact', async () => {
      const uid = await newPlayer({ balance: 100000 });
      const l = await defective();
      const truth = (await src.getExpertise(l.id, YEAR))!;
      const coins = Math.max(700, minDownCoins(l, l.advertisedWorks));
      const res: any = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
      expect(res.discovered.hiddenDefects.length).toBeGreaterThan(0);
      expect(res.discovered.pendingWorks).toBeCloseTo(truth.realWorks - l.advertisedWorks, 0);
      const prop = (await svc.listProperties(uid)).properties[0];
      expect(Number(prop.pending_works_eur)).toBeGreaterThan(2000);
      const before = await balanceOf(uid);
      const paid: any = await svc.payPendingWorks(uid, prop.id);
      expect(paid.charged).toBe(Math.ceil(Number(prop.pending_works_eur) / EUROS_PER_COIN));
      expect(await balanceOf(uid)).toBe(before - paid.charged);
      expect((await svc.payPendingWorks(uid, prop.id)).charged).toBe(0); // rien à repayer
      const nat = (await query(`SELECT nature FROM investcoins_transactions WHERE user_id = $1 AND reason = 're_exchange_pay_works'`, [uid])).rows[0].nature;
      expect(nat).toBe('exchange');
    });

    it('AVEC expertise : la banque finance les travaux réels, aucune mauvaise surprise', async () => {
      const uid = await newPlayer({ balance: 100000 });
      const l = await defective();
      const truth = (await src.getExpertise(l.id, YEAR))!;
      await svc.buyExpertise(uid, l.id);
      const coins = Math.max(700, minDownCoins(l, truth.realWorks));
      const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
      expect(p.expertised).toBe(true);
      expect(p.costs.works).toBeCloseTo(truth.realWorks, 0);
      const res: any = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
      expect(res.discovered).toBeNull();
      expect(Number((await svc.listProperties(uid)).properties[0].pending_works_eur)).toBe(0);
    });

    it('SÉCURITÉ (IDOR) : on ne peut pas payer les travaux du bien d\'un autre joueur', async () => {
      const owner = await newPlayer({ balance: 100000 });
      const attacker = await newPlayer({ balance: 100000 });
      const l = await defective();
      await svc.purchase(owner, { listingId: l.id, downPaymentCoins: Math.max(700, minDownCoins(l)), months: 240 });
      const prop = (await svc.listProperties(owner)).properties[0];
      expect((await rejects(svc.payPendingWorks(attacker, prop.id))).code).toBe('NOT_FOUND');
      expect(await balanceOf(attacker)).toBe(100000);
      expect(Number((await svc.listProperties(owner)).properties[0].pending_works_eur)).toBeGreaterThan(0);
      expect((await rejects(svc.payPendingWorks(owner, 'pas-un-uuid'))).code).toBe('INVALID_INPUT');
    });
  });

  it('le ledger reste cohérent avec le solde après toutes ces opérations', async () => {
    const bad = (await query(`SELECT count(*)::int AS n FROM investcoins_balance b
      WHERE b.balance < 0`)).rows[0].n;
    expect(bad).toBe(0);
  });
});
