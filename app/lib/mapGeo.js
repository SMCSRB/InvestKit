// Géométrie de la carte Immobilier (SVG maison) : fonctions PURES, sans DOM ni horloge, donc testables seules.
// Le monde fait WORLD.w × WORLD.h « unités ». À l'écran : position = unité × (échelle de base × zoom) + décalage.
// Les villes sont fictives : aucune coordonnée réelle, tout est déterministe (même annonce → même place).
export const WORLD = { w: 1000, h: 640 };
export const MIN_K = 1;
export const MAX_K = 14;

const hash = (str) => { let h = 2166136261; const s = String(str); for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const TIER_RX = { metropolis: 105, large: 90, medium: 76, small: 60 };
export const ZONES = { centre: [0, 0.3], pericentre: [0.4, 0.64], peripherie: [0.72, 0.93] };
export const zoneKey = (neighborhoodId) => String(neighborhoodId).split(':')[1] ?? 'pericentre';

// Place de chaque ville sur la carte : grille de 4 colonnes, légèrement décalée (déterministe), taille selon la taille de la ville.
export const cityLayout = (cities) => {
  const cols = 4; const rows = Math.max(1, Math.ceil(cities.length / cols));
  const out = {};
  cities.forEach((c, i) => {
    const r = rng(hash(c.id));
    const col = i % cols; const row = Math.floor(i / cols);
    const rx = TIER_RX[c.tier] ?? 76;
    out[c.id] = { id: c.id, x: (col + 0.5) * (WORLD.w / cols) + (r() - 0.5) * 36, y: (row + 0.5) * (WORLD.h / rows) + (r() - 0.5) * 28, rx, ry: rx * 0.72, seed: hash(c.id) };
  });
  return out;
};

// Place de chaque annonce dans sa ville : selon son quartier (centre, péricentre, périphérie), puis écartement léger pour éviter les superpositions.
export const layoutPins = (layout, listings, minDist = 9) => {
  const byCity = {};
  for (const l of listings) { if (layout[l.cityId]) (byCity[l.cityId] ||= []).push(l); }
  const out = {};
  for (const [cityId, ls] of Object.entries(byCity)) {
    const a = layout[cityId];
    const pins = [...ls].sort((p, q) => (p.id < q.id ? -1 : 1)).map((l) => {
      const r = rng(hash(l.id)); const [lo, hi] = ZONES[zoneKey(l.neighborhoodId)] ?? ZONES.pericentre;
      const ang = r() * Math.PI * 2; const rad = lo + (hi - lo) * Math.sqrt(r());
      return { id: l.id, x: a.x + Math.cos(ang) * a.rx * rad * 0.92, y: a.y + Math.sin(ang) * a.ry * rad * 0.92 };
    });
    for (let it = 0; it < 24; it += 1) {
      for (let i = 0; i < pins.length; i += 1) for (let j = i + 1; j < pins.length; j += 1) {
        const dx = pins[j].x - pins[i].x; const dy = pins[j].y - pins[i].y; const d = Math.hypot(dx, dy) || 0.01;
        if (d < minDist) { const push = (minDist - d) / 2; const ux = dx / d; const uy = dy / d; pins[i].x -= ux * push; pins[i].y -= uy * push; pins[j].x += ux * push; pins[j].y += uy * push; }
      }
    }
    for (const p of pins) out[p.id] = { x: p.x, y: p.y };
  }
  return out;
};

export const baseScale = (size) => Math.min(size.w / WORLD.w, size.h / WORLD.h);
export const scaleOf = (view, size) => baseScale(size) * view.k;

// Garde la carte dans le cadre : si le monde est plus petit que le cadre il est centré, sinon on ne peut pas sortir de ses bords.
export const clampView = (view, size) => {
  const k = clamp(view.k, MIN_K, MAX_K); const s = baseScale(size) * k;
  const cw = WORLD.w * s; const ch = WORLD.h * s;
  const fit = (t, content, box) => (content <= box ? (box - content) / 2 : clamp(t, box - content, 0));
  return { k, tx: fit(view.tx, cw, size.w), ty: fit(view.ty, ch, size.h) };
};
export const initialView = (size) => clampView({ k: 1, tx: 0, ty: 0 }, size);

export const toScreen = (pt, view, size) => { const s = scaleOf(view, size); return { x: pt.x * s + view.tx, y: pt.y * s + view.ty }; };
export const toWorld = (px, py, view, size) => { const s = scaleOf(view, size); return { x: (px - view.tx) / s, y: (py - view.ty) / s }; };

// Zoom autour d'un point de l'écran (le point sous le doigt ou la souris reste en place).
export const zoomAt = (view, factor, px, py, size) => {
  const k = clamp(view.k * factor, MIN_K, MAX_K); const ratio = k / view.k;
  return clampView({ k, tx: px - (px - view.tx) * ratio, ty: py - (py - view.ty) * ratio }, size);
};
export const panBy = (view, dx, dy, size) => clampView({ ...view, tx: view.tx + dx, ty: view.ty + dy }, size);

// Pincement à deux doigts : `prev` et `next` sont les deux positions { x, y } avant et après le mouvement.
export const pinchView = (view, prev, next, size) => {
  const dist = (p) => Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1;
  const mid = (p) => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
  const k = clamp(view.k * (dist(next) / dist(prev)), MIN_K, MAX_K); const ratio = k / view.k;
  const m0 = mid(prev); const m1 = mid(next);
  return clampView({ k, tx: m1.x - (m0.x - view.tx) * ratio, ty: m1.y - (m0.y - view.ty) * ratio }, size);
};

export const boundsOf = (points, pad = 0) => {
  if (!points.length) return null;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
};
// Vue qui cadre un rectangle du monde (avec une marge en pixels).
export const fitBounds = (b, size, padding = 48) => {
  const bw = Math.max(1, b.maxX - b.minX); const bh = Math.max(1, b.maxY - b.minY);
  const want = Math.min((size.w - 2 * padding) / bw, (size.h - 2 * padding) / bh);
  const k = clamp(want / baseScale(size), MIN_K, MAX_K); const s = baseScale(size) * k;
  return clampView({ k, tx: size.w / 2 - ((b.minX + b.maxX) / 2) * s, ty: size.h / 2 - ((b.minY + b.maxY) / 2) * s }, size);
};

// Regroupement des annonces en bulles numérotées : deux annonces à moins de `radius` pixels l'une de l'autre se regroupent.
// Déterministe (ordre des identifiants) ; rien n'est perdu (la somme des effectifs = le nombre d'annonces).
export const clusterPoints = (items, view, size, radius = 46) => {
  const s = scaleOf(view, size);
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const clusters = [];
  const cell = radius; const grid = new Map();
  const key = (cx, cy) => `${cx}:${cy}`;
  for (const it of sorted) {
    const sx = it.x * s; const sy = it.y * s; const gx = Math.floor(sx / cell); const gy = Math.floor(sy / cell);
    let best = null; let bestD = radius;
    for (let ix = gx - 1; ix <= gx + 1; ix += 1) for (let iy = gy - 1; iy <= gy + 1; iy += 1) {
      for (const c of grid.get(key(ix, iy)) ?? []) { const d = Math.hypot(c.x * s - sx, c.y * s - sy); if (d < bestD) { bestD = d; best = c; } }
    }
    if (best) {
      const n = best.items.length;
      best.x = (best.x * n + it.x) / (n + 1); best.y = (best.y * n + it.y) / (n + 1); best.items.push(it);
    } else {
      const c = { x: it.x, y: it.y, items: [it] };
      clusters.push(c);
      const k0 = key(gx, gy); if (!grid.has(k0)) grid.set(k0, []); grid.get(k0).push(c);
    }
  }
  return clusters.map((c) => ({ key: c.items.length === 1 ? c.items[0].id : `c:${c.items.map((i) => i.id).sort()[0]}:${c.items.length}`, x: c.x, y: c.y, count: c.items.length, items: c.items }));
};

// Contour arrondi d'une « île » (ville) : courbe lisse fermée, légèrement irrégulière (déterministe).
export const blobPath = (cx, cy, rx, ry, seed, wobble = 0.12, n = 14) => {
  const r = rng(seed); const pts = [];
  for (let i = 0; i < n; i += 1) { const a = (i / n) * Math.PI * 2; const k = 1 + (r() - 0.5) * 2 * wobble; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  const f = (v) => v.toFixed(1);
  const d = pts.map((p1, i) => {
    const p0 = pts[(i - 1 + n) % n]; const p2 = pts[(i + 1) % n]; const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]; const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return `${i === 0 ? `M${f(p1[0])},${f(p1[1])}` : ''} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }).join(' ');
  return `${d} Z`;
};
export { hash as mapHash, rng as mapRng };
