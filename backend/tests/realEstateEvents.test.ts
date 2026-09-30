import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import {
  pickTenantType, departureHazard, noticeFor, isLatePayment, startsDefaulting, resolveDefault, rollDamage, reletFees,
  rollUnexpectedWorks, settleDeposit, checkLandlordNotice, buildMonthlyStatement, reviseRent, EngineInputError, MonthlyInput, TenantType,
} from '../src/engine/immo';
import { EVENT_PARAMS as P } from '../src/config/immoRules';
import { createRng } from '../src/utils/seededRandom';

const ORIGINAL = JSON.parse(JSON.stringify(P));
const reset = () => { Object.assign(P, JSON.parse(JSON.stringify(ORIGINAL))); };
const quiet = () => {
  reset();
  for (const t of Object.values(P.tenants)) { t.lateProbPerMonth = 0; t.defaultProbPerMonth = 0; t.tenureMonths = 1e9; t.personalNoticeProb = 0; }
  for (const k of Object.keys(P.unexpectedWorks.probPerMonthByCondition)) (P.unexpectedWorks.probPerMonthByCondition as any)[k] = 0;
  P.damage.prob = 0;
};
const forEachTenant = (f: (t: (typeof P.tenants)['worker']) => void) => Object.values(P.tenants).forEach(f);

