import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { buildSchedule, reviseRent } from '../src/engine/immo';

const rejects = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); };
const newPlayer = async (balance = 300000, profile = 'executive') => {
  const uid = await createUser({ balance, freeDomain: 'real_estate' });
  await svc.startGame(uid, profile);
  return uid;
};
const cheap = (l: any) => l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 40000 && l.price < 90000;
const pick = async (pred: (l: any) => boolean = cheap, year = 2010) => (await src.listListings(year)).find(pred)!;
const buy = async (uid: string, l: any, coins = 1500, months = 240) => {
  await svc.purchase(uid, { listingId: l.id, downPaymentCoins: coins, months });
  return (await svc.listProperties(uid)).properties.find((p: any) => p.listing_id === l.id);
};
const stmts = async (propId: string) => (await query('SELECT * FROM re_statements WHERE property_id = $1 ORDER BY year, month', [propId])).rows;

describe.skipIf(!hasDb)('Immobilier : vie du bien (location, temps, relevés, valorisation)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  describe('mise en location', () => {
    it('loyer demandé = % du loyer de marché, borné ; validation stricte', async () => {
      const uid = await newPlayer();
      const prop = await buy(uid, await pick());
      for (const bad of [0.5, 1.5, NaN, '1', null, undefined]) {
        expect((await rejects(life.listForRent(uid, prop.id, bad))).code).toBe('INVALID_INPUT');
      }
      expect((await rejects(life.listForRent(uid, 'pas-un-uuid', 1))).code).toBe('INVALID_INPUT');
      const r = await life.listForRent(uid, prop.id, 1.1);
      expect(r.askingRent).toBeCloseTo(r.marketRent * 1.1, 1);
      expect(r.expectedVacancyMonths).toBeGreaterThan(0);
      // déjà proposé / déjà loué
      expect((await rejects(life.listForRent(uid, prop.id, 1))).code).toBe('INVALID_INPUT');
    });

    it('SÉCURITÉ : on ne met pas en location le bien d\'un autre', async () => {
      const owner = await newPlayer(); const other = await newPlayer();
      const prop = await buy(owner, await pick());
      expect((await rejects(life.listForRent(other, prop.id, 1))).code).toBe('NOT_FOUND');
      expect((await rejects(life.getStatements(other, prop.id, undefined))).code).toBe('NOT_FOUND');
    });

    it('bien avec travaux à payer : location refusée tant que non payés', async () => {
      const uid = await newPlayer();
      const l = await pick((x) => x.age === 'old' && x.price < 120000 && x.advertisedWorks > 0 && x.condition === 'to_renovate');
      const truth = (await src.getExpertise(l.id, 2010))!;
      let prop = await buy(uid, l, 2500);
      if (Number(prop.pending_works_eur) > 0) {
        expect((await rejects(life.listForRent(uid, prop.id, 1))).message).toContain('Travaux à payer');
        await svc.payPendingWorks(uid, prop.id);
      }
      expect(truth.realWorks).toBeGreaterThan(0);
      expect((await life.listForRent(uid, prop.id, 1)).propertyId).toBe(prop.id);
    });

    it('mise en location : probabilités et plafond calculés côté serveur', async () => {
      const uid = await newPlayer();
      const prop = await buy(uid, await pick());
      const r = await life.listForRent(uid, prop.id, 1.15);
      expect(r.monthlyLetProbabilityPct).toBeGreaterThan(0);
      expect(r.monthlyLetProbabilityPct).toBeLessThan(100);
      expect(r.maxVacantMonths).toBeGreaterThanOrEqual(1);
      expect(r.expectedVacancyMonths).toBeGreaterThan(0);
    });

    it('RÉAGIR : baisser le loyer pendant la vacance augmente la probabilité et resserre le plafond', async () => {
      // On cherche un bien dont la première recherche échoue (tirage du mois) pour pouvoir le repricer.
      let uid = '', prop: any, listed: any;
      for (let tries = 0; tries < 30; tries++) {
        uid = await newPlayer();
        prop = await buy(uid, await pick());
        listed = await life.listForRent(uid, prop.id, 1.3);
        if (!listed.tenantFoundImmediately) break;
      }
      expect(listed.tenantFoundImmediately).toBe(false);
      const r = await life.repriceListing(uid, prop.id, 0.8);
      expect(r.askingRent).toBeLessThan(listed.askingRent);
      expect(r.monthlyLetProbabilityPct).toBeGreaterThan(listed.monthlyLetProbabilityPct);
      expect(r.maxVacantMonths).toBeLessThan(listed.maxVacantMonths);
      const row = (await query('SELECT asking_rent FROM re_properties WHERE id = $1', [prop.id])).rows[0];
      expect(Number(row.asking_rent)).toBeCloseTo(r.askingRent, 2);
      // bornes et état
      expect((await rejects(life.repriceListing(uid, prop.id, 0.3))).code).toBe('INVALID_INPUT');
      expect((await rejects(life.repriceListing(uid, prop.id, 2))).code).toBe('INVALID_INPUT');
    });

    it('repricer sans recherche en cours, ou le bien d\'un autre : refusé', async () => {
      const owner = await newPlayer(); const other = await newPlayer();
      const prop = await buy(owner, await pick());
      expect((await rejects(life.repriceListing(owner, prop.id, 1))).code).toBe('INVALID_INPUT'); // pas en recherche
      await life.listForRent(owner, prop.id, 1.3);
      expect((await rejects(life.repriceListing(other, prop.id, 1))).code).toBe('NOT_FOUND');
    });

    it('pas de « reroll » : le tirage d\'un mois ne dépend que de (graine, bien, mois)', async () => {
      const { monthlyDraw } = await import('../src/services/realEstateLifeService');
      expect(monthlyDraw('g', 'k', 24121)).toBe(monthlyDraw('g', 'k', 24121));
      expect(monthlyDraw('g', 'k', 24121)).not.toBe(monthlyDraw('g', 'k', 24122));
      expect(monthlyDraw('g', 'k', 24121)).not.toBe(monthlyDraw('h', 'k', 24121));
      const draws = Array.from({ length: 2000 }, (_, i) => monthlyDraw('g', 'k', i));
      expect(draws.every((u) => u >= 0 && u < 1)).toBe(true);
      const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
      expect(mean).toBeGreaterThan(0.47); expect(mean).toBeLessThan(0.53);
    });
  });

  describe('les mois passent', () => {
    it('bien vide non proposé : charges et mensualité coûtent, relevé expliqué, pièces débitées', async () => {
      const uid = await newPlayer(50000);
      const prop = await buy(uid, await pick());
      const before = await balanceOf(uid);
      const r = await life.advanceTime(uid, 1);
      expect(r.month).toBe(2);
      const st = (await stmts(prop.id))[0];
      expect(st.status).toBe('vacant');
      expect(Number(st.net_cash_flow)).toBeLessThan(0);
      expect(st.explanations.map((e: any) => e.code)).toContain('VACANCY');
      expect(st.coins_delta).toBeLessThan(0);
      expect(await balanceOf(uid)).toBe(before + st.coins_delta);
      const reason = (await query(`SELECT reason, nature FROM investcoins_transactions WHERE user_id = $1 AND reason LIKE 're_cashflow%'`, [uid])).rows[0];
      expect(reason).toMatchObject({ reason: 're_cashflow_out', nature: 'destruction' });
      expect(r.settled[0].properties[0].hint).toBe('NOT_LISTED');
      expect(st.explanations.map((e: any) => e.code)).toContain('NOT_LISTED');
      expect(st.explanations.find((e: any) => e.code === 'NOT_LISTED').cashFlowImpact).toBe(0);
    });

    it('CONSERVATION sur 36 mois : Σ pièces × 20 € + reliquat = Σ cash-flows exacts', async () => {
      const uid = await newPlayer(400000);
      const prop = await buy(uid, await pick());
      await life.listForRent(uid, prop.id, 1);
      for (let i = 0; i < 3; i++) await life.advanceTime(uid, 12);
      const rows = await stmts(prop.id);
      expect(rows).toHaveLength(36);
      const totalCents = rows.reduce((a: number, r: any) => a + Math.round(Number(r.net_cash_flow) * 100), 0);
      const totalCoins = rows.reduce((a: number, r: any) => a + r.coins_delta, 0);
      const remainder = Number((await query('SELECT euro_remainder_cents AS r FROM re_properties WHERE id = $1', [prop.id])).rows[0].r);
      expect(totalCoins * 2000 + remainder).toBe(totalCents);
      expect(remainder).toBeGreaterThanOrEqual(0);
      expect(remainder).toBeLessThan(2000);
      // ventilation : intérêts + capital + assurance = mensualité, chaque mois
      for (const r of rows) {
        const l = r.lines;
        expect(l.loanInterest + l.loanPrincipal + l.loanInsurance).toBeCloseTo(l.loanPayment, 2);
      }
      const principalPaid = rows.reduce((a: number, r: any) => a + r.lines.loanPrincipal, 0);
      const loanRow = (await query('SELECT principal, months_paid FROM re_loans WHERE id = $1', [prop.loan_id])).rows[0];
      expect(principalPaid).toBeGreaterThan(0);
      expect(principalPaid).toBeLessThan(Number(loanRow.principal));
      // le ledger contient exactement ces pièces (hors achat)
      const ledger = (await query(`SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1 AND reason LIKE 're_cashflow%'`, [uid])).rows[0].s;
      expect(ledger).toBe(totalCoins);
    });

    it('vacance puis locataire : mois vides consécutifs, loyer encaissé ensuite, bail et statuts cohérents', async () => {
      const uid = await newPlayer(400000);
      const prop = await buy(uid, await pick());
      const r = await life.listForRent(uid, prop.id, 1.3);
      await life.advanceTime(uid, 12);
      const rows = await stmts(prop.id);
      const firstPaying = rows.findIndex((x: any) => x.status === 'paying');
      const vacantCount = firstPaying === -1 ? rows.length : firstPaying;
      expect(vacantCount).toBeLessThanOrEqual(r.maxVacantMonths);
      expect(rows.slice(0, vacantCount).every((x: any) => x.status === 'vacant')).toBe(true);
      // rang du mois vide expliqué
      rows.slice(0, vacantCount).forEach((x: any, i: number) => {
        expect(x.explanations.find((e: any) => e.code === 'VACANCY').message).toContain(`mois n°${i + 1}`);
        expect(x.explanations.find((e: any) => e.code === 'VACANCY').message).toContain(r.askingRent.toFixed(2).replace('.', ','));
      });
      if (firstPaying !== -1) {
        const paying = rows.slice(firstPaying);
        expect(paying.every((x: any) => x.status === 'paying')).toBe(true);
        expect(paying.every((x: any) => Math.abs(Number(x.lines.rentCollected) - r.askingRent) < 0.01)).toBe(true);
        const p = (await query('SELECT status, current_rent FROM re_properties WHERE id = $1', [prop.id])).rows[0];
        expect(p.status).toBe('let');
        expect(Number(p.current_rent)).toBeCloseTo(r.askingRent, 2);
      }
    });

    it('indexation IRL à la date anniversaire, montant exact, expliquée ; gel pour classe F/G', async () => {
      const uid = await newPlayer(600000);
      const l = await pick((x) => cheap(x) && !['F', 'G'].includes(x.energyClass));
      const prop = await buy(uid, l);
      const listed = await life.listForRent(uid, prop.id, 0.7); // loyer bas : location rapide
      await life.advanceTime(uid, 12); await life.advanceTime(uid, 12);
      const rows = await stmts(prop.id);
      const start = rows.findIndex((x: any) => x.status === 'paying'); // le bail commence au 1er mois payé
      expect(start).toBeGreaterThanOrEqual(0);
      const revIdx = rows.findIndex((x: any) => x.explanations.some((e: any) => e.code === 'INDEXATION'));
      expect(revIdx).toBe(start + 12); // 12 mois après le début du bail
      expect(listed.askingRent).toBeGreaterThan(0);
      const irl = await src.getIrlAnnualChangePct(rows[revIdx].year);
      const expected = reviseRent(listed.askingRent, irl, l.energyClass).newRent;
      expect(Number(rows[revIdx].lines.rentDue)).toBeCloseTo(expected, 2);
      expect(rows.filter((x: any) => x.explanations.some((e: any) => e.code === 'INDEXATION'))).toHaveLength(1);
    });

    it('gel des loyers F/G : jamais d\'indexation, expliqué', async () => {
      // Les biens F/G du catalogue sont rénovés à l'achat : on force la classe F pour tester le gel.
      const uid = await newPlayer(600000);
      const prop = await buy(uid, await pick());
      await query(`UPDATE re_properties SET energy_class = 'F' WHERE id = $1`, [prop.id]);
      const listed = await life.listForRent(uid, prop.id, 0.7);
      await life.advanceTime(uid, 12); await life.advanceTime(uid, 12);
      const rows = await stmts(prop.id);
      expect(rows.some((x: any) => x.explanations.some((e: any) => e.code === 'INDEXATION'))).toBe(false);
      const frozen = rows.filter((x: any) => x.explanations.some((e: any) => e.code === 'INDEXATION_FROZEN'));
      expect(frozen.length).toBeGreaterThanOrEqual(1);
      expect(frozen[0].explanations.find((e: any) => e.code === 'INDEXATION_FROZEN').message).toContain('gelé');
      expect(Number((await query('SELECT current_rent FROM re_properties WHERE id = $1', [prop.id])).rows[0].current_rent)).toBeCloseTo(listed.askingRent, 2);
    });

    it('prêt : échéances exactes du tableau d\'amortissement, soldé au dernier mois', async () => {
      const uid = await newPlayer(600000);
      const l = await pick();
      // apport calculé pour n'emprunter que ~6 000 € (une mensualité compatible avec l'endettement)
      const coins = Math.floor((l.price * 1.075 - 6000) / 20);
      const prop = await buy(uid, l, coins, 12); // prêt sur 12 mois
      const loan = (await query('SELECT * FROM re_loans WHERE id = $1', [prop.loan_id])).rows[0];
      const sched = buildSchedule({ principal: Number(loan.principal), annualRatePct: Number(loan.annual_rate_pct), months: 12, insurance: { annualRatePct: Number(loan.insurance_rate_pct), basis: 'initial' } });
      await life.advanceTime(uid, 12);
      const rows = await stmts(prop.id);
      rows.forEach((r: any, i: number) => expect(Number(r.lines.loanPayment)).toBeCloseTo(sched.rows[i].totalPayment, 2));
      const after = (await query('SELECT months_paid, status FROM re_loans WHERE id = $1', [prop.loan_id])).rows[0];
      expect(after).toEqual({ months_paid: 12, status: 'repaid' });
      await life.advanceTime(uid, 1); // plus de mensualité
      expect(Number((await stmts(prop.id))[12].lines.loanPayment)).toBe(0);
      const pf = await life.getPortfolio(uid);
      expect(pf.properties[0].remainingLoan).toBe(0);
    });

    it('avancées SIMULTANÉES sérialisées : chaque mois réglé une seule fois', async () => {
      const uid = await newPlayer(400000);
      const prop = await buy(uid, await pick());
      const r = await Promise.allSettled([life.advanceTime(uid, 2), life.advanceTime(uid, 3), life.advanceTime(uid, 1)]);
      expect(r.every((x) => x.status === 'fulfilled')).toBe(true);
      expect((await stmts(prop.id))).toHaveLength(6);
      const g = (await query('SELECT simulated_year AS y, simulated_month AS m FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(g.y * 12 + g.m).toBe(2010 * 12 + 1 + 6);
    });

    it('MÊME GRAINE, mêmes actions = mêmes résultats exacts ; graines différentes = parcours différents', async () => {
      const run = async (seed: string) => {
        const uid = await newPlayer(400000);
        await query('UPDATE re_games SET seed = $2 WHERE user_id = $1', [uid, seed]);
        const prop = await buy(uid, await pick((x) => cheap(x) && x.cityId === 'brumevalle'));
        await life.listForRent(uid, prop.id, 1.2);
        await life.advanceTime(uid, 12); await life.advanceTime(uid, 12);
        const rows = await stmts(prop.id);
        return { rows: rows.map((r: any) => [r.year, r.month, r.status, r.net_cash_flow, r.coins_delta, r.remainder_cents_after]), balance: await balanceOf(uid), ledger: await ledgerSum(uid) };
      };
      const a = await run('graine-A'); const b = await run('graine-A');
      expect(b).toEqual(a);
      const outcomes = new Set<string>();
      for (const sd of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']) outcomes.add(JSON.stringify((await run(sd)).rows.map((r) => r[2])));
      expect(outcomes.size).toBeGreaterThan(1);
    });

    it('validation du temps et date maximale', async () => {
      const uid = await newPlayer(1000);
      for (const bad of [0, 13, 1.5, '3', null, -2]) expect((await rejects(life.advanceTime(uid, bad))).code).toBe('INVALID_INPUT');
      await query(`UPDATE re_games SET simulated_year = 2026, simulated_month = 12 WHERE user_id = $1`, [uid]);
      expect((await rejects(life.advanceTime(uid, 1))).message).toContain('Date maximale');
    });
  });

  describe('impayés du joueur (solde insuffisant)', () => {
    it('faute de pièces : dette en euros, avertissement, achat bloqué, puis régularisation', async () => {
      const uid = await newPlayer(4000);
      const prop = await buy(uid, await pick(), 800);
      await query('UPDATE investcoins_balance SET balance = 0 WHERE user_id = $1', [uid]); // le joueur n'a plus rien
      const r = await life.advanceTime(uid, 1);
      expect(r.settled[0].arrearsEur).toBeGreaterThan(0);
      expect(r.settled[0].warnings[0].code).toBe('ARREARS');
      expect(await balanceOf(uid)).toBe(0);
      const other = await pick((x) => cheap(x) && x.id !== prop.listing_id);
      const err = await rejects(svc.purchase(uid, { listingId: other.id, downPaymentCoins: 900, months: 240 }));
      expect(['BANK_REFUSED', 'INSUFFICIENT_FUNDS']).toContain(err.code);
      if (err.code === 'BANK_REFUSED') expect(JSON.stringify(err.details)).toContain('LOAN_ARREARS');
      await life.advanceTime(uid, 2);
      const g = (await query('SELECT arrears_eur, missed_months FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(Number(g.arrears_eur)).toBeGreaterThan(0);
      expect(g.missed_months).toBe(3);
      await query('UPDATE investcoins_balance SET balance = 100000 WHERE user_id = $1', [uid]);
      const ok = await life.advanceTime(uid, 1);
      expect(ok.settled[0].arrearsEur).toBe(0);
      expect(Number((await query('SELECT arrears_eur FROM re_games WHERE user_id = $1', [uid])).rows[0].arrears_eur)).toBe(0);
    });
  });

  describe('valorisation et rénovation', () => {
    it('valeur ≈ prix payé à l\'achat, puis suit le marché de la ville ; fonds propres = valeur − dette', async () => {
      const uid = await newPlayer(400000);
      const l = await pick();
      const prop = await buy(uid, l);
      const pf0 = await life.getPortfolio(uid);
      expect(pf0.properties[0].value).toBeGreaterThan(l.price * 0.9);
      expect(pf0.properties[0].value).toBeLessThan(l.price * 1.1);
      const loan = (await query('SELECT principal FROM re_loans WHERE id = $1', [prop.loan_id])).rows[0];
      expect(pf0.properties[0].remainingLoan).toBeCloseTo(Number(loan.principal), 0);
      expect(pf0.properties[0].equity).toBeCloseTo(pf0.properties[0].value - pf0.properties[0].remainingLoan, 1);
      for (let i = 0; i < 5; i++) await life.advanceTime(uid, 12);
      const pf5 = await life.getPortfolio(uid);
      const ratio = pf5.properties[0].value / pf0.properties[0].value;
      const m0 = (await src.getMarket(l.cityId, 2010))!.pricePerSqm, m5 = (await src.getMarket(l.cityId, 2015))!.pricePerSqm;
      expect(ratio).toBeCloseTo(m5 / m0, 1);
      expect(pf5.properties[0].remainingLoan).toBeLessThan(pf0.properties[0].remainingLoan);
      expect(pf5.totals.equity).toBeCloseTo(pf5.totals.value - pf5.totals.debt, 1);
    });

    it('rénovation : travaux payés → bon état, énergie améliorée, valeur et loyer en hausse', async () => {
      const uid = await newPlayer(600000);
      const l = await pick((x) => x.age === 'old' && x.price < 100000 && x.condition === 'to_renovate' && ['E', 'F', 'G'].includes(x.energyClass));
      expect(l, 'il faut un bien à rénover E/F/G dans le catalogue de test').toBeDefined();
      const prop = await buy(uid, l, 2500);
      const before = await life.getPortfolio(uid);
      const beforeRent = before.properties[0].marketRent;
      if (Number(prop.pending_works_eur) > 0) await svc.payPendingWorks(uid, prop.id);
      const after = await life.getPortfolio(uid);
      const p = after.properties[0];
      expect(p.condition).toBe('good');
      expect(['C', 'D']).toContain(String(p.energy_class).trim());
      expect(p.initial_condition).toBe('to_renovate');
      expect(p.marketRent).toBeGreaterThan(beforeRent);
      expect(p.value).toBeGreaterThan(before.properties[0].value);
    });
  });

  describe('récapitulatif mensuel', () => {
    it('totaux = somme des biens, chaque variation expliquée', async () => {
      const uid = await newPlayer(600000);
      const ls = (await src.listListings(2010)).filter(cheap).slice(0, 2);
      const props = [await buy(uid, ls[0]), await buy(uid, ls[1])];
      await life.listForRent(uid, props[0].id, 0.7);
      await life.advanceTime(uid, 4);
      const sum: any = await life.getMonthSummary(uid, undefined, undefined);
      expect(sum.properties).toHaveLength(2);
      const net = sum.properties.reduce((a: number, p: any) => a + p.netCashFlow, 0);
      expect(sum.totals.netCashFlow).toBeCloseTo(net, 2);
      expect(sum.properties.every((p: any) => p.explanations.length >= 1)).toBe(true);
      const t = sum.totals;
      expect(t.netCashFlow).toBeCloseTo(t.rentCollected + t.recoverableChargesCollected - t.recoverableChargesPaid - t.nonRecoverableCharges - t.loanPayment - t.rentTax, 1);
      expect(((await life.getMonthSummary(uid, 2010, 1)) as any).properties).toHaveLength(2);
      expect((await rejects(life.getMonthSummary(uid, 2010, 13))).code).toBe('INVALID_INPUT');
    });
  });

  it('le solde reste égal au ledger après toutes ces opérations (aucune pièce fantôme)', async () => {
    const r = (await query(`SELECT count(*)::int AS n FROM investcoins_balance WHERE balance < 0`)).rows[0].n;
    expect(r).toBe(0);
    expect(await ledgerSum(await createUser({ balance: 0 }))).toBe(0);
  });
});
