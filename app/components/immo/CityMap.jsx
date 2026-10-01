'use client';

import { useMemo } from 'react';
import { hash, rng, eur, TYPE_LABEL } from './api';

// Carte stylisée en SVG (aucun fond de carte réel : les villes sont fictives). Une ville : trois quartiers (centre, péricentre, périphérie)
// teintés selon le prix moyen au m² des annonces (« carte des prix »), et une pastille de prix par annonce. Toutes les villes : un archipel.
// Les pastilles sont de vrais boutons HTML (clavier, lecteur d'écran) posés par-dessus le dessin ; la liste des résultats en est l'équivalent texte.
const W = 600; const H = 420;
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€` : `${(n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`);

const blob = (cx, cy, rx, ry, seed, wobble = 0.12, n = 14) => {
  const r = rng(seed); const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2; const k = 1 + (r() - 0.5) * 2 * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  // courbe lisse fermée (Catmull-Rom → Bézier)
  const d = pts.map((p, i) => {
    const p0 = pts[(i - 1 + n) % n]; const p1 = p; const p2 = pts[(i + 1) % n]; const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]; const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return `${i === 0 ? `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}` : ''} C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }).join(' ');
  return `${d} Z`;
};

const ZONES = { centre: [0, 0.3], pericentre: [0.4, 0.64], peripherie: [0.72, 0.93] };
const zoneKey = (nid) => nid.split(':')[1] ?? 'pericentre';
const ZONE_LABEL = { centre: 'Centre', pericentre: 'Péricentre', peripherie: 'Périphérie' };

function placePins(listings, cx, cy, rx, ry) {
  const pins = listings.map((l) => {
    const r = rng(hash(l.id)); const [a, b] = ZONES[zoneKey(l.neighborhoodId)] ?? ZONES.pericentre;
    const ang = r() * Math.PI * 2; const rad = a + (b - a) * Math.sqrt(r());
    return { l, x: cx + Math.cos(ang) * rx * rad * 0.92, y: cy + Math.sin(ang) * ry * rad * 0.92 };
  });
  // petite relaxation : écarte les pastilles qui se chevauchent (déterministe)
  for (let it = 0; it < 30; it += 1) {
    for (let i = 0; i < pins.length; i += 1) for (let j = i + 1; j < pins.length; j += 1) {
      const dx = pins[j].x - pins[i].x; const dy = pins[j].y - pins[i].y; const d = Math.hypot(dx, dy) || 0.01; const min = 46;
      if (d < min) { const push = (min - d) / 2; const ux = dx / d; const uy = dy / d; pins[i].x -= ux * push; pins[i].y -= uy * push; pins[j].x += ux * push; pins[j].y += uy * push; }
    }
    pins.forEach((p) => { p.x = Math.min(W - 40, Math.max(40, p.x)); p.y = Math.min(H - 28, Math.max(28, p.y)); });
  }
  return pins;
}