// ─────────────────────────── moteur pur ───────────────────────────
describe('événements : règles pures', () => {
  beforeAll(reset);
  it('mélange de locataires : les studios attirent des étudiants, les maisons des familles', () => {
    const rng = createRng(1);
    const count = (unit: 'studio' | 'apartment' | 'house') => {
      const c: Record<TenantType, number> = { student: 0, worker: 0, family: 0 };
      for (let i = 0; i < 20000; i++) c[pickTenantType(rng(), unit, P)]++;
      return c;
    };
    expect(count('studio').student).toBeGreaterThan(count('studio').family * 5);
    expect(count('house').family).toBeGreaterThan(count('house').student * 10);
    expect(count('apartment').worker / 20000).toBeGreaterThan(0.45);
    expect(() => pickTenantType(1, 'studio', P)).toThrow(EngineInputError);
  });

  it('probabilité de départ : plus haute pour un étudiant que pour une famille, plus basse en marché tendu', () => {
    expect(departureHazard('student', 0.5, P)).toBeGreaterThan(departureHazard('worker', 0.5, P));
    expect(departureHazard('worker', 0.5, P)).toBeGreaterThan(departureHazard('family', 0.5, P));
    expect(departureHazard('worker', 0.9, P)).toBeLessThan(departureHazard('worker', 0.2, P));
    for (const t of ['student', 'worker', 'family'] as const) for (const tension of [0, 0.5, 1]) {
      const h = departureHazard(t, tension, P);
      expect(h).toBeGreaterThan(0); expect(h).toBeLessThanOrEqual(0.5);
    }
  });

  it('durée d\'occupation simulée ≈ durée moyenne du type de locataire (ajustée par la ville)', () => {
    const rng = createRng(11);
    for (const t of ['student', 'family'] as const) {
      let total = 0;
      const n = 4000;
      const h = departureHazard(t, 0.5, P);
      for (let i = 0; i < n; i++) { let months = 1; while (rng() >= h) months++; total += months; }
      expect(Math.abs(total / n - 1 / h)).toBeLessThan((1 / h) * 0.08);
    }
  });

  it('préavis : 1 mois en zone tendue, 1 mois pour motif personnel, 3 mois sinon', () => {
    expect(noticeFor(true, 'worker', 0.99, P)).toEqual({ months: 1, reason: 'tense_zone' });
    expect(noticeFor(false, 'worker', 0.0, P)).toEqual({ months: 1, reason: 'personal' });
    expect(noticeFor(false, 'worker', 0.99, P)).toEqual({ months: 3, reason: 'standard' });
    expect(noticeFor(false, 'family', P.tenants.family.personalNoticeProb + 1e-9, P).months).toBe(3);
  });

  it('retards et impayés : seuils de probabilité par type de locataire', () => {
    expect(isLatePayment(P.tenants.student.lateProbPerMonth - 1e-9, 'student', P)).toBe(true);
    expect(isLatePayment(P.tenants.student.lateProbPerMonth + 1e-9, 'student', P)).toBe(false);
    expect(startsDefaulting(P.tenants.family.defaultProbPerMonth - 1e-9, 'family', P)).toBe(true);
    expect(P.tenants.student.defaultProbPerMonth).toBeGreaterThan(P.tenants.family.defaultProbPerMonth);
  });

  it('épisode d\'impayé : se poursuit, se régularise, ou le locataire part ; procédure aboutie au bout de 3 mois', () => {
    expect(resolveDefault(1, 0.99, 0.1, P)).toBe('continue');
    expect(resolveDefault(1, 0.1, 0.1, P)).toBe('catch_up');
    expect(resolveDefault(1, 0.1, 0.9, P)).toBe('leaves');
    expect(resolveDefault(P.defaultEpisode.maxMonths, 0.99, 0.1, P)).toBe('leaves');
  });

  it('dégradations et frais de remise en location', () => {
    expect(rollDamage(0.99, 0.5, 600, P)).toBe(0);
    const d = rollDamage(0.0, 0.0, 600, P);
    expect(d).toBeCloseTo(600 * P.damage.minRentMultiple, 2);
    expect(rollDamage(0.0, 0.999999, 600, P)).toBeCloseTo(600 * P.damage.maxRentMultiple, 0);
    expect(reletFees(600, 1, P)).toBe(150 + 300);
    expect(reletFees(600, 1.2, P)).toBeGreaterThan(reletFees(600, 1, P));
  });

  it('travaux imprévus : plus probables en mauvais état / classe F-G, moins dans le neuf ; montant borné', () => {
    const ctx = { condition: 'good' as const, energyClass: 'C' as const, age: 'old' as const, surfaceSqm: 50, inflation: 1 };
    const hits = (c: typeof ctx, n = 100000) => { const rng = createRng(3); let k = 0; for (let i = 0; i < n; i++) if (rollUnexpectedWorks(rng(), 0.5, c, P) > 0) k++; return k / n; };
    const base = hits(ctx);
    expect(base).toBeGreaterThan(P.unexpectedWorks.probPerMonthByCondition.good * 0.8);
    expect(base).toBeLessThan(P.unexpectedWorks.probPerMonthByCondition.good * 1.2);
    expect(hits({ ...ctx, condition: 'to_renovate' })).toBeGreaterThan(base * 1.8);
    expect(hits({ ...ctx, energyClass: 'G' })).toBeGreaterThan(base * 1.2);
    expect(hits({ ...ctx, age: 'new' })).toBeLessThan(base * 0.6);
    const low = rollUnexpectedWorks(0, 0, ctx, P), high = rollUnexpectedWorks(0, 0.999999, ctx, P);
    expect(low).toBeCloseTo(P.unexpectedWorks.minPerSqm * 50, 1);
    expect(high).toBeCloseTo(P.unexpectedWorks.maxPerSqm * 50, 0);
  });

  it('dépôt de garantie : rien n\'est créé ni perdu (propriété sur 5 000 cas)', () => {
    const rng = createRng(77);
    for (let i = 0; i < 5000; i++) {
      const deposit = Math.round(rng() * 1000), arrears = Math.round(rng() * 2500), damages = Math.round(rng() * 900);
      const s = settleDeposit(deposit, arrears, damages);
      expect(s.refund + s.keptForArrears + s.keptForDamages).toBeCloseTo(deposit, 2);
      expect(s.keptForArrears + s.arrearsLost).toBeCloseTo(arrears, 2);
      expect(s.keptForDamages + s.damagesBeyondDeposit).toBeCloseTo(damages, 2);
      expect(s.refund).toBeGreaterThanOrEqual(0);
    }
    expect(settleDeposit(500, 200, 100)).toEqual({ refund: 200, keptForArrears: 200, keptForDamages: 100, arrearsLost: 0, damagesBeyondDeposit: 0 });
    expect(settleDeposit(500, 700, 100)).toMatchObject({ refund: 0, keptForArrears: 500, arrearsLost: 200, damagesBeyondDeposit: 100 });
  });

  it('congé du propriétaire : seulement à l\'échéance, 6 mois avant, motif réel', () => {
    const start = 2010 * 12 + 1; // bail commencé en janvier 2010 → terme fini fin décembre 2012 (36 mois)
    const termEnd = start + 35;
    // exactement 6 mois avant la fin : accepté
    expect(checkLandlordNotice('sale', termEnd - 6, start, 0, P)).toMatchObject({ ok: true, effectiveTotal: termEnd, monthsUntilTermEnd: 6 });
    // 5 mois avant : trop tard
    expect(checkLandlordNotice('sale', termEnd - 5, start, 0, P)).toMatchObject({ ok: false, code: 'TOO_LATE', monthsUntilTermEnd: 5 });
    // en plein milieu du bail : accepté pour l'échéance suivante seulement
    const mid = checkLandlordNotice('sale', start + 10, start, 0, P);
    expect(mid).toMatchObject({ ok: true, effectiveTotal: termEnd });
    // après le premier terme : le bail s'est renouvelé pour 3 ans
    expect(checkLandlordNotice('sale', termEnd + 3, start, 0, P)).toMatchObject({ ok: true, effectiveTotal: termEnd + 36 });
    // motif légitime : il faut des impayés réels
    expect(checkLandlordNotice('legitimate', start + 10, start, 1, P)).toMatchObject({ ok: false, code: 'NO_LEGITIMATE_GROUNDS' });
    expect(checkLandlordNotice('legitimate', start + 10, start, 2, P)).toMatchObject({ ok: true });
    // motifs et bail invalides
    expect(checkLandlordNotice('caprice', start, start, 0, P)).toMatchObject({ ok: false, code: 'INVALID_REASON' });
    expect(checkLandlordNotice('sale', start, null, 0, P)).toMatchObject({ ok: false, code: 'NO_LEASE' });
  });

  it('récapitulatif : les flux ponctuels sont expliqués et la somme des impacts reste exacte', () => {
    const rng = createRng(5);
    for (let i = 0; i < 400; i++) {
      const rent = Math.round(300 + rng() * 1200);
      const inp: MonthlyInput = {
        year: 2015, month: 4, status: (['paying', 'late', 'defaulting'] as const)[Math.floor(rng() * 3)], rent, recoverableCharges: 40,
        nonRecoverableAnnual: { condoFees: 300, propertyTax: 500, insurance: 120, maintenance: 280 }, loanPayment: Math.round(rng() * 700), tax: { ytdBefore: 0, ratePct: 30, settleThisMonth: false },
        revision: rng() < 0.3 ? reviseRent(rent, 1.5, 'C') : undefined,
        oneOff: { depositReceived: rng() < 0.3 ? rent : 0, depositRefunded: rng() < 0.3 ? Math.round(rng() * rent) : 0, repairCosts: rng() < 0.3 ? Math.round(rng() * 400) : 0, reletFees: rng() < 0.3 ? 250 : 0, unexpectedWorks: rng() < 0.3 ? Math.round(rng() * 2000) : 0 },
        notes: rng() < 0.5 ? [{ code: 'TENANT_NOTICE', message: 'préavis' }] : [],
      };
      if (inp.revision) inp.rent = inp.revision.newRent;
      const s = buildMonthlyStatement(inp);
      const sum = s.explanations.reduce((a, e) => a + e.cashFlowImpact, 0);
      expect(Math.abs(sum - (s.lines.netCashFlow - s.normalMonthCashFlow))).toBeLessThan(0.015);
    }
  });
});

