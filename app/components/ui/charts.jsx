'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

// Graphiques SVG légers du tableau de bord (courbes, histogrammes empilés, anneau, mini-courbes).
// Les graphiques « professionnels » de marché (bougies, indicateurs) utilisent Lightweight Charts, voir app/crypto/PriceChart.jsx.
// Règles : couleurs = variables --ik-series-N (ordre fixe), légende dès 2 séries, jamais de double axe,
// valeurs aussi disponibles en tableau pour les lecteurs d'écran.

const fmtDefault = (v) => Math.round(v).toLocaleString('fr-FR');

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Courbe lissée sans dépassement (interpolation monotone).
function smoothPath(pts) {
  if (pts.length < 2) return '';
  const n = pts.length;
  const dx = [];
  const m = [];
  const slopes = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    slopes[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1);
  }
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i += 1) m[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export function Legend({ items }) {
  if (!items || items.length < 2) return null;
  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((it) => (
        <li key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 'var(--ik-fs-sm)', color: 'var(--ik-text-2)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ caption, columns, rows }) {
  return (
    <table className="ik-sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Courbe(s) lissée(s) avec infobulle et réticule vertical.
 * series: [{ label, color, data: number[] }] ; labels: string[] (une étiquette par point).
 */
export function LineChart({ series, labels, height = 280, format = fmtDefault, yFormat, xEvery = 1, area = true, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const uid = useId().replace(/:/g, '');
  const pad = { l: 52, r: 14, t: 14, b: 28 };
  const w = Math.max(width, 240);
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const n = labels.length;

  const { min, max } = useMemo(() => {
    const all = series.flatMap((s) => s.data).filter(Number.isFinite);
    const lo = Math.min(...all, 0);
    const hi = Math.max(...all, 1);
    const span = hi - lo || 1;
    return { min: lo, max: hi + span * 0.08 };
  }, [series]);

  const x = (i) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const ticks = [0, 1, 2, 3, 4].map((k) => min + ((max - min) * k) / 4);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const i = Math.round(((px - pad.l) / (iw || 1)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      {width > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={ariaLabel || 'Graphique en courbes'}
          onMouseMove={onMove}
          onTouchMove={onMove}
          onMouseLeave={() => setHover(null)}
          onTouchEnd={() => setHover(null)}
          style={{ display: 'block', touchAction: 'pan-y' }}
        >
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`a${uid}${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.32" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t, k) => (
            <g key={k}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--ik-grid)" strokeDasharray={k === 0 ? undefined : '3 5'} />
              <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ik-text-3)">
                {(yFormat || format)(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % xEvery === 0 ? (
              <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--ik-text-3)">
                {l}
              </text>
            ) : null
          )}
          {series.map((s, si) => {
            const pts = s.data.map((v, i) => [x(i), y(v)]);
            const d = smoothPath(pts);
            return (
              <g key={si}>
                {area && si === 0 && d && (
                  <path d={`${d} L${x(n - 1)},${y(min)} L${x(0)},${y(min)} Z`} fill={`url(#a${uid}${si})`} style={{ animation: 'ik-fade var(--ik-dur-chart) var(--ik-ease) both' }} />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  style={{ animation: `ik-draw var(--ik-dur-chart) var(--ik-ease) ${si * 120}ms forwards` }}
                />
              </g>
            );
          })}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--ik-border-strong)" />
              {series.map((s, si) => (
                <circle key={si} cx={x(hover)} cy={y(s.data[hover])} r="5" fill={s.color} stroke="var(--ik-surface-1)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          role="status"
          style={{
            position: 'absolute',
            top: 34,
            left: Math.min(Math.max(x(hover) + 12, 8), w - 168),
            minWidth: 150,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'var(--ik-surface-2)',
            border: '1px solid var(--ik-border-strong)',
            boxShadow: 'var(--ik-shadow-pop)',
            pointerEvents: 'none',
            fontSize: 'var(--ik-fs-sm)',
          }}
        >
          <div style={{ color: 'var(--ik-text-3)', marginBottom: 4 }}>{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} aria-hidden="true" />
              <span style={{ color: 'var(--ik-text-2)', fontWeight: 600 }}>{s.label}</span>
              <span className="ik-num" style={{ marginLeft: 'auto' }}>
                {format(s.data[hover])}
              </span>
            </div>
          ))}
        </div>
      )}
      <DataTable caption={ariaLabel || 'Valeurs du graphique'} columns={['Période', ...series.map((s) => s.label)]} rows={labels.map((l, i) => [l, ...series.map((s) => format(s.data[i]))])} />
    </div>
  );
}

/**
 * Histogramme empilé (par année, par mois...). rows: [{ label, parts: number[] }] ; keys: [{ label, color }].
 */
export function StackedBars({ rows, keys, height = 220, format = fmtDefault, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { t: 26, b: 26 };
  const ih = height - pad.t - pad.b;
  const totals = rows.map((r) => r.parts.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1);
  const w = Math.max(width, 240);
  const slot = w / rows.length;
  const bw = Math.min(46, slot * 0.56);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <Legend items={keys} />
      {width > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel || 'Histogramme empilé'} style={{ display: 'block' }}>
          <line x1="0" x2={w} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--ik-grid)" />
          {rows.map((r, i) => {
            const cx = slot * i + slot / 2;
            let acc = 0;
            return (
              <g
                key={r.label}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transformOrigin: `${cx}px ${pad.t + ih}px`, transformBox: 'view-box', animation: `ik-grow-y var(--ik-dur-chart) var(--ik-ease) ${i * 70}ms both` }}
                opacity={hover === null || hover === i ? 1 : 0.55}
              >
                {r.parts.map((p, k) => {
                  const h = (p / max) * ih;
                  const top = pad.t + ih - ((acc + p) / max) * ih;
                  acc += p;
                  return <rect key={k} x={cx - bw / 2} y={top} width={bw} height={Math.max(0, h - 2)} rx={k === r.parts.length - 1 ? 5 : 2} fill={keys[k].color} />;
                })}
                <rect x={cx - slot / 2} y={0} width={slot} height={height} fill="transparent" />
              </g>
            );
          })}
          {rows.map((r, i) => (
            <text key={r.label} x={slot * i + slot / 2} y={height - 7} textAnchor="middle" fontSize="11" fill="var(--ik-text-3)">
              {r.label}
            </text>
          ))}
          {rows.map((r, i) => (
            <text key={`t${r.label}`} x={slot * i + slot / 2} y={pad.t + ih - (totals[i] / max) * ih - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ik-text)" className="ik-num">
              {format(totals[i])}
            </text>
          ))}
        </svg>
      )}
      <DataTable caption={ariaLabel || 'Valeurs du graphique'} columns={['Période', ...keys.map((k) => k.label)]} rows={rows.map((r) => [r.label, ...r.parts.map((p) => format(p))])} />
    </div>
  );
}

