// Révision annuelle des loyers avec l'IRL RÉEL : trimestre de référence, date anniversaire, bouclier de 3,5 %, valeurs manquantes (aucune révision inventée), moteur de vie en base. Séries FABRIQUÉES de test.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, seedTestIrl, legacyCoins } from './helpers';
import { query } from '../src/utils/db';
import { leaseRevision, monthKey, monthStart, changePct, IrlPoint } from '../src/engine/immo/irl';
import { reviseRent, noIrlRevision, monthTotal } from '../src/engine/immo';
import { IRL_SHIELD, IRL_ENABLED } from '../src/config/irlRules';
import { realEstateService as svc } from '../src/services/realEstateService';
import { realEstateLifeService as life } from '../src/services/realEstateLifeService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { EVENT_PARAMS } from '../src/config/immoRules';

// 2020-T1 à 2026-T4 : +4 % par an (croissance géométrique), donc au-dessus du bouclier de 3,5 %.
const geo = (): IrlPoint[] => Array.from({ length: 28 }, (_, i) => ({ year: 2020 + Math.floor(i / 4), quarter: ((i % 4) + 1) as 1 | 2 | 3 | 4, value: Math.round(100 * Math.pow(1.04, i / 4) * 1000) / 1000 }));
const v = (s: IrlPoint[], y: number, q: number) => s.find((p) => p.year === y && p.quarter === q)!.value;

describe('mois de jeu', () => {
  it('total = année × 12 + mois', () => {
    expect(monthKey(monthTotal(2022, 5))).toBe('2022-05'); expect(monthStart(monthTotal(2022, 12))).toBe('2022-12-01'); expect(monthKey(monthTotal(2023, 1))).toBe('2023-01');
  });
});

describe('révision à la date anniversaire', () => {
  const s = geo();
  const start = monthTotal(2025, 5);        // hors bouclier
  it('trimestre de référence = dernier IRL publié au début du bail ; hausse = IRL de ce trimestre cette année ÷ IRL de l\'an dernier', () => {
    const r = leaseRevision(s, start, start + 12)!;        // bail de mai 2025 : T1 2025 (publié le 16 avril) est le dernier publié ; anniversaire mai 2026 : T1 2026
    expect(r.referenceQuarter).toBe('2026-T1'); expect(r.previousQuarter).toBe('2025-T1');
    expect(r.rawPct).toBeCloseTo(changePct(v(s, 2026, 1), v(s, 2025, 1)), 6);
    expect(r).toMatchObject({ capped: false }); expect(r.pct).toBe(r.rawPct);
  });
  it('un bail signé en avril avant le 16 prend le trimestre précédent (aucune valeur future)', () => {
    const early = monthTotal(2025, 4);                     // 1er avril 2025 : T1 2025 pas encore publié (16 avril) : référence T4 2024
    const r = leaseRevision(s, early, early + 12)!;
    expect(r.referenceQuarter).toBe('2025-T4'); expect(r.previousQuarter).toBe('2024-T4');
  });
  it('plusieurs années : on compare toujours le même trimestre à celui de l\'an dernier', () => {
    const r = leaseRevision(s, monthTotal(2021, 8), monthTotal(2021, 8) + 36)!;      // bail d'août 2021 (T2 2021), 3e anniversaire août 2024
    expect(r.referenceQuarter).toBe('2024-T2'); expect(r.previousQuarter).toBe('2023-T2');
  });
  it('aucune variation inventée : IRL absent, trimestre futur ou valeur manquante donnent null', () => {
    expect(leaseRevision([], start, start + 12)).toBeNull();
    expect(leaseRevision(s, monthTotal(2020, 3), monthTotal(2021, 3))).toBeNull();                     // rien de publié avant le bail (la série commence en 2020-T1, publié en avril 2020)
    expect(leaseRevision(s.filter((p) => p.year < 2026), start, start + 12)).toBeNull();               // T1 2026 manquant
    expect(leaseRevision(s, start, start + 11)).toBeNull();                                            // pas encore un an
  });
});

