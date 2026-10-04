'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';
import { LazyListingArt } from './art';
import { Dpe } from './bits';
import { TYPE_LABEL, eur, eurText, listingAlt, pct } from './api';
import {
  WORLD, MAX_K, scaleOf, initialView, clampView, zoomAt, panBy, pinchView, fitBounds, boundsOf, clusterPoints, cityLayout, layoutPins, blobPath, mapRng, zoneKey, toScreen,
} from '@/app/lib/mapGeo';

// Carte interactive « maison » (SVG, aucune bibliothèque) : zoom (molette, boutons, double-clic, clavier), déplacement (glisser, flèches),
// pincement à deux doigts, regroupement des annonces en bulles numérotées, pastilles de prix = VRAIS boutons.
// Les villes sont fictives : le dessin est le nôtre ; la liste des résultats reste l'équivalent texte de la carte.
const ZONE_LABEL = { centre: 'Centre', pericentre: 'Péricentre', peripherie: 'Périphérie' };
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M` : n >= 1e4 ? `${Math.round(n / 1e3)} k` : `${Math.round(n).toLocaleString('fr-FR')}`);
const lerp = (a, b, t) => a + (b - a) * t;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function ListingMap({ cities, listings, pool, mode = 'buy', activeId, onActive, onOpen, favorites, cityId, onCity, cityOf }) {
  const boxRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setViewState] = useState({ k: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  const [selected, setSelected] = useState(null);
  const animRef = useRef(0);
  const ptrs = useRef(new Map());
  const drag = useRef(null);
  const pinch = useRef(null);
  const suppressClick = useRef(false);
  const fitKeyRef = useRef('');

  const setView = useCallback((v) => { viewRef.current = v; setViewState(v); }, []);
  const rent = mode === 'rent';
  const valueOf = useCallback((l) => (rent ? l.marketRentMonthly : l.price), [rent]);
  const labelOf = useCallback((l) => (rent ? `${Math.round(l.marketRentMonthly).toLocaleString('fr-FR')}` : short(l.price)), [rent]);

  // Taille réelle du cadre (la carte occupe toute la place disponible, sur ordinateur comme sur téléphone).
  useEffect(() => {
    const el = boxRef.current; if (!el) return undefined;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height })); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const animateTo = useCallback((target) => {
    cancelAnimationFrame(animRef.current);
    if (reducedMotion()) { setView(target); return; }
    const from = viewRef.current; const t0 = performance.now(); const dur = 420;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur); const e = 1 - (1 - t) ** 3;
      setView({ k: lerp(from.k, target.k, e), tx: lerp(from.tx, target.tx, e), ty: lerp(from.ty, target.ty, e) });
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, [setView]);
  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const layout = useMemo(() => cityLayout(cities), [cities]);
  const base = pool?.length ? pool : listings;
  const pins = useMemo(() => layoutPins(layout, base), [layout, base]);

  // Teinte des quartiers = prix moyen au m² (comparable d'une ville à l'autre).
  const islands = useMemo(() => {
    const avg = {}; const all = [];
    for (const l of base) { const z = zoneKey(l.neighborhoodId); const k = `${l.cityId}|${z}`; (avg[k] ||= []).push(l.pricePerSqm); }
    const means = Object.fromEntries(Object.entries(avg).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
    Object.values(means).forEach((m) => all.push(m));
    const lo = Math.min(...all); const hi = Math.max(...all);
    const heat = (m) => (m === undefined || !Number.isFinite(lo) || hi === lo ? 0.3 : 0.2 + 0.6 * ((m - lo) / (hi - lo)));
    return cities.map((c) => {
      const a = layout[c.id]; const r = mapRng(a.seed ^ 77);
      const roads = Array.from({ length: 6 }, () => { const t0 = r() * Math.PI * 2; const t1 = t0 + Math.PI * (0.8 + r() * 0.4); return `M${a.x + Math.cos(t0) * a.rx * 0.95},${a.y + Math.sin(t0) * a.ry * 0.95} Q${a.x + (r() - 0.5) * a.rx},${a.y + (r() - 0.5) * a.ry} ${a.x + Math.cos(t1) * a.rx * 0.95},${a.y + Math.sin(t1) * a.ry * 0.95}`; });
      return {
        c, a, roads,
        shapes: { peripherie: blobPath(a.x, a.y, a.rx, a.ry, a.seed), pericentre: blobPath(a.x, a.y, a.rx * 0.66, a.ry * 0.66, a.seed + 1, 0.1), centre: blobPath(a.x, a.y, a.rx * 0.33, a.ry * 0.33, a.seed + 2, 0.08) },
        heat: { centre: heat(means[`${c.id}|centre`]), pericentre: heat(means[`${c.id}|pericentre`]), peripherie: heat(means[`${c.id}|peripherie`]) },
        mean: { centre: means[`${c.id}|centre`], pericentre: means[`${c.id}|pericentre`], peripherie: means[`${c.id}|peripherie`] },
      };
    });
  }, [cities, layout, base]);

  // Cadrage automatique : à chaque changement de recherche (ou de ville), la carte se recadre sur les résultats.
  const idsKey = useMemo(() => listings.map((l) => l.id).join(','), [listings]);
  useEffect(() => {
    if (!size.w) return;
    const key = `${cityId ?? ''}|${idsKey}|${Math.round(size.w)}x${Math.round(size.h)}`;
    if (fitKeyRef.current === key) return;
    const first = fitKeyRef.current === '';
    fitKeyRef.current = key;
    let target;
    if (cityId && layout[cityId]) { const a = layout[cityId]; target = fitBounds({ minX: a.x - a.rx, maxX: a.x + a.rx, minY: a.y - a.ry, maxY: a.y + a.ry }, size, 24); }
    else {
      const pts = listings.map((l) => pins[l.id]).filter(Boolean);
      const b = boundsOf(pts, 40);
      target = b && pts.length ? fitBounds(b, size, 36) : initialView(size);
    }
    setSelected(null);
    if (first) setView(target); else animateTo(target);
  }, [size, cityId, idsKey, layout, pins, listings, animateTo, setView]);
  useEffect(() => { if (size.w) setView(clampView(viewRef.current, size)); }, [size, setView]);

  // Molette : zoom autour du curseur (écouteur natif non passif pour bloquer le défilement de la page).
  useEffect(() => {
    const el = boxRef.current; if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      cancelAnimationFrame(animRef.current);
      setView(zoomAt(viewRef.current, Math.exp(-e.deltaY * 0.0017), e.clientX - r.left, e.clientY - r.top, { w: r.width, h: r.height }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setView]);

  const local = (e) => { const r = boxRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    cancelAnimationFrame(animRef.current);
    ptrs.current.set(e.pointerId, local(e));
    if (ptrs.current.size === 1) { drag.current = { id: e.pointerId, start: local(e), v: viewRef.current, moved: false }; pinch.current = null; }
    else if (ptrs.current.size === 2) { drag.current = null; pinch.current = [...ptrs.current.values()].slice(0, 2); }
  };
  const onPointerMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const p = local(e); ptrs.current.set(e.pointerId, p);
    if (pinch.current && ptrs.current.size >= 2) {
      const next = [...ptrs.current.values()].slice(0, 2);
      setView(pinchView(viewRef.current, pinch.current, next, size)); pinch.current = next; suppressClick.current = true;
    } else if (drag.current && drag.current.id === e.pointerId) {
      const dx = p.x - drag.current.start.x; const dy = p.y - drag.current.start.y;
      if (!drag.current.moved && Math.hypot(dx, dy) > 5) { drag.current.moved = true; try { boxRef.current.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
      if (drag.current.moved) { suppressClick.current = true; setView(clampView({ ...drag.current.v, tx: drag.current.v.tx + dx, ty: drag.current.v.ty + dy }, size)); }
    }
  };
  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 0) { drag.current = null; setTimeout(() => { suppressClick.current = false; }, 0); }
    else if (ptrs.current.size === 1) { const [id, pt] = [...ptrs.current.entries()][0]; drag.current = { id, start: pt, v: viewRef.current, moved: true }; }
  };
  const onClickCapture = (e) => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); } };
  const onDoubleClick = (e) => { if (e.target.closest('button')) return; const p = local(e); animateTo(zoomAt(viewRef.current, 2, p.x, p.y, size)); };

  const zoomBy = (f) => animateTo(zoomAt(viewRef.current, f, size.w / 2, size.h / 2, size));
  const reset = () => {
    const pts = listings.map((l) => pins[l.id]).filter(Boolean); const b = boundsOf(pts, 40);
    animateTo(b && pts.length ? fitBounds(b, size, 36) : initialView(size));
  };
  const onKeyDown = (e) => {
    if (e.target !== boxRef.current) return;
    const step = 70;
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (map[e.key]) { e.preventDefault(); setView(panBy(viewRef.current, map[e.key][0], map[e.key][1], size)); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.5); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.5); }
    else if (e.key === '0' || e.key === 'Home') { e.preventDefault(); reset(); }
    else if (e.key === 'Escape') setSelected(null);
  };

  const s = size.w ? scaleOf(view, size) : 1;
  const clusters = useMemo(() => {
    if (!size.w) return [];
    const items = listings.filter((l) => pins[l.id]).map((l) => ({ id: l.id, x: pins[l.id].x, y: pins[l.id].y, l }));
    return clusterPoints(items, view, size, 44);
  }, [listings, pins, view, size]);
  const visible = useMemo(() => clusters.filter((c) => { const p = toScreen(c, view, size); return p.x > -40 && p.x < size.w + 40 && p.y > -40 && p.y < size.h + 40; }), [clusters, view, size]);
  const visibleCount = visible.reduce((n, c) => n + c.count, 0);

  const openCluster = (c) => {
    const b = boundsOf(c.items, 0); const w = Math.max(60, b.maxX - b.minX); const h = Math.max(40, b.maxY - b.minY);
    const cx = (b.minX + b.maxX) / 2; const cy = (b.minY + b.maxY) / 2;
    animateTo(fitBounds({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 }, size, 80));
  };

  const sel = selected ? listings.find((l) => l.id === selected) : null;
  const selPos = sel && pins[sel.id] ? toScreen(pins[sel.id], view, size) : null;
  const popLeft = selPos ? Math.min(Math.max(selPos.x, 150), Math.max(150, size.w - 150)) : 0;
  const popBelow = selPos ? selPos.y < 210 : false;
  // Étiquettes des villes : les plus grandes d'abord, et on cache celles qui en recouvriraient une autre (elles reviennent en zoomant).
  const cityLabels = useMemo(() => {
    if (!size.w || view.k >= 4.5) return [];
    const order = { metropolis: 0, large: 1, medium: 2, small: 3 };
    const kept = []; const out = [];
    [...islands].sort((a, b) => (order[a.c.tier] ?? 4) - (order[b.c.tier] ?? 4)).forEach(({ c, a }) => {
      const p = toScreen({ x: a.x, y: a.y - a.ry * 1.05 }, view, size);
      const w = 22 + c.name.length * 6.8; const h = 28;
      const rect = { l: p.x - w / 2, r: p.x + w / 2, t: p.y - h, b: p.y };
      const clash = kept.some((k) => rect.l < k.r + 3 && rect.r > k.l - 3 && rect.t < k.b + 3 && rect.b > k.t - 3);
      if (!clash || cityId === c.id) { kept.push(rect); out.push({ c, p }); }
    });
    return out;
  }, [islands, view, size, cityId]);

  return (
    <div className="rp-map2" data-testid="listing-map">
      <div
        ref={boxRef} className="rp-map2__box" tabIndex={0} role="group" aria-roledescription="carte interactive"
        aria-label="Carte des annonces. Glisse pour te déplacer, molette ou pincement pour zoomer, flèches et touches plus et moins au clavier. Les pastilles sont des boutons ; la liste des résultats donne les mêmes informations en texte."
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture} onDoubleClick={onDoubleClick} onKeyDown={onKeyDown}
      >
        {size.w > 0 && (
          <svg className="rp-map2__svg" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true" focusable="false">
            <rect width={size.w} height={size.h} className="rp-map__sea" />
            <g transform={`translate(${view.tx} ${view.ty}) scale(${s})`}>
              <rect x="-400" y="-300" width={WORLD.w + 800} height={WORLD.h + 600} className="rp-map__sea" />
              {islands.map(({ c, a, shapes, heat, roads, mean }) => (
                <g key={c.id} className={cityId && cityId !== c.id ? 'rp-map2__island is-dim' : 'rp-map2__island'}>
                  <path d={shapes.peripherie} className="rp-map__island" style={{ animation: 'none' }} />
                  {['peripherie', 'pericentre', 'centre'].map((z) => <path key={z} d={shapes[z]} className={`rp-map__zone rp-map__zone--${z}`} style={{ '--heat': heat[z], strokeWidth: 1.2 / s }} />)}
                  {view.k >= 2 && roads.map((d, i) => <path key={i} d={d} className="rp-map__road" style={{ strokeWidth: 1.6 / s }} />)}
                  {view.k >= 3.2 && ['peripherie', 'pericentre', 'centre'].map((z) => (
                    <text key={z} x={a.x} y={a.y - a.ry * { peripherie: 0.82, pericentre: 0.52, centre: 0 }[z] + (z === 'centre' ? 3 / s : -4 / s)} textAnchor="middle" className="rp-map__zonelabel" style={{ fontSize: 11 / s, strokeWidth: 3 / s }}>
                      {ZONE_LABEL[z]}{mean[z] ? ` · ${Math.round(mean[z]).toLocaleString('fr-FR')} InvestCoins/m²` : ''}
                    </text>
                  ))}
                </g>
              ))}
            </g>
          </svg>
        )}

        {cityLabels.map(({ c, p }) => {
          const n = listings.filter((l) => l.cityId === c.id).length;
          return (
            <button key={c.id} type="button" className={`rp-map2__city ${cityId === c.id ? 'is-on' : ''}`} style={{ left: p.x, top: p.y }} onClick={() => onCity(cityId === c.id ? '' : c.id)}
              aria-pressed={cityId === c.id} aria-label={`${c.name} : ${n} annonce${n > 1 ? 's' : ''}. ${cityId === c.id ? 'Retirer le filtre sur cette ville' : 'Filtrer sur cette ville'}`}>
              {c.name}
            </button>
          );
        })}

        {visible.map((c) => {
          const p = toScreen(c, view, size);
          if (c.count === 1) {
            const l = c.items[0].l; const fav = favorites?.has(l.id);
            return (
              <button key={c.key} type="button" className={`rp-pin rp-pin2 ${activeId === l.id || selected === l.id ? 'is-active' : ''} ${l.urgentSale ? 'is-urgent' : ''}`} style={{ left: p.x, top: p.y }}
                onMouseEnter={() => onActive?.(l.id)} onMouseLeave={() => onActive?.(null)} onFocus={() => onActive?.(l.id)} onBlur={() => onActive?.(null)}
                onClick={() => { setSelected(l.id); onActive?.(l.id); }}
                aria-label={`${TYPE_LABEL[l.type]} ${l.surfaceSqm} m², ${l.neighborhoodName}, ${rent ? `${eurText(l.marketRentMonthly)} par mois` : eurText(l.price)}${l.urgentSale ? ', vente pressée' : ''}${fav ? ', favori' : ''}. Afficher l’aperçu.`}>
                {fav && <Icon name="heart" size={11} />}{labelOf(l)}
              </button>
            );
          }
          const vals = c.items.map((i) => valueOf(i.l)); const lo = Math.min(...vals); const hi = Math.max(...vals);
          const d = Math.round(34 + Math.log2(c.count) * 7);
          return (
            <button key={c.key} type="button" className="rp-cluster" style={{ left: p.x, top: p.y, width: d, height: d }} onClick={() => openCluster(c)}
              aria-label={`${c.count} annonces groupées, ${rent ? 'loyers' : 'prix'} de ${rent ? `${Math.round(lo)} à ${Math.round(hi)} InvestCoins par mois` : `${eurText(lo)} à ${eurText(hi)}`}. Zoomer sur ce groupe.`}>
              <strong>{c.count}</strong>
            </button>
          );
        })}

        {sel && selPos && (
          <div className={`rp-map2__pop ${popBelow ? 'is-below' : ''}`} style={{ left: popLeft, top: selPos.y }} role="dialog" aria-label={`Aperçu : ${sel.title}`}>
            <button type="button" className="rp-map2__popclose" onClick={() => setSelected(null)} aria-label="Fermer l’aperçu"><Icon name="x" size={16} /></button>
            <div className="rp-map2__popmedia"><LazyListingArt listing={sel} alt={listingAlt(sel, cityOf?.[sel.cityId])} /></div>
            <div className="rp-map2__popbody">
              <strong>{rent ? `${eurText(sel.marketRentMonthly)}/mois` : eur(sel.price)}</strong>
              <span>{TYPE_LABEL[sel.type]} · {sel.surfaceSqm} m²{sel.type === 'parking' ? '' : ` · ${sel.rooms} p.`} · {sel.neighborhoodName}</span>
              <span className="rp-map2__popmeta">{sel.type !== 'parking' && <Dpe cls={sel.energyClass} size="sm" />} {rent ? `${eurText(sel.price)} à l’achat` : `rendement ${pct(sel.grossYieldPct)}`}</span>
              <Button size="sm" variant="primary" onClick={() => onOpen(sel.id)}>Voir la fiche</Button>
            </div>
          </div>
        )}

        <div className="rp-map2__ctrl">
          <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoomer" disabled={view.k >= MAX_K - 0.01}><Icon name="zoomIn" size={20} /></button>
          <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Dézoomer" disabled={view.k <= 1.01}><Icon name="zoomOut" size={20} /></button>
          <button type="button" onClick={reset} aria-label="Tout voir : recadrer sur les résultats"><Icon name="maximize" size={20} /></button>
        </div>
        <p className="rp-map2__legend" aria-hidden="true">
          <span className="rp-map2__dot rp-map2__dot--pin" /> un bien
          <span className="rp-map2__dot rp-map2__dot--cluster" /> plusieurs biens (touche pour zoomer)
        </p>
        <p className="ik-sr-only" role="status" aria-live="polite">{visibleCount} annonce{visibleCount > 1 ? 's' : ''} dans la zone visible de la carte.</p>
      </div>
    </div>
  );
}