/** Anneau de répartition. segments: [{ label, value, color }] ; children = texte au centre. */
export function Donut({ segments, size = 132, thickness = 16, children, ariaLabel }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel || 'Répartition'} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ik-surface-3)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const gap = segments.length > 1 ? 3 : 0;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
              strokeDashoffset={-acc}
              style={{ animation: `ik-fade var(--ik-dur-chart) var(--ik-ease) ${i * 120}ms both` }}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

/** Barre segmentée horizontale (répartition du patrimoine). */
export function SegmentedBar({ segments }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="ik-segbar" role="img" aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)} %`).join(', ')}>
      {segments.map((s, i) => (
        <span key={s.label} style={{ flex: s.value / total, background: s.color, animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}

/** Mini-courbe. `values` : nombres (vrais cours). Couleur : vert si hausse, rouge si baisse. */
export function Sparkline({ values, width = 76, height = 26, color }) {
  if (!values || values.length < 2) return <span style={{ width, height, display: 'inline-block' }} aria-hidden="true" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 2) + 1, height - 2 - ((v - lo) / span) * (height - 4)]);
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} aria-hidden="true" focusable="false">
      <path
        d={smoothPath(pts)}
        fill="none"
        stroke={color || (up ? 'var(--ik-positive)' : 'var(--ik-negative)')}
        strokeWidth="1.8"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="1"
        style={{ animation: 'ik-draw var(--ik-dur-chart) var(--ik-ease) forwards' }}
      />
    </svg>
  );
}