export default function CityMap({ cityId, cities, listings, allListings, activeId, onActive, onOpen, onCity, favorites }) {
  const city = cities.find((c) => c.id === cityId);

  const cityView = useMemo(() => {
    if (!city) return null;
    const cx = W / 2; const cy = H / 2; const rx = 262; const ry = 176; const seed = hash(city.id);
    const base = allListings.filter((l) => l.cityId === city.id);
    const avg = {};
    for (const z of Object.keys(ZONES)) {
      const ls = base.filter((l) => zoneKey(l.neighborhoodId) === z);
      avg[z] = ls.length ? ls.reduce((s, l) => s + l.pricePerSqm, 0) / ls.length : null;
    }
    const vals = Object.values(avg).filter(Boolean); const lo = Math.min(...vals); const hi = Math.max(...vals);
    const heat = (z) => (avg[z] === null || hi === lo ? 0.35 : 0.25 + 0.55 * ((avg[z] - lo) / (hi - lo)));
    const r = rng(seed ^ 77);
    const roads = Array.from({ length: 9 }, () => { const a = r() * Math.PI * 2; const b = a + Math.PI * (0.8 + r() * 0.4); return `M${cx + Math.cos(a) * rx * 0.95},${cy + Math.sin(a) * ry * 0.95} Q${cx + (r() - 0.5) * 120},${cy + (r() - 0.5) * 90} ${cx + Math.cos(b) * rx * 0.95},${cy + Math.sin(b) * ry * 0.95}`; });
    return {
      cx, cy, avg, heat, roads,
      shapes: { peripherie: blob(cx, cy, rx, ry, seed), pericentre: blob(cx, cy, rx * 0.66, ry * 0.66, seed + 1, 0.1), centre: blob(cx, cy, rx * 0.33, ry * 0.33, seed + 2, 0.08) },
      river: `M-10,${60 + r() * 40} C150,${160 + r() * 40} 330,${40 + r() * 60} 610,${300 + r() * 60}`,
      pins: placePins(listings, cx, cy, rx, ry),
    };
  }, [city, listings, allListings]);

  const archipelago = useMemo(() => {
    if (city) return null;
    const cols = 4;
    return cities.map((c, i) => {
      const r = rng(hash(c.id)); const col = i % cols; const row = Math.floor(i / cols);
      const x = (col + 0.5) * (W / cols) + (r() - 0.5) * 30; const y = (row + 0.5) * (H / 2) + (r() - 0.5) * 24;
      const size = { metropolis: 60, large: 50, medium: 42, small: 32 }[c.tier] ?? 42;
      const ls = allListings.filter((l) => l.cityId === c.id);
      return { c, x, y, size, path: blob(x, y, size * 1.2, size * 0.85, hash(c.id)), count: ls.length, from: ls.length ? Math.min(...ls.map((l) => l.price)) : null };
    });
  }, [city, cities, allListings]);

  const pct = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  if (!city) {
    return (
      <div className="rp-map" role="group" aria-label="Carte des villes : choisis une ville pour voir ses annonces">
        <svg viewBox={`0 0 ${W} ${H}`} className="rp-map__svg" aria-hidden="true" focusable="false">
          <rect width={W} height={H} className="rp-map__sea" />
          {archipelago.map(({ c, path }, i) => <path key={c.id} d={path} className="rp-map__island" style={{ animationDelay: `${i * 60}ms` }} />)}
        </svg>
        {archipelago.map(({ c, x, y, count, from }, i) => (
          <button key={c.id} type="button" className="rp-city-pin" style={{ ...pct(x, y), animationDelay: `${i * 70}ms` }} onClick={() => onCity(c.id)} disabled={count === 0}
            aria-label={`${c.name} : ${count} annonce${count > 1 ? 's' : ''}${from ? `, à partir de ${eur(from)}` : ''}`}>
            <strong>{c.name}</strong>
            <span>{count} bien{count > 1 ? 's' : ''}{from ? ` · dès ${short(from)}` : ''}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rp-map" role="group" aria-label={`Carte de ${city.name} : une pastille de prix par annonce. La liste des résultats donne les mêmes informations en texte.`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="rp-map__svg" aria-hidden="true" focusable="false">
        <rect width={W} height={H} className="rp-map__sea" />
        <path d={cityView.river} className="rp-map__river" />
        {['peripherie', 'pericentre', 'centre'].map((z) => <path key={z} d={cityView.shapes[z]} className={`rp-map__zone rp-map__zone--${z}`} style={{ '--heat': cityView.heat(z) }} />)}
        {cityView.roads.map((d, i) => <path key={i} d={d} className="rp-map__road" />)}
        {['peripherie', 'pericentre', 'centre'].map((z, i) => {
          const rr = { peripherie: 0.82, pericentre: 0.52, centre: 0.0 }[z];
          return <text key={z} x={cityView.cx} y={cityView.cy - 176 * (rr || 0) + (z === 'centre' ? 4 : -6)} className="rp-map__zonelabel" textAnchor="middle">{ZONE_LABEL[z]}{cityView.avg[z] ? ` · ${Math.round(cityView.avg[z]).toLocaleString('fr-FR')} €/m²` : ''}</text>;
        })}
      </svg>
      {cityView.pins.map(({ l, x, y }, i) => (
        <button key={l.id} type="button" className={`rp-pin ${activeId === l.id ? 'is-active' : ''} ${l.urgentSale ? 'is-urgent' : ''}`}
          style={{ ...pct(x, y), animationDelay: `${Math.min(i, 24) * 30}ms` }} onMouseEnter={() => onActive(l.id)} onMouseLeave={() => onActive(null)} onFocus={() => onActive(l.id)} onBlur={() => onActive(null)} onClick={() => onOpen(l.id)}
          aria-label={`${TYPE_LABEL[l.type]} ${l.surfaceSqm} m², ${l.neighborhoodName}, ${eur(l.price)}${l.urgentSale ? ', vente pressée' : ''}${favorites?.has(l.id) ? ', favori' : ''}. Ouvrir la fiche.`}>
          {favorites?.has(l.id) && <span aria-hidden="true">♥ </span>}{short(l.price)}
        </button>
      ))}
    </div>
  );
}