describe('bouclier de 3,5 %', () => {
  const s = geo();
  it('configuration : de juillet 2022 à juin 2024, plafond 3,5 %', () => { expect(IRL_SHIELD).toEqual({ fromMonth: '2022-07', toMonth: '2024-06', capPct: 3.5 }); });
  it('une révision dans la fenêtre est plafonnée (et l\'indice réel est conservé pour l\'explication) ; hors fenêtre, non', () => {
    const start = monthTotal(2022, 5);
    const a = leaseRevision(s, start, start + 12)!;       // mai 2023 : dans la fenêtre
    expect(a.capped).toBe(true); expect(a.pct).toBe(3.5); expect(a.rawPct).toBeGreaterThan(3.5);
    const b = leaseRevision(s, start, start + 24)!;       // mai 2024 : dans la fenêtre (jusqu'à juin 2024)
    expect(b.capped).toBe(true);
    const c = leaseRevision(s, start, start + 36)!;       // mai 2025 : hors fenêtre
    expect(c.capped).toBe(false); expect(c.pct).toBeCloseTo(4, 1);
    const d = leaseRevision(s, monthTotal(2022, 7), monthTotal(2023, 7))!;   // juillet 2023 : dans la fenêtre
    expect(d.capped).toBe(true);
    const e = leaseRevision(s, monthTotal(2023, 7), monthTotal(2024, 7))!;   // juillet 2024 : après la fenêtre
    expect(e.capped).toBe(false);
  });
  it('un IRL sous 3,5 % n\'est jamais relevé', () => {
    const slow: IrlPoint[] = geo().map((p, i) => ({ ...p, value: Math.round(100 * Math.pow(1.02, i / 4) * 1000) / 1000 }));
    const r = leaseRevision(slow, monthTotal(2022, 5), monthTotal(2023, 5))!;
    expect(r.capped).toBe(false); expect(r.pct).toBeCloseTo(2, 1);
  });
});

describe('loyer révisé', () => {
  it('le loyer suit l\'indice (arrondi au centime) avec la trace de l\'IRL utilisé ; classe F/G gelée ; sans IRL : aucune révision, expliquée', () => {
    const s = geo(); const lr = leaseRevision(s, monthTotal(2025, 5), monthTotal(2026, 5))!;
    const r = reviseRent(600, lr.pct, 'C', { referenceQuarter: lr.referenceQuarter, previousQuarter: lr.previousQuarter, rawPct: lr.rawPct, capped: lr.capped });
    expect(r.newRent).toBeCloseTo(600 * (1 + lr.pct / 100), 2); expect(r.irl?.referenceQuarter).toBe('2026-T1');
    expect(reviseRent(600, lr.pct, 'F').reason).toBe('FROZEN_ENERGY_F_G');
    expect(noIrlRevision(600)).toMatchObject({ applied: false, newRent: 600, appliedPct: 0, reason: 'NO_IRL' });
  });
  it('l\'IRL réel est lu par le moteur (drapeau actif) ; la série fictive n\'existe plus', () => {
    expect(IRL_ENABLED).toBe(true);
    expect((src as unknown as Record<string, unknown>).getIrlAnnualChangePct).toBeUndefined();
  });
});

describe.skipIf(!hasDb)('moteur de vie : sans IRL importé, aucune révision', () => {
  beforeAll(async () => {
    await setupDb();
    for (const t of Object.values(EVENT_PARAMS.tenants)) { t.lateProbPerMonth = 0; t.defaultProbPerMonth = 0; t.tenureMonths = 1e9; }
    for (const k of Object.keys(EVENT_PARAMS.unexpectedWorks.probPerMonthByCondition)) (EVENT_PARAMS.unexpectedWorks.probPerMonthByCondition as any)[k] = 0;
  });
  afterAll(async () => { await query('TRUNCATE immo_irl, immo_irl_imports CASCADE'); await seedTestIrl(); await teardownDb(); });
  it('IRL absent : le loyer reste inchangé à la date anniversaire et le relevé le dit (« rien n\'est inventé »)', async () => {
    await query('TRUNCATE immo_irl, immo_irl_imports CASCADE');
    const uid = await createUser({ balance: 600000, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'executive');
    let l: any;
    for (const x of await src.listListings(2010)) { if (x.age === 'old' && x.advertisedWorks === 0 && x.condition !== 'to_renovate' && !['F', 'G'].includes(x.energyClass) && x.price > 40000 && x.price < 90000 && (await src.getExpertise(x.id, 2010))!.hiddenDefects.length === 0) { l = x; break; } }
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: legacyCoins(1500), months: 240 });
    const prop = (await svc.listProperties(uid)).properties.find((p: any) => p.listing_id === l.id);
    const listed = await life.listForRent(uid, prop.id, 0.7);
    await life.advanceTime(uid, 12); await life.advanceTime(uid, 12);
    const rows = (await query('SELECT * FROM re_statements WHERE property_id = $1 ORDER BY year, month', [prop.id])).rows;
    expect(rows.some((x: any) => x.explanations.some((e: any) => e.code === 'INDEXATION'))).toBe(false);
    const un = rows.filter((x: any) => x.explanations.some((e: any) => e.code === 'INDEXATION_UNAVAILABLE'));
    expect(un.length).toBeGreaterThanOrEqual(1);
    expect(un[0].explanations.find((e: any) => e.code === 'INDEXATION_UNAVAILABLE').message).toContain('rien n\'est inventé');
    expect(Number((await query('SELECT current_rent FROM re_properties WHERE id = $1', [prop.id])).rows[0].current_rent)).toBeCloseTo(listed.askingRent, 2);
  });
});
