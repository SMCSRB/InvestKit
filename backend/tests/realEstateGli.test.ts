import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { EVENT_PARAMS as P, GLI_PARAMS, WINTER_TRUCE, inWinterTruce } from '../src/config/immoRules';

const ORIGINAL = JSON.parse(JSON.stringify(P));
const reset = () => { Object.assign(P, JSON.parse(JSON.stringify(ORIGINAL))); };
const quiet = () => {
  reset();
  for (const t of Object.values(P.tenants)) { t.lateProbPerMonth = 0; t.defaultProbPerMonth = 0; t.tenureMonths = 1e9; t.personalNoticeProb = 0; }
  for (const k of Object.keys(P.unexpectedWorks.probPerMonthByCondition)) (P.unexpectedWorks.probPerMonthByCondition as any)[k] = 0;
  P.damage.prob = 0;
};
// Tous les locataires sont des actifs (le jeu refuse les étudiants) : le type ne dépend plus du hasard.
const allWorkers = () => { for (const unit of Object.keys(P.tenantMixByUnit) as (keyof typeof P.tenantMixByUnit)[]) P.tenantMixByUnit[unit] = { student: 0, worker: 1, family: 0 } as any; };
const alwaysDefault = () => { P.defaultEpisode.resolveProbPerMonth = 0; for (const t of Object.values(P.tenants)) t.defaultProbPerMonth = 1; };

describe('trêve hivernale : règle pure', () => {
  it('du 1er novembre au 31 mars', () => {
    expect(WINTER_TRUCE).toEqual({ startMonth: 11, endMonth: 3 });
    for (const m of [11, 12, 1, 2, 3]) expect(inWinterTruce(m)).toBe(true);
    for (const m of [4, 5, 6, 7, 8, 9, 10]) expect(inWinterTruce(m)).toBe(false);
  });
});