// ─────────────────────────── service + base ───────────────────────────
describe.skipIf(!hasDb)('événements dans la partie', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  afterEach(quiet);

  const cheap = (l: any) => l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 40000 && l.price < 90000;
  const anyPrice = (l: any) => l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price < 250000;
  const player = async (opts: { seed?: string; city?: string; pred?: (l: any) => boolean } = {}) => {
    const uid = await createUser({ balance: 900000, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    if (opts.seed) await query('UPDATE re_games SET seed = $2 WHERE user_id = $1', [uid, opts.seed]);
    let l: any;
    for (const x of await src.listListings(2010, opts.city ? { cityId: opts.city } : {})) {
      if (!(opts.pred ?? cheap)(x)) continue;
      if ((await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; } // pas de travaux cachés : le bien est louable
    }
    expect(l, 'bien de test introuvable').toBeDefined();
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: Math.floor((l.price * 0.5) / 20), months: 240 });
    const prop = (await svc.listProperties(uid)).properties[0];
    return { uid, prop, l };
  };
  const rows = async (propId: string) => (await query('SELECT * FROM re_statements WHERE property_id = $1 ORDER BY year, month', [propId])).rows;
  const events = async (propId: string) => (await query('SELECT * FROM re_events WHERE property_id = $1 ORDER BY year, month, seq', [propId])).rows;
  const prop = async (id: string) => (await query('SELECT * FROM re_properties WHERE id = $1', [id])).rows[0];
  const advance = async (uid: string, n: number) => { let left = n; while (left > 0) { const k = Math.min(12, left); await life.advanceTime(uid, k); left -= k; } };
  const untilEvent = async (uid: string, propId: string, kind: string, max = 60) => {
    for (let i = 0; i < max; i++) { await life.advanceTime(uid, 1); if ((await events(propId)).some((e) => e.kind === kind)) return; }
    throw new Error(`événement ${kind} jamais survenu`);
  };

  it('à l\'arrivée du locataire : type tiré, dépôt de garantie encaissé (1 mois de loyer) puis conservé à part', async () => {
    quiet();
    const { uid, prop: p0 } = await player();
    const listed = await life.listForRent(uid, p0.id, 0.7);
    await advance(uid, 3);
    const st = await rows(p0.id);
    const start = st.find((r: any) => r.lines.depositReceived > 0)!;
    expect(start).toBeDefined();
    expect(start.lines.depositReceived).toBeCloseTo(listed.askingRent, 2);
    expect(start.explanations.map((e: any) => e.code)).toContain('DEPOSIT_RECEIVED');
    expect(st.filter((r: any) => r.lines.depositReceived > 0)).toHaveLength(1); // une seule fois
    const row = await prop(p0.id);
    expect(['student', 'worker', 'family']).toContain(row.tenant_type);
    expect(Number(row.deposit_held_eur)).toBeCloseTo(listed.askingRent, 2);
  });

  it('PRÉAVIS en zone tendue : 1 mois ; le locataire paie jusqu\'au bout puis part, dépôt restitué, remise en location', async () => {
    quiet();
    forEachTenant((t) => { t.tenureMonths = 0.5; }); // départ presque immédiat
    const { uid, prop: p0 } = await player({ city: 'marvelle', pred: anyPrice, seed: 'preavis-tendu' });
    await life.listForRent(uid, p0.id, 0.7);
    await untilEvent(uid, p0.id, 'tenant_left');
    const ev = await events(p0.id);
    const notice = ev.find((e) => e.kind === 'tenant_notice')!;
    expect(notice.details.months).toBe(1);
    expect(notice.details.reason).toBe('tense_zone');
    expect(notice.message).toContain('zone tendue');
    const left = ev.find((e) => e.kind === 'tenant_left')!;
    const st = (await rows(p0.id)).find((r: any) => r.explanations.some((e: any) => e.code === 'TENANT_LEFT'))!;
    expect(st.lines.depositRefunded).toBeGreaterThan(0);
    expect(st.lines.reletFees).toBeGreaterThan(0);
    expect(st.explanations.find((e: any) => e.code === 'RELET_FEES')).toBeDefined();
    expect(left.details.refund).toBeCloseTo(st.lines.depositRefunded, 2);
    // ce mois-là le locataire a bien payé son loyer
    expect(st.lines.rentCollected).toBeGreaterThan(0);
  });

  it('PRÉAVIS hors zone tendue : 3 mois (sans motif personnel) ; le loyer est payé pendant tout le préavis', async () => {
    quiet();
    forEachTenant((t) => { t.tenureMonths = 0.5; });
    const { uid, prop: p0 } = await player({ city: 'brumevalle', seed: 'preavis-standard' });
    await life.listForRent(uid, p0.id, 0.7);
    await untilEvent(uid, p0.id, 'tenant_left');
    const ev = await events(p0.id);
    const notice = ev.find((e) => e.kind === 'tenant_notice')!;
    expect(notice.details.months).toBe(3);
    expect(notice.details.reason).toBe('standard');
    const st = await rows(p0.id);
    const noticeIdx = st.findIndex((r: any) => r.explanations.some((e: any) => e.code === 'TENANT_NOTICE'));
    const leftIdx = st.findIndex((r: any) => r.explanations.some((e: any) => e.code === 'TENANT_LEFT'));
    expect(leftIdx - noticeIdx).toBe(2); // préavis de 3 mois : mois du préavis + 2 mois suivants
    expect(st.slice(noticeIdx, leftIdx + 1).every((r: any) => r.lines.rentCollected > 0)).toBe(true);
  });

  it('PRÉAVIS pour motif personnel : réduit à 1 mois hors zone tendue', async () => {
    quiet();
    forEachTenant((t) => { t.tenureMonths = 0.5; t.personalNoticeProb = 1; });
    const { uid, prop: p0 } = await player({ city: 'brumevalle', seed: 'preavis-perso' });
    await life.listForRent(uid, p0.id, 0.7);
    await untilEvent(uid, p0.id, 'tenant_notice');
    const notice = (await events(p0.id)).find((e) => e.kind === 'tenant_notice')!;
    expect(notice.details).toMatchObject({ months: 1, reason: 'personal' });
  });

  it('DÉPÔT DE GARANTIE : dégradations retenues, impayé de départ retenu d\'abord, aucun euro créé ou perdu', async () => {
    quiet();
    forEachTenant((t) => { t.tenureMonths = 0.5; });
    P.damage.prob = 1; P.damage.minRentMultiple = 0.5; P.damage.maxRentMultiple = 0.5;
    const { uid, prop: p0 } = await player({ city: 'marvelle', pred: anyPrice, seed: 'depot' });
    await life.listForRent(uid, p0.id, 0.7);
    await untilEvent(uid, p0.id, 'tenant_left');
    const all = await rows(p0.id);
    const received = all.find((r: any) => r.lines.depositReceived > 0)!.lines.depositReceived;
    const left = all.find((r: any) => r.explanations.some((e: any) => e.code === 'TENANT_LEFT'))!;
    const rent = left.lines.rentCollected; // dernier loyer = loyer du bail
    expect(left.lines.repairCosts).toBeCloseTo(rent * 0.5, 1);
    // dépôt = 1 mois ; dégradations = 0,5 mois retenus sur le dépôt : restitué = 0,5 mois
    expect(left.lines.depositRefunded).toBeCloseTo(received - left.lines.repairCosts, 1);
    const ev = (await events(p0.id)).find((e) => e.kind === 'tenant_left')!;
    expect(ev.details.keptForDamages).toBeCloseTo(left.lines.repairCosts, 1);
    expect(ev.details.damagesBeyondDeposit).toBe(0);
    expect(ev.message).toContain('retenus pour dégradations');
  });

  it('RETARD DE PAIEMENT : simple décalage d\'un mois, rattrapé, expliqué', async () => {
    quiet();
    forEachTenant((t) => { t.lateProbPerMonth = 1; });
    const { uid, prop: p0 } = await player({ seed: 'retard' });
    const listed = await life.listForRent(uid, p0.id, 0.7);
    await advance(uid, 5);
    const st = (await rows(p0.id)).filter((r: any) => r.status !== 'vacant');
    expect(st.length).toBeGreaterThanOrEqual(3);
    expect(st[0].status).toBe('late');
    expect(st[0].lines.rentCollected).toBe(0);
    expect(st[1].lines.rentCollected).toBeCloseTo(listed.askingRent, 2); // le retard du 1er mois est rattrapé
    expect(st[1].explanations.map((e: any) => e.code)).toEqual(expect.arrayContaining(['LATE_PAYMENT', 'CATCH_UP']));
  });

  it('IMPAYÉ qui se régularise : dette enregistrée puis encaissée, expliqué', async () => {
    quiet();
    P.defaultEpisode.resolveProbPerMonth = 1; P.defaultEpisode.catchUpShare = 1;
    forEachTenant((t) => { t.defaultProbPerMonth = 1; });
    const { uid, prop: p0 } = await player({ seed: 'impaye-rattrape' });
    await life.listForRent(uid, p0.id, 0.7);
    // on avance jusqu'au premier mois de bail, l'impayé démarre immédiatement
    let stmts: any[] = [];
    for (let i = 0; i < 12 && !stmts.some((r) => r.status === 'defaulting'); i++) { await life.advanceTime(uid, 1); stmts = await rows(p0.id); }
    expect(stmts.some((r) => r.status === 'defaulting')).toBe(true);
    forEachTenant((t) => { t.defaultProbPerMonth = 0; }); // plus de nouvel impayé
    await advance(uid, 1);
    const all = await rows(p0.id);
    const d = all.find((r: any) => r.status === 'defaulting')!;
    const next = all[all.indexOf(d) + 1];
    expect(d.explanations.map((e: any) => e.code)).toContain('ARREARS');
    expect(next.explanations.map((e: any) => e.code)).toContain('ARREARS_RECOVERED');
    expect(next.lines.rentCollected).toBeGreaterThanOrEqual(d.lines.rentDue - 0.01);
    expect((await prop(p0.id)).arrears_rent_eur).toBe('0.00');
  });

  it('IMPAYÉ qui dure : au bout de 3 mois le locataire part, le dépôt couvre une partie, le reste est perdu', async () => {
    quiet();
    P.defaultEpisode.resolveProbPerMonth = 0;
    forEachTenant((t) => { t.defaultProbPerMonth = 1; });
    const { uid, prop: p0 } = await player({ seed: 'impaye-long' });
    await life.listForRent(uid, p0.id, 0.7);
    await untilEvent(uid, p0.id, 'tenant_left');
    const ev = await events(p0.id);
    const left = ev.find((e) => e.kind === 'tenant_left')!;
    expect(ev.filter((e) => e.kind === 'default_started').length).toBeGreaterThanOrEqual(1);
    expect(left.details.exit).toBe('default');
    expect(left.details.keptForArrears).toBeGreaterThan(0);
    expect(left.details.arrearsLost).toBeGreaterThan(0); // 3 mois dus > 1 mois de dépôt
    expect(left.details.refund).toBe(0);
    expect(left.message).toContain('Impayés perdus');
    const row = await prop(p0.id);
    expect(row.default_months).toBe(0);
    expect(Number(row.arrears_rent_eur)).toBe(0);
    expect(Number(row.deposit_held_eur)).toBe(0);
  });

  it('TRAVAUX IMPRÉVUS : coût dans le mois, borné par m², expliqué', async () => {
    quiet();
    P.unexpectedWorks.probPerMonthByCondition = { good: 1, to_refresh: 1, to_renovate: 1 };
    const { uid, prop: p0 } = await player({ seed: 'travaux' });
    await advance(uid, 3);
    const st = await rows(p0.id);
    const surface = Number(p0.surface_sqm);
    for (const r of st) {
      expect(r.lines.unexpectedWorks).toBeGreaterThanOrEqual(P.unexpectedWorks.minPerSqm * surface * 0.99);
      expect(r.lines.unexpectedWorks).toBeLessThanOrEqual(P.unexpectedWorks.maxPerSqm * surface * 1.2);
      expect(r.explanations.map((e: any) => e.code)).toContain('UNEXPECTED_WORKS');
    }
  });

  describe('congé du propriétaire', () => {
    const setup = async (seed: string) => {
      quiet();
      const s = await player({ seed });
      await life.listForRent(s.uid, s.prop.id, 0.7);
      await advance(s.uid, 2); // le bail démarre
      return s;
    };

    it('valide en cours de bail pour l\'échéance ; trop tard à moins de 6 mois ; IDOR ; un seul congé', async () => {
      const { uid, prop: p0 } = await setup('conge-1');
      const other = await player();
      expect((await rejects(life.landlordNotice(other.uid, p0.id, 'sale'))).code).toBe('NOT_FOUND');
      expect((await rejects(life.landlordNotice(uid, p0.id, 'caprice'))).message).toContain('Motifs possibles');
      const ok = await life.landlordNotice(uid, p0.id, 'sale');
      expect(ok.monthsUntilTermEnd).toBeGreaterThanOrEqual(6);
      expect(ok.message).toContain('à l\'échéance du bail');
      expect((await rejects(life.landlordNotice(uid, p0.id, 'sale'))).message).toContain('déjà');
    });

    it('trop tard : dans les 5 derniers mois du bail, refusé avec explication', async () => {
      const { uid, prop: p0 } = await setup('conge-2');
      await advance(uid, 31); // ~33 mois de bail écoulés sur 36
      const err = await rejects(life.landlordNotice(uid, p0.id, 'sale'));
      expect((err.details as any).code).toBe('TOO_LATE');
      expect(err.message).toContain('au moins 6 mois');
    });

    it('à l\'échéance : le locataire part, bien libre pour la vente (pas de remise en location), congé effacé', async () => {
      const { uid, prop: p0 } = await setup('conge-3');
      const ok = await life.landlordNotice(uid, p0.id, 'sale');
      await advance(uid, ok.monthsUntilTermEnd + 1);
      const row = await prop(p0.id);
      expect(row.status).toBe('vacant');
      expect(row.sale_planned).toBe(true);
      expect(row.search_elapsed_months).toBeNull();
      expect(row.landlord_notice_reason).toBeNull();
      const ev = await events(p0.id);
      expect(ev.find((e) => e.kind === 'tenant_left')!.details.exit).toBe('landlord_notice');
      expect(ev.map((e) => e.kind)).toContain('ready_for_sale');
    });

    it('motif légitime : réservé aux baux avec impayés réels ; alors la remise en location est automatique', async () => {
      const { uid, prop: p0 } = await setup('conge-4');
      expect((await rejects(life.landlordNotice(uid, p0.id, 'legitimate'))).message).toContain('2 mois d\'impayés');
      await query('UPDATE re_properties SET default_months_in_lease = 2 WHERE id = $1', [p0.id]);
      const ok = await life.landlordNotice(uid, p0.id, 'legitimate');
      await advance(uid, ok.monthsUntilTermEnd + 1);
      const row = await prop(p0.id);
      expect(row.sale_planned).toBe(false);
      expect(row.search_elapsed_months !== null || row.status === 'let').toBe(true); // remise en location lancée
    });

    it('bien vide ou préavis du locataire déjà donné : refusé', async () => {
      quiet();
      const { uid, prop: p0 } = await player({ seed: 'conge-5' });
      expect((await rejects(life.landlordNotice(uid, p0.id, 'sale'))).message).toContain('pas loué');
    });
  });

  it('GEL F/G à la relocation : le nouveau loyer ne dépasse jamais l\'ancien', async () => {
    quiet();
    forEachTenant((t) => { t.tenureMonths = 0.5; });
    const { uid, prop: p0 } = await player({ city: 'marvelle', pred: anyPrice, seed: 'gel-relet' });
    await query(`UPDATE re_properties SET energy_class = 'F' WHERE id = $1`, [p0.id]);
    const listed = await life.listForRent(uid, p0.id, 1.0);
    await untilEvent(uid, p0.id, 'tenant_left');
    const row = await prop(p0.id);
    const rentNow = row.asking_rent !== null ? Number(row.asking_rent) : Number(row.current_rent);
    expect(rentNow).toBeLessThanOrEqual(listed.askingRent + 0.01);
  });

  it('REPRODUCTIBILITÉ : même graine + mêmes actions = mêmes événements, tous les mois, sur 5 ans', async () => {
    reset(); // paramètres de jeu par défaut
    const run = async (seed: string) => {
      const { uid, prop: p0 } = await player({ seed, city: 'valcourt' });
      await life.listForRent(uid, p0.id, 1.05);
      await advance(uid, 60);
      const ev = (await events(p0.id)).map((e) => [e.year, e.month, e.kind, e.message]);
      const st = (await rows(p0.id)).map((r: any) => [r.status, r.net_cash_flow, r.coins_delta, r.remainder_cents_after, r.lines]);
      return { ev, st, balance: await balanceOf(uid) };
    };
    const a = await run('rejeu-5-ans'), b = await run('rejeu-5-ans');
    // En cas d'écart, on veut savoir OÙ (premier événement / relevé qui diffère), pas juste « différent ».
    const firstDiff = (x: unknown[], y: unknown[]) => { for (let i = 0; i < Math.max(x.length, y.length); i++) if (JSON.stringify(x[i]) !== JSON.stringify(y[i])) return `#${i}: ${JSON.stringify(x[i])?.slice(0, 300)} ≠ ${JSON.stringify(y[i])?.slice(0, 300)}`; return null; };
    const brief = (x: any[]) => x.slice(0, 8).map((e) => `${e[0]}/${e[1]} ${e[2]}`).join(' | ');
    expect(firstDiff(a.ev, b.ev), `événements — A: ${brief(a.ev)} — B: ${brief(b.ev)}`).toBeNull();
    expect(firstDiff(a.st, b.st), 'relevés').toBeNull();
    expect(b.balance).toBe(a.balance);
    expect(a.ev.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const sd of ['x1', 'x2', 'x3', 'x4']) seen.add(JSON.stringify((await run(sd)).ev.map((e) => e[2])));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('CONSERVATION avec tous les événements actifs, 60 mois : pièces × 20 € + reliquat = somme exacte des cash-flows', async () => {
    reset();
    const { uid, prop: p0 } = await player({ seed: 'conservation-evts', city: 'brumevalle' });
    await life.listForRent(uid, p0.id, 1.1);
    await advance(uid, 60);
    const st = await rows(p0.id);
    const cents = st.reduce((a: number, r: any) => a + Math.round(Number(r.net_cash_flow) * 100), 0);
    const coins = st.reduce((a: number, r: any) => a + r.coins_delta, 0);
    const rem = Number((await prop(p0.id)).euro_remainder_cents);
    const g = (await query('SELECT arrears_eur FROM re_games WHERE user_id = $1', [uid])).rows[0];
    expect(Number(g.arrears_eur)).toBe(0); // solde large : aucun débit partiel
    expect(coins * 2000 + rem).toBe(cents);
    // chaque mois : somme des lignes = net
    for (const r of st) {
      const L = r.lines;
      const net = L.rentCollected + L.recoverableChargesCollected - L.recoverableChargesPaid - L.nonRecoverableCharges - L.loanPayment - L.rentTax + L.depositReceived - L.depositRefunded - L.repairCosts - L.reletFees - L.unexpectedWorks;
      expect(Math.abs(net - Number(r.net_cash_flow))).toBeLessThan(0.011);
      expect(Math.abs(L.loanInterest + L.loanPrincipal + L.loanInsurance - L.loanPayment)).toBeLessThan(0.011);
    }
  });
});

async function rejects(p: Promise<unknown>): Promise<RealEstateError> { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); }
