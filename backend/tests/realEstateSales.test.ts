import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { realEstateSaleService as sales, getRealEstateLeaderboard, wealthMetrics } from '../src/services/realEstateSaleService';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import {
  incomeTaxAllowancePct, socialChargesAllowancePct, highGainSurtax, earlyRepaymentFee, energyAuditRequired, rentalBannedByEnergy,
  computeSaleClosing, buildSchedule, applyEnergyRenovation, EngineInputError,
} from '../src/engine/immo';
import { CAPITAL_GAIN_RULES, EVENT_PARAMS, SALE_PARAMS, RENOVATION_RULES } from '../src/config/immoRules';

// ─────────────────────────── règles pures ───────────────────────────
describe('plus-value : abattements pour durée de détention (barème exact des sources)', () => {
  it('impôt sur le revenu : 0 jusqu\'à 5 ans, 6 %/an de la 6e à la 21e année, exonération à 22 ans', () => {
    for (const y of [0, 1, 5]) expect(incomeTaxAllowancePct(y)).toBe(0);
    expect(incomeTaxAllowancePct(6)).toBe(6);
    expect(incomeTaxAllowancePct(10)).toBe(30);
    expect(incomeTaxAllowancePct(21)).toBe(96);
    expect(incomeTaxAllowancePct(22)).toBe(100); // 96 % + 4 % la 22e année
    expect(incomeTaxAllowancePct(40)).toBe(100);
  });
  it('prélèvements sociaux : 1,65 %/an (6e–21e), 1,60 % (22e), 9 %/an (23e–30e), exonération à 30 ans : rythme NON constant', () => {
    expect(socialChargesAllowancePct(5)).toBe(0);
    expect(socialChargesAllowancePct(6)).toBe(1.65);
    expect(socialChargesAllowancePct(10)).toBe(8.25);
    expect(socialChargesAllowancePct(21)).toBe(26.4);
    expect(socialChargesAllowancePct(22)).toBe(28);
    expect(socialChargesAllowancePct(23)).toBe(37);
    expect(socialChargesAllowancePct(29)).toBe(91);
    expect(socialChargesAllowancePct(30)).toBe(100);
    // les pas annuels changent bien à partir de la 22e année
    const step = (y: number) => Math.round((socialChargesAllowancePct(y) - socialChargesAllowancePct(y - 1)) * 100) / 100;
    expect([step(7), step(21), step(22), step(23), step(30)]).toEqual([1.65, 1.65, 1.6, 9, 9]);
    for (let y = 1; y <= 45; y++) expect(socialChargesAllowancePct(y)).toBeGreaterThanOrEqual(socialChargesAllowancePct(y - 1));
  });
  it('entrées invalides', () => {
    expect(() => incomeTaxAllowancePct(-1)).toThrow(EngineInputError);
    expect(() => socialChargesAllowancePct(2.5)).toThrow(EngineInputError);
  });
});

describe('surtaxe sur les plus-values élevées', () => {
  it('aucune jusqu\'à 50 000 € ; paliers 2 %, 3 %, 4 %, 5 %, 6 % appliqués à toute la plus-value', () => {
    expect(highGainSurtax(0)).toBe(0);
    expect(highGainSurtax(50000)).toBe(0);
    expect(highGainSurtax(80000)).toBe(1600);
    expect(highGainSurtax(130000)).toBe(3900);
    expect(highGainSurtax(180000)).toBe(7200);
    expect(highGainSurtax(230000)).toBe(11500);
    expect(highGainSurtax(300000)).toBe(18000);
  });
  it('lissage entre les paliers : courbe continue (aucun saut) et croissante', () => {
    for (const edge of [60000, 100000, 110000, 150000, 160000, 200000, 210000, 250000, 260000]) {
      expect(Math.abs(highGainSurtax(edge + 1) - highGainSurtax(edge))).toBeLessThan(0.5);
    }
    let prev = 0;
    for (let g = 50001; g <= 320000; g += 250) { const v = highGainSurtax(g); expect(v).toBeGreaterThanOrEqual(prev - 0.01); prev = v; }
  });
});

