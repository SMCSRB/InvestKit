// Lissage par crédibilité et plausibilité des prix de zone : (n/30) × zone + (1 − n/30) × ville ; moins de 5 ventes = ville (~) ; écart maximal de 40 % à la ville.
import { describe, it, expect } from 'vitest';
import { DvfSale } from '../src/data/realEstate/dvf/clean';
import { zoneOf } from '../src/data/realEstate/dvf/cities';
import { monthlyMarket, CREDIBILITY_FULL, CREDIBILITY_FLOOR, PLAUSIBILITY_BAND } from '../src/data/realEstate/dvf/aggregate';
import { countJumps } from '../src/data/realEstate/dvf/jumps';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';

const sale = (cp: string, ym: string, day: number, p: number): DvfSale => ({ id: `${cp}${ym}${day}${p}${Math.random()}`, date: `${ym}-${String(day).padStart(2, '0')}`, code: '59350', zone: zoneOf('59350', cp), postal: cp, section: 'AB', type: 'appartement', surface: 50, price: p * 50, pricePerM2: p, rooms: 2, lon: null, lat: null });
const flat = (cp: string, ym: string, n: number, p: number) => Array.from({ length: n }, (_, i) => sale(cp, ym, 1 + (i % 27), p));
const row = (rows: ReturnType<typeof monthlyMarket>, zone: string, month: string) => rows.find((r) => r.key === zone && r.month === month && r.type === 'appartement')!;
const CITY_ROWS = (ym: string) => flat('59000', ym, 200, 4000);          // la ville : 200 ventes à 4 000 €/m² (médiane de la ville = 4 000)

describe('lissage par crédibilité', () => {
  it('constantes de la décision : 30 ventes = zone seule, 5 = plancher, 40 % d\'écart au plus', () => {
    expect([CREDIBILITY_FULL, CREDIBILITY_FLOOR, PLAUSIBILITY_BAND]).toEqual([30, 5, 0.4]);
  });
  it('n entre 5 et 29 : (n/30) × zone + (1 − n/30) × ville, quartiles mélangés avec les mêmes poids', () => {
    const s = [...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 15, 3200)];            // la zone : 15 ventes à 3 200 ; la ville entière a 215 ventes, médiane 4 000
    const r = row(monthlyMarket(s, { from: '2022-02', to: '2022-02' }), '59777', '2022-02');
    expect(r.fallback).toBe('mixte');
    expect(r.n).toBe(15);
    expect(r.median).toBe(Math.round(0.5 * 3200 + 0.5 * 4000));                             // 3 600
    expect(r.p25!).toBeLessThanOrEqual(r.median!); expect(r.median!).toBeLessThanOrEqual(r.p75!);
  });
  it('n >= 30 : la zone seule ; n < 5 : la ville seule (~) ; n = 5 : poids 5/30', () => {
    const r30 = row(monthlyMarket([...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 40, 3200)], { from: '2022-02', to: '2022-02' }), '59777', '2022-02');
    expect(r30).toMatchObject({ fallback: null, median: 3200, n: 40 });
    const r4 = row(monthlyMarket([...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 4, 3200)], { from: '2022-02', to: '2022-02' }), '59777', '2022-02');
    expect(r4).toMatchObject({ fallback: 'ville', median: 4000 });
    const r5 = row(monthlyMarket([...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 5, 3200)], { from: '2022-02', to: '2022-02' }), '59777', '2022-02');
    expect(r5.fallback).toBe('mixte');
    expect(r5.median).toBe(Math.round((5 / 30) * 3200 + (25 / 30) * 4000));
  });
  it('plausibilité : un prix de zone à plus de 40 % de la ville devient le prix de la ville, marqué ~', () => {
    const s = [...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 40, 8000)];              // +100 % : hors bande
    const r = row(monthlyMarket(s, { from: '2022-02', to: '2022-02' }), '59777', '2022-02');
    expect(r).toMatchObject({ fallback: 'ville', capped: true });
    const ok = row(monthlyMarket([...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 40, 5400)], { from: '2022-02', to: '2022-02' }), '59777', '2022-02');   // +35 % : dans la bande
    expect(ok.fallback).toBeNull(); expect(ok.median).toBe(5400);
  });
  it('AUCUNE FUITE DU FUTUR : ajouter des ventes plus tard ne change aucun mois antérieur', () => {
    const base = [...CITY_ROWS('2022-01'), ...flat('59777', '2022-01', 12, 3300)];
    const future = [...CITY_ROWS('2022-06'), ...flat('59777', '2022-06', 50, 9000)];
    const a = monthlyMarket(base, { from: '2022-02', to: '2022-05' });
    expect(monthlyMarket([...base, ...future], { from: '2022-02', to: '2022-05' })).toEqual(a);
  });
  it('cas Euralille : une zone qui passe de 9 à 10 ventes sautait de 20 % (ancienne règle), plus avec le lissage', () => {
    // Zone de 3 200 €/m², une vente par mois de janvier à octobre 2022 ; la ville fait 4 000 €/m² avec 200 ventes par mois.
    const months = Array.from({ length: 18 }, (_, i) => `${2022 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
    const s = months.flatMap((ym, i) => [...CITY_ROWS(ym), ...(i < 12 ? flat('59777', ym, 1, 3200) : [])]);
    const range = { from: '2022-03', to: '2023-06' };
    const before = countJumps(monthlyMarket(s, range, 'seuil'), 0.15, '2022-01').lille;
    const after = countJumps(monthlyMarket(s, range, 'credibilite'), 0.15, '2022-01').lille;
    expect(before).toBeGreaterThan(0);                                                      // 4 000 → 3 200 d'un mois à l'autre (10e vente)
    expect(after).toBe(0);
  });
  it('le fichier de médianes accepte les lignes « mixte » (5 ventes ou plus) et refuse un nombre de ventes sous le plancher du fichier', () => {
    const mk = (n: number, fb: string | null) => ({ source: 'DVF', windowMonths: 12, minSales: 5, range: { from: '2022-01', to: '2022-03' }, rows: [['59777', '2022-02', 'a', n, 3600, 3400, 3900, fb]] });
    const now = new Date('2026-10-04T00:00:00Z');
    expect(parseMarketFile(mk(15, 'mixte'), now)).toMatchObject({ ok: true });
    expect(parseMarketFile(mk(15, 'mixte'), now).rows[0].scope).toBe('zone');
    expect(parseMarketFile(mk(3, 'mixte'), now).ok).toBe(false);
  });
});
