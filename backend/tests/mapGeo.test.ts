import { describe, it, expect } from 'vitest';
// @ts-ignore : module JavaScript du site (fonctions pures)
import * as G from '../../app/lib/mapGeo.js';

const size = { w: 800, h: 520 };
const cities = [
  { id: 'a', tier: 'metropolis' }, { id: 'b', tier: 'large' }, { id: 'c', tier: 'medium' }, { id: 'd', tier: 'small' }, { id: 'e', tier: 'small' },
];
const listings = Array.from({ length: 60 }, (_, i) => ({ id: `${cities[i % 5].id}-${i}`, cityId: cities[i % 5].id, neighborhoodId: `${cities[i % 5].id}:${['centre', 'pericentre', 'peripherie'][i % 3]}` }));

describe('carte Immobilier : géométrie pure', () => {
  const layout = G.cityLayout(cities);
  const pins = G.layoutPins(layout, listings);

  it('chaque ville et chaque annonce a une place, dans le monde, et la même à chaque appel', () => {
    for (const c of cities) expect(layout[c.id]).toBeTruthy();
    for (const l of listings) {
      const p = pins[l.id];
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(G.WORLD.w);
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(G.WORLD.h);
    }
    expect(G.layoutPins(layout, listings)).toEqual(pins);
    expect(G.cityLayout(cities)).toEqual(layout);
  });

  it('deux annonces ne se superposent pas (distance minimale respectée)', () => {
    const ids = Object.keys(pins); let min = Infinity;
    for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) min = Math.min(min, Math.hypot(pins[ids[i]].x - pins[ids[j]].x, pins[ids[i]].y - pins[ids[j]].y));
    expect(min).toBeGreaterThan(5);
  });

  it('le zoom garde le point sous le curseur en place et reste borné', () => {
    const v0 = G.initialView(size);
    const px = 300; const py = 200;
    const before = G.toWorld(px, py, v0, size);
    const v1 = G.zoomAt(v0, 3, px, py, size);
    const after = G.toWorld(px, py, v1, size);
    expect(v1.k).toBeCloseTo(3, 5);
    expect(after.x).toBeCloseTo(before.x, 3); expect(after.y).toBeCloseTo(before.y, 3);
    expect(G.zoomAt(v0, 0.01, px, py, size).k).toBe(G.MIN_K);
    expect(G.zoomAt(v0, 1e6, px, py, size).k).toBe(G.MAX_K);
  });

  it('on ne peut pas sortir le monde du cadre en le déplaçant', () => {
    let v = G.zoomAt(G.initialView(size), 4, 400, 260, size);
    v = G.panBy(v, 1e6, 1e6, size); expect(v.tx).toBeLessThanOrEqual(0); expect(v.ty).toBeLessThanOrEqual(0);
    v = G.panBy(v, -1e7, -1e7, size);
    const s = G.scaleOf(v, size);
    expect(v.tx + G.WORLD.w * s).toBeGreaterThanOrEqual(size.w - 0.001); expect(v.ty + G.WORLD.h * s).toBeGreaterThanOrEqual(size.h - 0.001);
  });

  it('le pincement à deux doigts écarte = zoome, resserre = dézoome, en gardant le milieu', () => {
    const v0 = G.initialView(size);
    const prev = [{ x: 350, y: 250 }, { x: 450, y: 250 }];
    const out = G.pinchView(v0, prev, [{ x: 300, y: 250 }, { x: 500, y: 250 }], size);
    expect(out.k).toBeCloseTo(2, 5);
    const mid = G.toWorld(400, 250, v0, size); const after = G.toScreen(mid, out, size);
    expect(after.x).toBeCloseTo(400, 3); expect(after.y).toBeCloseTo(250, 3);
    const back = G.pinchView(out, [{ x: 300, y: 250 }, { x: 500, y: 250 }], prev, size);
    expect(back.k).toBeCloseTo(1, 5);
  });

  it('cadrer un rectangle le rend visible en entier', () => {
    const b = { minX: 100, minY: 100, maxX: 260, maxY: 200 };
    const v = G.fitBounds(b, size, 40);
    const a = G.toScreen({ x: b.minX, y: b.minY }, v, size); const c = G.toScreen({ x: b.maxX, y: b.maxY }, v, size);
    expect(a.x).toBeGreaterThanOrEqual(0); expect(a.y).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThanOrEqual(size.w); expect(c.y).toBeLessThanOrEqual(size.h);
    expect(v.k).toBeGreaterThan(1);
  });

  it('regroupement : aucune annonce perdue, plus de bulles quand on zoome, une bulle à 1 annonce = une pastille', () => {
    const pts = listings.map((l) => ({ id: l.id, ...pins[l.id] }));
    const v1 = G.initialView(size);
    const c1 = G.clusterPoints(pts, v1, size);
    expect(c1.reduce((n: number, c: any) => n + c.count, 0)).toBe(listings.length);
    expect(c1.length).toBeLessThan(listings.length);
    const v6 = G.zoomAt(v1, 6, 400, 260, size);
    const c6 = G.clusterPoints(pts, v6, size);
    expect(c6.reduce((n: number, c: any) => n + c.count, 0)).toBe(listings.length);
    expect(c6.length).toBeGreaterThan(c1.length);
    const vmax = { ...v1, k: G.MAX_K, tx: -2000, ty: -1200 };
    const cmax = G.clusterPoints(pts, vmax, size);
    expect(cmax.filter((c: any) => c.count === 1).length).toBeGreaterThan(cmax.length / 2);
    for (const c of cmax.filter((x: any) => x.count === 1)) expect(c.key).toBe(c.items[0].id);
  });

  it('regroupement déterministe : même entrée dans un autre ordre = mêmes bulles', () => {
    const pts = listings.map((l) => ({ id: l.id, ...pins[l.id] }));
    const v = G.zoomAt(G.initialView(size), 2, 300, 200, size);
    const a = G.clusterPoints(pts, v, size); const b = G.clusterPoints([...pts].reverse(), v, size);
    expect(a.map((c: any) => [c.key, c.count])).toEqual(b.map((c: any) => [c.key, c.count]));
  });
});