describe('indemnité de remboursement anticipé, audit énergétique, interdiction de location', () => {
  it('IRA = le plus faible de 6 mois d\'intérêts et 3 % du capital restant dû', () => {
    expect(earlyRepaymentFee(100000, 3)).toBe(1500);  // 6 mois d'intérêts (1 500) < 3 % (3 000)
    expect(earlyRepaymentFee(100000, 8)).toBe(3000);  // 3 % (3 000) < 6 mois d'intérêts (4 000)
    expect(earlyRepaymentFee(0, 3)).toBe(0);
  });
  it('audit énergétique : maisons seulement ; F/G depuis 04/2023, E depuis 01/2025, D depuis 2034 ; jamais pour un appartement en copropriété', () => {
    expect(energyAuditRequired('house', 'F', 2023, 3)).toBe(false);
    expect(energyAuditRequired('house', 'F', 2023, 4)).toBe(true);
    expect(energyAuditRequired('house', 'G', 2026, 1)).toBe(true);
    expect(energyAuditRequired('house', 'E', 2024, 12)).toBe(false);
    expect(energyAuditRequired('house', 'E', 2025, 1)).toBe(true);
    expect(energyAuditRequired('house', 'D', 2033, 12)).toBe(false);
    expect(energyAuditRequired('house', 'D', 2034, 1)).toBe(true);
    expect(energyAuditRequired('house', 'C', 2030, 1)).toBe(false);
    for (const unit of ['studio', 'apartment'] as const) expect(energyAuditRequired(unit, 'G', 2026, 1)).toBe(false);
  });
  it('interdiction de louer : G dès 2025, F dès 2028, E dès 2034', () => {
    expect([rentalBannedByEnergy('G', 2024), rentalBannedByEnergy('G', 2025)]).toEqual([false, true]);
    expect([rentalBannedByEnergy('F', 2027), rentalBannedByEnergy('F', 2028)]).toEqual([false, true]);
    expect([rentalBannedByEnergy('E', 2033), rentalBannedByEnergy('E', 2034)]).toEqual([false, true]);
    expect(rentalBannedByEnergy('D', 2040)).toBe(false);
  });
  it('rénovation énergétique : 2 classes gagnées, jamais au-delà de C, jamais dégradée', () => {
    expect(applyEnergyRenovation('G', RENOVATION_RULES)).toBe('E');
    expect(applyEnergyRenovation('F', RENOVATION_RULES)).toBe('D');
    expect(applyEnergyRenovation('E', RENOVATION_RULES)).toBe('C');
    expect(applyEnergyRenovation('D', RENOVATION_RULES)).toBe('C');
    expect(applyEnergyRenovation('C', RENOVATION_RULES)).toBe('C');
    expect(applyEnergyRenovation('A', RENOVATION_RULES)).toBe('A');
  });
});

describe('clôture d\'une vente : tous les postes', () => {
  const base = {
    salePrice: 300000, capitalRemaining: 120000, loanRatePct: 3, applyEarlyRepaymentFee: true, agencyFeePct: 5.78,
    diagnosticsCost: 300, energyAuditCost: 0, proceedingCosts: 0, depositToTransfer: 0, rentalTaxDue: 0,
    purchase: { price: 200000, notaryFees: 15000, works: 0, yearsHeld: 10 }, gainRules: CAPITAL_GAIN_RULES,
  };
  it('exemple complet chiffré : plus-value, abattements, impôts, produit net', () => {
    const r = computeSaleClosing(base);
    expect(r.agencyFees).toBe(17340);
    expect(r.earlyRepaymentFee).toBe(1800); // 6 mois d'intérêts (1 800) < 3 % (3 600)
    const g = r.capitalGain;
    expect(g.costBasis).toBe(245000);                 // 200 000 + 15 000 de notaire + forfait travaux 15 % (30 000, détention ≥ 5 ans)
    expect(g.grossGain).toBe(37660);                  // 300 000 − 17 340 − 245 000
    expect(g.incomeTaxBase).toBe(26362);              // abattement de 30 % (10 ans)
    expect(g.incomeTax).toBe(5008.78);                // 19 %
    expect(g.socialChargesBase).toBe(34553.05);       // abattement de 8,25 %
    expect(g.socialCharges).toBe(5943.12);           // 17,2 %
    expect(g.surtax).toBe(0);                          // base ≤ 50 000 €
    expect(r.netProceeds).toBeCloseTo(300000 - 120000 - 1800 - 17340 - 300 - g.totalTax, 2);
  });
  it('conservation : prix = tous les prélèvements + produit net', () => {
    const r = computeSaleClosing({ ...base, depositToTransfer: 450, rentalTaxDue: 320, energyAuditCost: 800 });
    const parts = r.loanPayoff + r.earlyRepaymentFee + r.agencyFees + r.diagnostics + r.energyAudit + r.proceedingCosts + r.capitalGain.totalTax + r.rentalTaxSettled + r.depositTransferred + r.netProceeds;
    expect(parts).toBeCloseTo(r.salePrice, 1);
  });
  it('détention de plus de 22 ans : plus d\'impôt sur le revenu ; de plus de 30 ans : plus aucun impôt', () => {
    const at = (yearsHeld: number) => computeSaleClosing({ ...base, purchase: { ...base.purchase, yearsHeld } }).capitalGain;
    expect(at(22).incomeTax).toBe(0);
    expect(at(22).socialCharges).toBeGreaterThan(0);
    expect(at(30).totalTax).toBe(0);
  });
  it('vente forcée : pas d\'indemnité de remboursement, pas d\'agence, frais de procédure ; produit négatif possible', () => {
    const r = computeSaleClosing({ ...base, salePrice: 100000, capitalRemaining: 120000, applyEarlyRepaymentFee: false, agencyFeePct: 0, diagnosticsCost: 0, proceedingCosts: 6000 });
    expect(r.earlyRepaymentFee).toBe(0);
    expect(r.agencyFees).toBe(0);
    expect(r.proceedingCosts).toBe(6000);
    expect(r.netProceeds).toBe(-26000); // 100 000 − 120 000 − 6 000 (moins-value : aucun impôt)
  });
  it('les frais d\'agence du vendeur réduisent la plus-value imposable', () => {
    const with_ = computeSaleClosing(base).capitalGain.grossGain;
    const without = computeSaleClosing({ ...base, agencyFeePct: 0 }).capitalGain.grossGain;
    expect(without - with_).toBeCloseTo(17340, 1);
  });
});