describe.skipIf(!hasDb)('assurance loyers impayés (GLI) et trêve hivernale', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  afterEach(quiet);

  const cheap = (l: any) => l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 40000 && l.price < 90000;
  const player = async (opts: { seed?: string; month?: number } = {}) => {
    const uid = await createUser({ balance: 900000, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    await query('UPDATE re_games SET seed = COALESCE($2, seed), simulated_month = $3 WHERE user_id = $1', [uid, opts.seed ?? null, opts.month ?? 4]);
    let l: any;
    for (const x of await src.listListings(2010)) {
      if (!cheap(x)) continue;
      if ((await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; }
    }
    expect(l, 'bien de test introuvable').toBeDefined();
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: Math.floor((l.price * 0.5) / 20), months: 240 });
    const prop = (await svc.listProperties(uid)).properties[0];
    return { uid, prop, l };
  };
  const rejects = async (p: Promise<unknown>): Promise<RealEstateError> => { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); };
  const rows = async (propId: string) => (await query('SELECT * FROM re_statements WHERE property_id = $1 ORDER BY year, month', [propId])).rows;
  const events = async (propId: string) => (await query('SELECT * FROM re_events WHERE property_id = $1 ORDER BY year, month, seq', [propId])).rows;
  const propRow = async (id: string) => (await query('SELECT * FROM re_properties WHERE id = $1', [id])).rows[0];
  const step = (uid: string, n = 1) => life.advanceTime(uid, n);
  const untilEvent = async (uid: string, propId: string, kind: string, max = 40) => {
    for (let i = 0; i < max; i++) { await step(uid); if ((await events(propId)).some((e) => e.kind === kind)) return; }
    throw new Error(`événement ${kind} jamais survenu`);
  };

  it('souscrire / résilier : validations, sécurité, informations du portefeuille', async () => {
    quiet();
    const { uid, prop } = await player();
    expect((await rejects(life.setGli(uid, prop.id, 'oui'))).code).toBe('INVALID_INPUT');
    expect((await rejects(life.setGli(uid, 'x', true))).code).toBe('INVALID_INPUT');
    expect((await rejects(life.setGli(uid, prop.id, false))).message).toContain('pas assuré');
    const other = await player();
    expect((await rejects(life.setGli(other.uid, prop.id, true))).code).toBe('NOT_FOUND');
    const r: any = await life.setGli(uid, prop.id, true);
    expect(r.active).toBe(true);
    expect(r.message).toContain('élai de carence');
    expect((await rejects(life.setGli(uid, prop.id, true))).message).toContain('déjà assuré');
    const item = ((await life.getPortfolio(uid)) as any).properties.find((p: any) => p.id === prop.id);
    expect(item.gli).toMatchObject({ active: true, inCarence: true, carenceMonths: 3, maxCoverageEur: 70000, canSubscribe: false });
    expect(item.gli.premiumMonthly).toBeGreaterThan(0);
    const c: any = await life.setGli(uid, prop.id, false);
    expect(c.active).toBe(false);
    expect(((await life.getPortfolio(uid)) as any).properties.find((p: any) => p.id === prop.id).gli.canSubscribe).toBe(true);
  });

  it('locataire étudiant : souscription refusée avec explication ; contrat existant sans effet sur lui (aucune prime)', async () => {
    quiet();
    const { uid, prop } = await player();
    await life.listForRent(uid, prop.id, 0.7);
    await step(uid, 2);
    await query(`UPDATE re_properties SET tenant_type = 'student' WHERE id = $1`, [prop.id]);
    const err = await rejects(life.setGli(uid, prop.id, true));
    expect(err.message).toContain('étudiant');
    const item = ((await life.getPortfolio(uid)) as any).properties[0];
    expect(item.gli).toMatchObject({ tenantRefused: true, canSubscribe: false });
    // contrat déjà en place : pas de prime tant que l'étudiant occupe le logement
    await query(`UPDATE re_properties SET gli_active = TRUE, gli_since_total = 0 WHERE id = $1`, [prop.id]);
    await step(uid, 2);
    const st = await rows(prop.id);
    expect(st[st.length - 1].lines.gliPremium).toBe(0);
  });

  it('PRIME : chaque mois loué = 3 % du (loyer + charges), déductible ; rien quand le bien est vide ; somme des lignes = net', async () => {
    quiet(); allWorkers();
    const { uid, prop } = await player();
    await life.setGli(uid, prop.id, true);
    await step(uid, 2);                       // vide, non listé : pas de prime
    expect((await rows(prop.id)).every((r: any) => r.lines.gliPremium === 0)).toBe(true);
    await life.listForRent(uid, prop.id, 0.9);
    await step(uid, 6);
    const let_ = (await rows(prop.id)).filter((r: any) => r.status === 'paying');
    expect(let_.length).toBeGreaterThanOrEqual(3);
    const listing = (await src.getListing(prop.listing_id, 2010))!;
    for (const r of let_) {
      const L = r.lines;
      expect(L.gliPremium).toBeCloseTo((L.rentDue + listing.recoverableChargesMonthly) * GLI_PARAMS.premiumPctOfRent / 100, 2);
      const net = L.rentCollected + L.recoverableChargesCollected - L.recoverableChargesPaid - L.nonRecoverableCharges - L.loanPayment - L.gliPremium + L.gliReimbursed + L.depositReceived - L.depositRefunded - L.repairCosts - L.reletFees - L.unexpectedWorks - L.rentTax;
      expect(Math.abs(net - Number(r.net_cash_flow))).toBeLessThan(0.011);
      expect(L.taxableIncome).toBeCloseTo(L.rentCollected - L.nonRecoverableCharges - L.loanInterest - L.loanInsurance - L.gliPremium - L.repairCosts - L.reletFees - L.unexpectedWorks, 2);
    }
  });

  it('IMPAYÉ COUVERT (hors trêve) : remboursé dès le 2e mois, rétroactif, le locataire part, plus aucune perte', async () => {
    quiet(); allWorkers(); alwaysDefault();
    const { uid, prop } = await player({ month: 1, seed: 'gli-couvert' });      // janvier + carence : l'impayé se termine bien avant novembre
    await life.setGli(uid, prop.id, true);
    await step(uid, GLI_PARAMS.carenceMonths + 1);         // carence écoulée, bien vide
    await life.listForRent(uid, prop.id, 0.7);
    await untilEvent(uid, prop.id, 'tenant_left');
    const ev = await events(prop.id);
    expect(ev.some((e) => e.kind === 'gli_carence')).toBe(false);
    expect(ev.some((e) => e.kind === 'winter_truce')).toBe(false);
    const st = await rows(prop.id);
    const reimb = st.filter((r: any) => r.lines.gliReimbursed > 0);
    expect(reimb.length).toBeGreaterThanOrEqual(2);
    const unpaid = st.filter((r: any) => r.status === 'defaulting');
    const first = reimb[0];
    expect(first.lines.gliReimbursed).toBeCloseTo(2 * (first.lines.rentDue + (first.lines.recoverableChargesPaid)), 1); // 1er + 2e mois
    expect(first.explanations.map((e: any) => e.code)).toContain('GLI_REIMBURSED');
    const left = ev.find((e) => e.kind === 'tenant_left')!;
    expect(left.details.exit).toBe('default');
    expect(left.details.arrearsLost).toBe(0);              // l'assurance a tout remboursé
    const totalReimb = reimb.reduce((a: number, r: any) => a + r.lines.gliReimbursed, 0);
    const totalDue = unpaid.reduce((a: number, r: any) => a + r.lines.rentDue + r.lines.recoverableChargesPaid, 0);
    expect(totalReimb).toBeCloseTo(totalDue, 1);
    expect(Number((await propRow(prop.id)).gli_reimbursed_eur)).toBeCloseTo(totalReimb, 1);
  });

  it('DÉLAI DE CARENCE : impayé qui commence trop tôt après la souscription = rien remboursé, expliqué', async () => {
    quiet(); allWorkers(); alwaysDefault();
    const { uid, prop } = await player({ month: 4, seed: 'gli-carence' });
    await life.setGli(uid, prop.id, true);
    await life.listForRent(uid, prop.id, 0.7);            // tenant dès le mois suivant : contrat trop récent
    await untilEvent(uid, prop.id, 'tenant_left');
    const ev = await events(prop.id);
    expect(ev.some((e) => e.kind === 'gli_carence')).toBe(true);
    expect((await rows(prop.id)).every((r: any) => r.lines.gliReimbursed === 0)).toBe(true);
    expect(ev.find((e) => e.kind === 'tenant_left')!.details.arrearsLost).toBeGreaterThan(0);
  });

  it('PLAFOND : remboursement limité au plafond restant, expliqué', async () => {
    quiet(); allWorkers(); alwaysDefault();
    const { uid, prop } = await player({ month: 4, seed: 'gli-plafond' });
    await life.setGli(uid, prop.id, true);
    await step(uid, GLI_PARAMS.carenceMonths + 1);
    await query('UPDATE re_properties SET gli_reimbursed_eur = $2 WHERE id = $1', [prop.id, GLI_PARAMS.maxCoverageEur - 300]);
    await life.listForRent(uid, prop.id, 0.7);
    await untilEvent(uid, prop.id, 'tenant_left');
    const ev = await events(prop.id);
    expect(ev.some((e) => e.kind === 'gli_cap')).toBe(true);
    const total = (await rows(prop.id)).reduce((a: number, r: any) => a + r.lines.gliReimbursed, 0);
    expect(total).toBeCloseTo(300, 1);
    expect(Number((await propRow(prop.id)).gli_reimbursed_eur)).toBeCloseTo(GLI_PARAMS.maxCoverageEur, 1);
  });

  it('TRÊVE HIVERNALE : la procédure aboutit en hiver mais le locataire reste jusqu\'au 1er avril, l\'impayé s\'allonge', async () => {
    quiet(); allWorkers(); alwaysDefault();
    const { uid, prop } = await player({ month: 10, seed: 'gli-treve' });     // le locataire arrive en novembre : 3 mois d'impayés = janvier
    await life.listForRent(uid, prop.id, 0.7);
    await untilEvent(uid, prop.id, 'tenant_left');
    const ev = await events(prop.id);
    const truce = ev.find((e) => e.kind === 'winter_truce')!;
    expect(truce).toBeDefined();
    expect(truce.message).toContain('1er avril');
    const left = ev.find((e) => e.kind === 'tenant_left')!;
    expect(left.month).toBe(4);
    expect(left.message).toContain('trêve hivernale');
    const st = await rows(prop.id);
    const unpaid = st.filter((r: any) => r.status === 'defaulting');
    expect(unpaid.length).toBeGreaterThan(P.defaultEpisode.maxMonths); // plus de 3 mois d'impayés
    expect(unpaid.every((r: any) => r.lines.rentCollected === 0)).toBe(true); // et rien n'est encaissé pendant la trêve
    // sans assurance : dette perdue au-delà du dépôt
    expect(left.details.arrearsLost).toBeGreaterThan(0);
    const arrearsTotal = left.details.keptForArrears + left.details.arrearsLost;
    expect(arrearsTotal).toBeCloseTo(unpaid.reduce((a: number, r: any) => a + r.lines.rentDue + r.lines.recoverableChargesPaid, 0), 1);
  });

  it('TRÊVE HIVERNALE avec assurance : tout l\'impayé de l\'hiver est remboursé', async () => {
    quiet(); allWorkers(); alwaysDefault();
    const { uid, prop } = await player({ month: 3, seed: 'gli-treve-assure' });      // contrat souscrit en mars, carence écoulée fin juin
    await life.setGli(uid, prop.id, true);
    await step(uid, 7);                                    // avril → octobre, carence largement écoulée ; nous voici en octobre
    await life.listForRent(uid, prop.id, 0.7);
    await untilEvent(uid, prop.id, 'tenant_left');
    const ev = await events(prop.id);
    expect(ev.some((e) => e.kind === 'winter_truce')).toBe(true);
    const left = ev.find((e) => e.kind === 'tenant_left')!;
    expect(left.details.arrearsLost).toBe(0);
    expect((await rows(prop.id)).reduce((a: number, r: any) => a + r.lines.gliReimbursed, 0)).toBeGreaterThan(0);
  });

  it('REPRODUCTIBLE et CONSERVATION avec assurance + impayés + trêve, 48 mois : pièces × 20 € + reliquat = somme exacte des cash-flows', async () => {
    const run = async () => {
      reset(); allWorkers();
      for (const t of Object.values(P.tenants)) t.defaultProbPerMonth = 0.15;
      const { uid, prop } = await player({ seed: 'gli-conservation', month: 5 });
      await life.setGli(uid, prop.id, true);
      await step(uid, 4);
      await life.listForRent(uid, prop.id, 1.0);
      for (let i = 0; i < 4; i++) await step(uid, 12);
      const st = await rows(prop.id);
      const cents = st.reduce((a: number, r: any) => a + Math.round(Number(r.net_cash_flow) * 100), 0);
      const coins = st.reduce((a: number, r: any) => a + r.coins_delta, 0);
      const rem = Number((await propRow(prop.id)).euro_remainder_cents);
      const g = (await query('SELECT arrears_eur FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(Number(g.arrears_eur)).toBe(0);
      expect(coins * 2000 + rem).toBe(cents);
      return JSON.stringify(st.map((r: any) => [r.year, r.month, r.status, r.lines.gliPremium, r.lines.gliReimbursed, r.net_cash_flow]));
    };
    expect(await run()).toBe(await run());
  });
});
