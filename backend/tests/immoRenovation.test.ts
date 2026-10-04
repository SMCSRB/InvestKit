// Biens « à rénover » (décision d'Andreja) : 1) la valeur suit les travaux payés ; 2) les travaux sont plafonnés (35 % annoncés, 55 % réels de la valeur rénovée).
// Pourcentages = VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER (RENOVATION_BUDGET_CAPS).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { realEstateService as svc } from '../src/services/realEstateService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { valueOfProperty } from '../src/services/realEstateHelpers';
import { RENOVATION_BUDGET_CAPS, RENOVATION_RULES } from '../src/config/immoRules';
import { applyRenovation } from '../src/engine/immo';
import { query } from '../src/utils/db';

const YEARS = [2010, 2014, 2018, 2022, 2026];

const renovatedValue = async (l: any, year: number): Promise<number> => {
  const after = applyRenovation('to_renovate', l.energyClass, RENOVATION_RULES);
  return src.estimateValue({ cityId: l.cityId, neighborhoodId: l.neighborhoodId, type: l.type, surfaceSqm: l.surfaceSqm, condition: after.condition, energyClass: after.energyClass }, year);
};

describe('catalogue : plafond des travaux d\'un bien « à rénover »', () => {
  it('toutes années, tous les biens à rénover : annoncés ≤ 35 %, réels ≤ 55 % de la valeur rénovée, réels ≥ annoncés', async () => {
    let checked = 0;
    for (const year of YEARS) {
      for (const l of (await src.listListings(year)).filter((x) => x.condition === 'to_renovate')) {
        const vRen = await renovatedValue(l, year);
        const real = (await src.getExpertise(l.id, year))!.realWorks;
        expect(l.advertisedWorks, `${l.id} ${year}`).toBeLessThanOrEqual(Math.round((RENOVATION_BUDGET_CAPS.advertisedPctOfRenovatedValue / 100) * vRen) + 2);
        expect(real, `${l.id} ${year}`).toBeLessThanOrEqual(Math.round((RENOVATION_BUDGET_CAPS.realPctOfRenovatedValue / 100) * vRen) + 2);
        expect(real, `${l.id} ${year}`).toBeGreaterThanOrEqual(l.advertisedWorks);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
  it('les pourcentages sont bien ceux décidés', () => {
    expect(RENOVATION_BUDGET_CAPS).toEqual({ advertisedPctOfRenovatedValue: 35, realPctOfRenovatedValue: 55 });
  });
  it('un bien à rénover reste cher à rénover dans une grande ville : le plafond ne touche que les cas excessifs', async () => {
    const marvelle = (await src.listListings(2010)).filter((l) => l.cityId === 'marvelle' && l.condition === 'to_renovate');
    expect(marvelle.length).toBeGreaterThan(0);
    for (const l of marvelle) expect(l.advertisedWorks).toBeGreaterThan(10000);   // non plafonné : les travaux annoncés restent importants
  });
  it('les biens en bon état n\'ont aucun travaux annoncé (non touchés par le plafond)', async () => {
    for (const l of (await src.listListings(2018)).filter((x) => x.condition === 'good')) expect(l.advertisedWorks).toBe(0);
  });
  it('déterminisme : deux lectures du catalogue donnent les mêmes travaux', async () => {
    expect(await src.listListings(2018)).toEqual(await src.listListings(2018));
  });
});

describe.skipIf(!hasDb)('valeur d\'un bien « à rénover » acheté sans expertise : elle suit les travaux payés', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const defective = async () => {
    for (const l of (await src.listListings(2010)).filter((x) => x.condition === 'to_renovate')) {
      const e = (await src.getExpertise(l.id, 2010))!;
      if (e.hiddenDefects.length > 0 && e.realWorks > l.advertisedWorks) return { l, e };
    }
    throw new Error('aucun bien à rénover avec défauts cachés');
  };

  it('travaux annoncés financés, travaux cachés restants : valeur entre « non rénové » et « rénové », proportionnelle à la part payée', async () => {
    const { l, e } = await defective();
    const uid = await createUser({ balance: 2_000_000, tier: 'pro', freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    const down = Math.ceil(l.price * 0.075 + l.price * 0.1 + l.advertisedWorks * 0.1) + 100;
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 300 });
    const game = (await query('SELECT * FROM re_games WHERE user_id = $1', [uid])).rows[0];
    const p = (await query('SELECT * FROM re_properties WHERE game_id = $1', [game.id])).rows[0];
    const spent = Number(p.works_financed), pending = Number(p.pending_works_eur);
    expect(pending).toBe(e.realWorks - l.advertisedWorks);
    expect(p.condition).toBe('to_renovate');
    const after = applyRenovation('to_renovate', String(p.energy_class).trim() as any, RENOVATION_RULES);
    const asIs = await valueOfProperty({ ...p, pending_works_eur: 0 }, game.simulated_year, game.simulated_month);                 // sans la règle : « non rénové »
    const renovated = await valueOfProperty({ ...p, condition: after.condition, energy_class: after.energyClass }, game.simulated_year, game.simulated_month);
    const value = await valueOfProperty(p, game.simulated_year, game.simulated_month);
    expect(value).toBeGreaterThan(asIs);
    expect(value).toBeLessThan(renovated);
    const expected = asIs + (renovated - asIs) * (spent / (spent + pending));
    expect(Math.abs(value - expected)).toBeLessThan(1);
    // Une fois les travaux cachés payés : bien rénové, valeur au plus haut.
    await svc.payPendingWorks(uid, p.id);
    const p2 = (await query('SELECT * FROM re_properties WHERE id = $1', [p.id])).rows[0];
    expect(p2.condition).toBe('good');
    expect(Number(p2.pending_works_eur)).toBe(0);
    const value2 = await valueOfProperty(p2, game.simulated_year, game.simulated_month);
    expect(value2).toBeGreaterThanOrEqual(value);
  });

  it('sans travaux cachés (ou avec expertise) : rien ne change, le bien est rénové d\'un coup à l\'achat', async () => {
    const l = (await src.listListings(2010)).find((x) => x.condition === 'to_renovate' && x.cityId === 'marvelle')!;
    const uid = await createUser({ balance: 2_000_000, tier: 'pro', freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    const down = Math.ceil(l.price * 0.075 + l.price * 0.1 + l.advertisedWorks * 0.1) + 100;
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 300 });
    const game = (await query('SELECT * FROM re_games WHERE user_id = $1', [uid])).rows[0];
    const p = (await query('SELECT * FROM re_properties WHERE game_id = $1', [game.id])).rows[0];
    expect(Number(p.pending_works_eur)).toBe(0);
    expect(p.condition).toBe('good');
  });
});