// ─────────────────────────── service + base ───────────────────────────
describe.skipIf(!hasDb)('reventes, difficultés de paiement, DPE, classement', () => {
  beforeAll(async () => {
    await setupDb();
    for (const t of Object.values(EVENT_PARAMS.tenants)) { t.lateProbPerMonth = 0; t.defaultProbPerMonth = 0; t.tenureMonths = 1e9; }
    for (const k of Object.keys(EVENT_PARAMS.unexpectedWorks.probPerMonthByCondition)) (EVENT_PARAMS.unexpectedWorks.probPerMonthByCondition as any)[k] = 0;
    EVENT_PARAMS.damage.prob = 0;
  });
  afterAll(teardownDb);

  const rejects = async (p: Promise<unknown>): Promise<RealEstateError> => { try { await p; } catch (e) { return e as RealEstateError; } throw new Error('aurait dû échouer'); };
  const cheap = (l: any) => l.age === 'old' && l.advertisedWorks === 0 && l.condition !== 'to_renovate' && l.price > 50000 && l.price < 110000;
  const setup = async (opts: { balance?: number; seed?: string; startYear?: number; pred?: (l: any) => boolean; apportShare?: number } = {}) => {
    const uid = await createUser({ balance: opts.balance ?? 900000, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    if (opts.seed) await query('UPDATE re_games SET seed = $2 WHERE user_id = $1', [uid, opts.seed]);
    const startYear = opts.startYear ?? 2010;
    if (startYear !== 2010) await query('UPDATE re_games SET simulated_year = $2 WHERE user_id = $1', [uid, startYear]);
    let l: any;
    for (const x of await src.listListings(startYear)) {
      if (!(opts.pred ?? cheap)(x)) continue;
      if ((await src.getExpertise(x.id, startYear))!.hiddenDefects.length === 0) { l = x; break; }
    }
    expect(l, 'bien de test introuvable').toBeDefined();
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: Math.floor((l.price * (opts.apportShare ?? 0.5)) / 20), months: 300 });
    const prop = (await svc.listProperties(uid)).properties[0];
    return { uid, prop, l };
  };
  const row = async (id: string) => (await query('SELECT * FROM re_properties WHERE id = $1', [id])).rows[0];
  const sale = async (propId: string) => (await query('SELECT * FROM re_sales WHERE property_id = $1', [propId])).rows[0];
  const advance = async (uid: string, n: number) => { let left = n; while (left > 0) { const k = Math.min(12, left); await life.advanceTime(uid, k); left -= k; } };
  const untilSold = async (uid: string, propId: string, max = 36) => { for (let i = 0; i < max; i++) { if ((await row(propId)).status === 'sold') return; await life.advanceTime(uid, 1); } throw new Error('bien jamais vendu'); };

  describe('vente à l\'amiable', () => {
    it('prix demandé borné ; SÉCURITÉ : bien d\'un autre joueur, identifiant invalide', async () => {
      const { uid, prop } = await setup();
      for (const bad of [0.5, 1.2, NaN, '1', null]) expect((await rejects(sales.sell(uid, prop.id, bad))).code).toBe('INVALID_INPUT');
      expect((await rejects(sales.sell(uid, 'x', 1))).code).toBe('INVALID_INPUT');
      const other = await setup();
      expect((await rejects(sales.sell(other.uid, prop.id, 1))).code).toBe('NOT_FOUND');
    });

    it('vente conclue : prêt soldé, pièces créditées sans perte, ligne du ledger « échange », bien marqué vendu, explication complète', async () => {
      const { uid, prop } = await setup({ balance: 300000 });
      await advance(uid, 26); // 2 ans + 2 mois de détention
      const before = await balanceOf(uid);
      const info: any = await sales.sell(uid, prop.id, 0.85); // prix bas : vente rapide
      if (!info.sold) await untilSold(uid, prop.id);
      const s = await sale(prop.id);
      const p = await row(prop.id);
      expect(p.status).toBe('sold');
      expect(s.kind).toBe('amicable');
      const b = s.breakdown;
      // prêt soldé au capital restant dû exact (tableau d'amortissement)
      const loan = (await query('SELECT * FROM re_loans WHERE id = $1', [prop.loan_id])).rows[0];
      expect(loan.status).toBe('repaid');
      const paid = (await query(`SELECT count(*)::int AS n FROM re_statements WHERE property_id = $1 AND (lines->>'loanPayment')::numeric > 0`, [prop.id])).rows[0].n;
      const rows = buildSchedule({ principal: Number(loan.principal), annualRatePct: Number(loan.annual_rate_pct), months: 300, insurance: { annualRatePct: Number(loan.insurance_rate_pct), basis: 'initial' } }).rows;
      expect(b.loanPayoff).toBeCloseTo(rows[paid - 1].balanceAfter, 2);
      // indemnité, frais, diagnostics
      expect(b.earlyRepaymentFee).toBeGreaterThan(0);
      expect(b.agencyFees).toBeCloseTo(b.salePrice * 0.0578, 1);
      expect(b.diagnostics).toBe(300);
      expect(b.energyAudit).toBe(0); // copropriété : pas d'audit
      // plus-value : coût de revient = prix + max(notaire réel, forfait 7,5 %) ; pas de forfait travaux avant 5 ans
      const forfait = Number(prop.purchase_price) * 0.075;
      expect(b.capitalGain.costBasis).toBeCloseTo(Number(prop.purchase_price) + Math.max(Number(prop.notary_fees), forfait) + Number(prop.works_financed), 1);
      expect(b.capitalGain.grossGain).toBeCloseTo(b.salePrice - b.agencyFees - b.capitalGain.costBasis, 1);
      // pièces : aucune perte ni création
      const lastStmt = (await query('SELECT remainder_cents_after AS r FROM re_statements WHERE property_id = $1 ORDER BY year DESC, month DESC LIMIT 1', [prop.id])).rows[0];
      const credited = Number(s.net_proceeds) - Number(s.arrears_covered);
      expect(s.coins_credited * 2000 + p.euro_remainder_cents - lastStmt.r).toBe(Math.round(credited * 100));
      const led = (await query(`SELECT amount, nature, domain FROM investcoins_transactions WHERE user_id = $1 AND reason = 're_exchange_sale_net'`, [uid])).rows;
      expect(led).toHaveLength(1);
      expect(led[0]).toMatchObject({ amount: s.coins_credited, nature: 'exchange', domain: 'real_estate' });
      expect(await balanceOf(uid)).toBeGreaterThan(before - 100000);
      // explication : chaque poste apparaît
      for (const w of ['prix de vente', 'prêt remboursé', 'indemnité de remboursement anticipé', 'frais d\'agence', 'diagnostics obligatoires', 'crédités']) expect(s.message).toContain(w);
      expect(s.message).toMatch(/Plus-value|Aucune plus-value/);
      // le bien vendu disparaît du patrimoine et des annonces possédées
      expect((await life.getPortfolio(uid)).properties).toHaveLength(0);
    });

    it('vendu occupé : décote sur le prix, dépôt de garantie remis à l\'acquéreur', async () => {
      const { uid, prop } = await setup({ balance: 300000 });
      await life.listForRent(uid, prop.id, 0.7);
      await advance(uid, 3);
      const p0 = await row(prop.id);
      expect(p0.status).toBe('let');
      const deposit = Number(p0.deposit_held_eur);
      expect(deposit).toBeGreaterThan(0);
      const info: any = await sales.sell(uid, prop.id, 0.85);
      if (!info.sold) await untilSold(uid, prop.id);
      const s = await sale(prop.id);
      expect(s.breakdown.depositTransferred).toBeCloseTo(deposit, 2);
      expect(s.message).toContain('décote « vendu occupé »');
      const v = info.estimatedValue;
      expect(s.breakdown.salePrice).toBeLessThan(v * 0.85 * 0.9 + 1);
    });

    it('baisser le prix pendant la vente ; refusé si le bien n\'est pas en vente', async () => {
      let uid = '', prop: any, info: any;
      for (let i = 0; i < 30; i++) { ({ uid, prop } = await setup({ balance: 300000 })); info = await sales.sell(uid, prop.id, 1.1); if (!info.sold) break; }
      expect(info.sold).toBe(false);
      const r: any = await sales.repriceSale(uid, prop.id, 0.9);
      expect(r.askingPrice).toBeLessThan(info.askingPrice);
      expect(r.monthlyBuyerProbabilityPct).toBeGreaterThan(info.monthlyBuyerProbabilityPct);
      expect(r.maxMonthsToSell).toBeLessThanOrEqual(info.maxMonthsToSell);
      expect((await rejects(sales.sell(uid, prop.id, 1))).code).toBe('INVALID_INPUT'); // déjà en vente
      const other = await setup({ balance: 300000 });
      expect((await rejects(sales.repriceSale(other.uid, other.prop.id, 1))).code).toBe('INVALID_INPUT'); // pas en vente
    });

    it('options de prix : plus cher = plus long à vendre ; le portefeuille montre la vente en cours ; SÉCURITÉ', async () => {
      let uid = '', prop: any, info: any;
      for (let i = 0; i < 30; i++) { ({ uid, prop } = await setup({ balance: 300000 })); info = await sales.sell(uid, prop.id, 1.1); if (!info.sold) break; }
      expect(info.sold).toBe(false);
      const o: any = await sales.saleOptions(uid, prop.id);
      expect(o.options.map((x: any) => x.ratio)).toEqual([0.85, 0.9, 0.95, 1, 1.05, 1.1]);
      for (let i = 1; i < o.options.length; i++) {
        expect(o.options[i].askingPrice).toBeGreaterThan(o.options[i - 1].askingPrice);
        expect(o.options[i].monthlyBuyerProbabilityPct).toBeLessThanOrEqual(o.options[i - 1].monthlyBuyerProbabilityPct);
        expect(o.options[i].expectedMonthsToSell).toBeGreaterThanOrEqual(o.options[i - 1].expectedMonthsToSell);
      }
      expect(o.current.askingPrice).toBe(info.askingPrice);
      // aucun effet de bord : l'état de la vente n'a pas bougé
      const before = await row(prop.id);
      await sales.saleOptions(uid, prop.id);
      expect(Number((await row(prop.id)).sale_asking_price)).toBe(Number(before.sale_asking_price));
      // le portefeuille expose la vente en cours, avec le nouveau prix après modification
      await sales.repriceSale(uid, prop.id, 0.9);
      const pf: any = await life.getPortfolio(uid);
      const item = pf.properties.find((x: any) => x.id === prop.id);
      expect(item.saleSearch.askingRatio).toBeCloseTo(0.9, 2);
      expect(item.saleSearch.monthsSoFar).toBe(0);
      // bien non mis en vente : pas de saleSearch ; autre joueur : refusé
      const other = await setup({ balance: 300000 });
      expect(((await life.getPortfolio(other.uid)) as any).properties[0].saleSearch).toBeNull();
      expect((await rejects(sales.saleOptions(other.uid, prop.id))).code).toBe('NOT_FOUND');
      expect((await rejects(sales.saleOptions(uid, 'x'))).code).toBe('INVALID_INPUT');
    });

    it('REPRODUCTIBLE : même graine, mêmes actions = même vente (mois, prix, produit net)', async () => {
      const run = async () => {
        const { uid, prop } = await setup({ balance: 300000, seed: 'vente-rejeu' });
        await sales.sell(uid, prop.id, 1.0);
        await untilSold(uid, prop.id, 48);
        const s = await sale(prop.id);
        return [s.year, s.month, s.sale_price, s.net_proceeds, s.coins_credited, s.message];
      };
      expect(await run()).toEqual(await run());
    });
  });

  describe('difficultés de paiement : amiable puis vente forcée', () => {
    const broke = async (seed: string) => {
      const s = await setup({ seed, balance: 100000, apportShare: 0.1, pred: (l) => cheap(l) && l.price > 70000 });
      await query('UPDATE investcoins_balance SET balance = 0 WHERE user_id = $1', [s.uid]); // plus aucune pièce
      return s;
    };

    it('après 3 mois d\'impayés : la banque propose la vente amiable rapide (décote plus faible)', async () => {
      const { uid, prop } = await broke('detresse-1');
      const r = await life.advanceTime(uid, 3);
      const w = r.settled[2].warnings.find((x: any) => x.code === 'DISTRESS_WARNING');
      expect(w, 'avertissement de la banque').toBeDefined();
      expect(w!.message).toContain('VENTE AMIABLE RAPIDE');
      expect(w!.message).toContain('12 %');
      expect(w!.message).toContain('25 %');
      const g = (await query('SELECT distress_since_total AS d FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(g.d).not.toBeNull();
      expect((await row(prop.id)).status).not.toBe('sold');
    });

    it('vente amiable rapide : décote de 12 %, frais normaux, impayés réglés en priorité', async () => {
      const { uid, prop } = await broke('detresse-2');
      await life.advanceTime(uid, 3);
      const g0 = (await query('SELECT arrears_eur AS a FROM re_games WHERE user_id = $1', [uid])).rows[0];
      const out: any = await sales.distressSell(uid, prop.id);
      expect(out.sold).toBe(true);
      const s = await sale(prop.id);
      expect(s.kind).toBe('distress_amicable');
      const value = (await life.getPortfolio(uid)).properties.length; // bien vendu : portefeuille vide
      expect(value).toBe(0);
      expect(s.message).toContain('12 %');
      expect(s.breakdown.agencyFees).toBeGreaterThan(0);
      expect(Number(s.arrears_covered)).toBeLessThanOrEqual(Number(g0.a));
      const g1 = (await query('SELECT arrears_eur AS a FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(Number(g1.a)).toBeCloseTo(Number(g0.a) - Number(s.arrears_covered) + Number(s.shortfall), 2);
    });

    it('la vente amiable rapide n\'existe pas hors difficultés (pas d\'exploit de liquidité) ; IDOR', async () => {
      const { uid, prop } = await setup();
      expect((await rejects(sales.distressSell(uid, prop.id))).message).toContain('impayés');
      const b = await broke('detresse-3');
      await life.advanceTime(b.uid, 3);
      expect((await rejects(sales.distressSell(uid, b.prop.id))).code).toBe('INVALID_INPUT');
    });

    it('sans réaction : VENTE FORCÉE après le délai, décote de 25 % plus frais, expliquée, dette conservée', async () => {
      const { uid, prop, l } = await broke('detresse-4');
      const r = await life.advanceTime(uid, 5); // avertissement au 3e mois, vente forcée 2 mois plus tard
      const forcedWarn = r.settled.flatMap((s: any) => s.warnings).find((w: any) => w.code === 'FORCED_SALE');
      expect(forcedWarn, 'vente forcée').toBeDefined();
      const p = await row(prop.id);
      expect(p.status).toBe('sold');
      expect(p.sale_kind).toBe('forced');
      const s = await sale(prop.id);
      expect(s.kind).toBe('forced');
      const b = s.breakdown;
      expect(b.earlyRepaymentFee).toBe(0);
      expect(b.agencyFees).toBe(0);
      expect(b.proceedingCosts).toBeGreaterThanOrEqual(SALE_PARAMS.distress.proceedingCostsMin);
      expect(b.proceedingCosts).toBeLessThanOrEqual(SALE_PARAMS.distress.proceedingCostsMax);
      // décote de 25 % sur la valeur estimée à ce moment-là
      const valueAtSale = b.salePrice / 0.75;
      expect(valueAtSale).toBeGreaterThan(l.price * 0.8);
      expect(s.message).toContain('VENTE FORCÉE');
      expect(s.message).toContain('beaucoup plus longue');
      expect(s.message).toContain('25 %');
      // dette : soit réglée par le produit, soit conservée (jamais perdue)
      const g = (await query('SELECT arrears_eur AS a FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(Number(g.a)).toBeGreaterThanOrEqual(0);
      if (Number(s.shortfall) > 0) expect(s.message).toContain('dus à la banque');
      const evs = (await query(`SELECT kind FROM re_events WHERE game_id = (SELECT id FROM re_games WHERE user_id = $1)`, [uid])).rows.map((e) => e.kind);
      expect(evs).toEqual(expect.arrayContaining(['distress_warning', 'forced_sale']));
    });

    it('si le joueur rembourse avant le délai, l\'alerte est levée et rien n\'est vendu', async () => {
      const { uid, prop } = await broke('detresse-5');
      await life.advanceTime(uid, 3);
      await query('UPDATE investcoins_balance SET balance = 1000000 WHERE user_id = $1', [uid]);
      await life.advanceTime(uid, 3);
      expect((await row(prop.id)).status).not.toBe('sold');
      const g = (await query('SELECT arrears_eur AS a, distress_since_total AS d, missed_months AS m FROM re_games WHERE user_id = $1', [uid])).rows[0];
      expect(Number(g.a)).toBe(0);
      expect(g.d).toBeNull();
      expect(g.m).toBe(0);
    });
  });

  describe('diagnostics énergétiques', () => {
    it('classe G en 2025 : location refusée avec explication ; rénovation payée → classe E → location possible', async () => {
      const { uid, prop } = await setup({ startYear: 2025, balance: 900000, pred: (l) => cheap(l) });
      await query(`UPDATE re_properties SET energy_class = 'G' WHERE id = $1`, [prop.id]);
      const err = await rejects(life.listForRent(uid, prop.id, 1));
      expect((err.details as any).code).toBe('DPE_BAN');
      expect(err.message).toContain('1er janvier 2025');
      const before = await balanceOf(uid);
      const r: any = await sales.renovate(uid, prop.id);
      expect(r).toMatchObject({ previousClass: 'G', newClass: 'E' });
      expect(r.coinsCharged).toBe(Math.ceil(Number(prop.surface_sqm) * SALE_PARAMS.renovationCostPerSqm / 20));
      expect(await balanceOf(uid)).toBe(before - r.coinsCharged);
      const led = (await query(`SELECT nature FROM investcoins_transactions WHERE user_id = $1 AND reason = 're_exchange_renovation'`, [uid])).rows;
      expect(led[0].nature).toBe('exchange');
      expect((await life.listForRent(uid, prop.id, 1)).propertyId).toBe(prop.id);
    });

    it('rénovation : refusée si déjà en classe C, ou si le logement est occupé ; IDOR', async () => {
      const { uid, prop } = await setup();
      await query(`UPDATE re_properties SET energy_class = 'C' WHERE id = $1`, [prop.id]);
      expect((await rejects(sales.renovate(uid, prop.id))).message).toContain('rien à gagner');
      await query(`UPDATE re_properties SET energy_class = 'F' WHERE id = $1`, [prop.id]);
      await life.listForRent(uid, prop.id, 0.7); await advance(uid, 3);
      expect((await rejects(sales.renovate(uid, prop.id))).message).toContain('occupé');
      const other = await setup();
      expect((await rejects(sales.renovate(other.uid, prop.id))).code).toBe('NOT_FOUND');
    });

    it('aperçu de rénovation : même coût que la rénovation réelle, aucun effet, raisons du refus, interdiction de location, IDOR', async () => {
      const { uid, prop } = await setup({ startYear: 2025, balance: 900000, pred: (l) => cheap(l) });
      await query(`UPDATE re_properties SET energy_class = 'G' WHERE id = $1`, [prop.id]);
      const before = await balanceOf(uid);
      const pv: any = await sales.renovationPreview(uid, prop.id);
      expect(await balanceOf(uid)).toBe(before);                 // aucun effet
      expect((await row(prop.id)).energy_class.trim()).toBe('G');
      expect(pv).toMatchObject({ currentClass: 'G', newClass: 'E', canRenovate: true, reason: null, bannedNow: true, bannedAfter: false, currentClassBannedFromYear: 2025, newClassBannedFromYear: 2034, affordable: true });
      expect(pv.rentEffectPct).toBeGreaterThan(0);
      // gain de loyer chiffré (G → E) ; la valeur ne dépend pas de la classe énergétique dans ce modèle : gain de valeur nul, affiché tel quel
      expect(pv.rentAfter).toBeGreaterThan(pv.rentBefore);
      expect(pv.rentGainMonthly).toBeCloseTo(pv.rentAfter - pv.rentBefore, 2);
      expect(pv.rentGainYearly).toBeCloseTo(pv.rentGainMonthly * 12, 2);
      expect(pv.valueGain).toBe(0);
      expect(pv.paybackYears).toBeCloseTo(pv.costEuros / pv.rentGainYearly, 1);
      expect(['profitable', 'profitable_slowly']).toContain(pv.verdict);
      // D → C : aucun gain direct de loyer (facteurs identiques) : le devis le dit clairement
      await query(`UPDATE re_properties SET energy_class = 'D' WHERE id = $1`, [prop.id]);
      const d: any = await sales.renovationPreview(uid, prop.id);
      expect(d).toMatchObject({ newClass: 'C', rentGainMonthly: 0, valueGain: 0, paybackYears: null, verdict: 'no_direct_gain' });
      await query(`UPDATE re_properties SET energy_class = 'G' WHERE id = $1`, [prop.id]);
      const r: any = await sales.renovate(uid, prop.id);
      expect(pv.coinsCost).toBe(r.coinsCharged);
      expect(pv.costEuros).toBe(r.costEuros);
      await query(`UPDATE re_properties SET energy_class = 'C' WHERE id = $1`, [prop.id]);
      expect(await sales.renovationPreview(uid, prop.id)).toMatchObject({ canRenovate: false, newClass: null });
      const other = await setup();
      expect((await rejects(sales.renovationPreview(other.uid, prop.id))).code).toBe('NOT_FOUND');
      expect((await rejects(sales.renovationPreview(uid, 'x'))).code).toBe('INVALID_INPUT');
    });

    it('bail qui arrive à échéance alors que la loi interdit désormais de louer : le locataire part, pas de remise en location', async () => {
      const { uid, prop } = await setup({ startYear: 2022, balance: 900000 });
      await query(`UPDATE re_properties SET energy_class = 'G' WHERE id = $1`, [prop.id]); // G : encore louable en 2022
      await life.listForRent(uid, prop.id, 0.7);
      await advance(uid, 40); // le bail (36 mois) se termine fin 2024 : à partir de 2025, la classe G est interdite
      const ev = (await query('SELECT kind, message, details FROM re_events WHERE property_id = $1 ORDER BY year, month, seq', [prop.id])).rows;
      const left = ev.find((e) => e.kind === 'tenant_left');
      expect(left, 'départ du locataire').toBeDefined();
      expect(left!.details.exit).toBe('dpe_ban');
      expect(left!.message).toContain('la loi interdit de le renouveler');
      const ban = ev.find((e) => e.kind === 'dpe_ban');
      expect(ban!.message).toContain('ne peut plus être loué');
      const p = await row(prop.id);
      expect(p.status).toBe('vacant');
      expect(p.search_elapsed_months).toBeNull();
    });
  });

  describe('classement Immobilier et statistique d\'administration', () => {
    it('classement à année simulée égale : instantané, seuil de capital, rang', async () => {
      const a = await setup({ seed: 'classement' });
      await life.listForRent(a.uid, a.prop.id, 0.7);
      await advance(a.uid, 12);
      const board: any = await getRealEstateLeaderboard(a.uid, undefined);
      expect(board.year).toBe(2011);
      expect(board.me).not.toBeNull();
      expect(board.me.isMe).toBe(true);
      expect(board.entries.length).toBeGreaterThanOrEqual(1);
      // « ma performance » détaillée, cohérente avec le classement
      expect(board.mine.ranked).toBe(true);
      expect(board.mine.performancePct).toBeCloseTo(board.me.performancePct, 3);
      expect(board.mine.investedCoins).toBeGreaterThanOrEqual(board.mine.minCapitalCoins);
      const snap = (await query(`SELECT domain, period, capital_committed FROM leaderboard_rankings WHERE user_id = $1`, [a.uid])).rows;
      expect(snap.some((s) => s.domain === 'real_estate' && s.period === 'Y2011')).toBe(true);
      // un joueur sans achat n'est pas classé
      const nobody = await createUser({ balance: 100, freeDomain: 'real_estate' });
      await svc.startGame(nobody, 'student');
      await life.advanceTime(nobody, 1);
      const nb: any = await getRealEstateLeaderboard(nobody, undefined);
      expect(nb.me).toBeNull();
      expect(nb.mine).toMatchObject({ ranked: false, investedCoins: 0, performancePct: 0 });
      expect((await rejects(getRealEstateLeaderboard(a.uid, 1990))).code).toBe('INVALID_INPUT');
    });

    it('performance = (fonds propres + flux encaissés − argent investi) / argent investi, et un gain vendu reste un gain', async () => {
      const { uid, prop } = await setup({ balance: 300000 });
      await life.listForRent(uid, prop.id, 0.7);
      await advance(uid, 12);
      const game = (await query('SELECT * FROM re_games WHERE user_id = $1', [uid])).rows[0];
      const w1 = await wealthMetrics({ query: query as any }, game);
      expect(w1.investedEuros).toBeGreaterThan(0);
      expect(w1.performancePct).toBeCloseTo(((w1.equity + w1.cumulativeCashFlow + w1.saleNetProceeds - w1.investedEuros) / w1.investedEuros) * 100, 1);
      await sales.sell(uid, prop.id, 0.85);
      await untilSold(uid, prop.id, 36);
      const game2 = (await query('SELECT * FROM re_games WHERE user_id = $1', [uid])).rows[0];
      const w2 = await wealthMetrics({ query: query as any }, game2);
      expect(w2.equity).toBe(0);
      expect(w2.saleNetProceeds).toBeGreaterThan(0);
      expect(w2.performancePct).toBeGreaterThan(-100);
      expect(w2.investedEuros).toBeCloseTo(w1.investedEuros, 2);
    });

    it('statistique « pièces créées / détruites / échangées par domaine »', async () => {
      const stats = await investcoinsRepository.ledgerStatsByDomain();
      const re = stats['real_estate'];
      expect(re).toBeDefined();
      expect(re.created).toBeGreaterThanOrEqual(0);
      expect(re.destroyed).toBeGreaterThan(0);    // frais de notaire, d'expertise…
      expect(re.exchangeNet).not.toBe(0);          // apports, ventes
      expect(re.netInjected).toBe(re.created - re.destroyed + re.exchangeNet);
      const total = (await query('SELECT COALESCE(SUM(amount), 0)::bigint AS s FROM investcoins_transactions WHERE domain = $1', ['real_estate'])).rows[0].s;
      expect(Number(total)).toBe(re.netInjected);
    });
  });
});
