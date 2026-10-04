// Diagnostic des sauts de médiane : une bascule zone ↔ ville, du bruit de petit volume et un vrai mouvement de marché ne se confondent pas.
import { describe, it, expect } from 'vitest';
import { DvfSale } from '../src/data/realEstate/dvf/clean';
import { zoneOf } from '../src/data/realEstate/dvf/cities';
import { monthlyMarket } from '../src/data/realEstate/dvf/aggregate';
import { explainJumps, renderJumps, NOISE_BELOW } from '../src/data/realEstate/dvf/jumps';

const sale = (cp: string, ym: string, day: number, p: number): DvfSale => ({ id: `${cp}${ym}${day}${p}${Math.random()}`, date: `${ym}-${String(day).padStart(2, '0')}`, code: '59350', zone: zoneOf('59350', cp), postal: cp, section: 'AB', type: 'appartement', surface: 50, price: p * 50, pricePerM2: p, rooms: 2, lon: null, lat: null });
const months = (from: number, n: number): string[] => Array.from({ length: n }, (_, i) => { const m = from + i; return `${2021 + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`; });
const mk = (cp: string, ym: string, n: number, p: number) => Array.from({ length: n }, (_, i) => sale(cp, ym, 1 + (i % 27), p + (i % 5) * 10));

describe('sauts de médiane glissante', () => {
  it('petite zone : peu de ventes, une poignée de ventes qui entrent ou sortent fait sauter la médiane → « bruit »', () => {
    // 59160 : 12 ventes à 3 000 en janvier 2021, puis 12 ventes à 4 000 en janvier 2022 : la fenêtre passe de 12 à 24 ventes, la médiane change de 15 % quand les anciennes sortent.
    const s = [...mk('59160', '2021-01', 12, 3000), ...mk('59160', '2021-07', 2, 3000), ...mk('59160', '2022-01', 14, 4400), ...mk('59000', '2021-03', 200, 4000), ...mk('59000', '2022-03', 200, 4000)];
    const rows = monthlyMarket(s, { from: '2021-02', to: '2022-12' });
    const jumps = explainJumps(s, rows, 'lille').filter((j) => j.zone === '59160');
    expect(jumps.length).toBeGreaterThan(0);
    expect(jumps.every((j) => j.cause === 'bruit' || j.cause === 'bascule')).toBe(true);
    expect(jumps.some((j) => j.cause === 'bruit')).toBe(true);
    expect(jumps.find((j) => j.cause === 'bruit')!.n).toBeLessThan(NOISE_BELOW);
  });
  it('bascule : la zone passe sous 10 ventes, sa médiane laisse la place à celle de la ville', () => {
    const s = [...mk('59260', '2021-01', 14, 2500), ...mk('59000', '2021-01', 100, 4500), ...mk('59000', '2021-06', 100, 4500)];
    const rows = monthlyMarket(s, { from: '2021-02', to: '2022-03' }, 'seuil');   // ancienne règle : la bascule existe
    const j = explainJumps(s, rows, 'lille').filter((x) => x.zone === '59260');
    expect(j.some((x) => x.cause === 'bascule' && x.prevFallback === null && x.fallback === 'ville')).toBe(true);
  });
  it('marché : grosse zone, beaucoup de ventes, la médiane a vraiment bougé → « marché », avec les ventes entrées et sorties', () => {
    const s = [...months(0, 12).flatMap((m) => mk('59000', m, 40, 3000)), ...months(12, 12).flatMap((m) => mk('59000', m, 40, 4200))];
    const rows = monthlyMarket(s, { from: '2021-12', to: '2022-12' });
    const j = explainJumps(s, rows, 'lille').filter((x) => x.zone === '59000');
    expect(j.length).toBeGreaterThan(0);
    expect(j.every((x) => x.cause === 'marche' && x.n >= NOISE_BELOW)).toBe(true);
    expect(j[0].entering).toBeGreaterThan(0); expect(j[0].leaving).toBeGreaterThan(0);
  });
  it('aucun saut : liste vide ; le texte donne zone, mois, prix, ventes, entrées/sorties et cause ; ville inconnue refusée', () => {
    const s = months(0, 24).flatMap((m) => mk('59000', m, 30, 4000));
    const rows = monthlyMarket(s, { from: '2021-12', to: '2022-12' });
    expect(explainJumps(s, rows, 'lille')).toEqual([]);
    const s2 = [...mk('59160', '2021-01', 12, 3000), ...mk('59160', '2022-01', 14, 4400)];
    const j = explainJumps(s2, monthlyMarket(s2, { from: '2021-02', to: '2022-12' }), 'lille');
    const text = renderJumps('lille', j);
    expect(text).toMatch(/59160 · 20\d\d-\d\d → 20\d\d-\d\d : \d+ → \d+ €\/m²/);
    expect(text).toMatch(/entrées \d+ .*sorties \d+/);
    expect(() => explainJumps([], [], 'atlantide')).toThrow('Ville inconnue');
  });
});
