'use client';

import { useEffect, useRef, useState } from 'react';
import { hash, rng, DPE_COLORS } from './api';

// Illustrations des annonces : GÉNÉRÉES PAR CODE (SVG), cohérentes avec le type de bien, son état, son DPE et sa ville.
// Aucune photo, aucune image copiée : pas de droit d'auteur, pas de téléchargement (quelques Ko de SVG en ligne), nettes sur tous les écrans.
// Même annonce → même image. Limite assumée : ce sont des rendus stylisés, pas des photos.
const PALETTES = {
  marvelle: ['#2b1d63', '#6d4ff0', '#c15bf0'], valcourt: ['#16345e', '#3b7be0', '#7fb4ff'], portelune: ['#0f3d4a', '#1aa3b8', '#7fe0e8'],
  'saint-aubrion': ['#26421f', '#58a24a', '#b4e08a'], brumevalle: ['#3a2d26', '#8a6a55', '#d6a98a'], roquemont: ['#4a2540', '#c4538c', '#f2a3c9'],
  ternelle: ['#3a3a1c', '#9a9a3a', '#e2e08a'], clairval: ['#2a2f55', '#6f78d8', '#b8bdfa'],
};
const pal = (cityId) => PALETTES[cityId] ?? PALETTES.marvelle;

function Sky({ id, p, night }) {
  return (
    <defs>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={night ? '#0d0a24' : p[0]} /><stop offset=".62" stopColor={p[1]} /><stop offset="1" stopColor={p[2]} /></linearGradient>
      <linearGradient id={`wall-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#efe9ff" /><stop offset="1" stopColor="#cfc4f2" /></linearGradient>
      <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cfe6ff" /><stop offset="1" stopColor="#7fa7e0" /></linearGradient>
    </defs>
  );
}

function Facade({ l, uid }) {
  const r = rng(hash(l.id));
  const p = pal(l.cityId);
  const worn = l.condition === 'to_renovate'; const tired = l.condition === 'to_refresh';
  const wall = worn ? '#cdbfae' : tired ? '#e4dcf3' : `url(#wall-${uid})`;
  const stars = Array.from({ length: 14 }, () => [r() * 400, r() * 90, r() * 1.4 + 0.4]);
  const clouds = [[60 + r() * 60, 38 + r() * 16], [250 + r() * 70, 28 + r() * 20]];
  const body = [];
  if (l.type === 'house') {
    body.push(
      <g key="h">
        <rect x="110" y="125" width="180" height="95" rx="3" fill={wall} />
        <polygon points="96,128 200,70 304,128" fill={worn ? '#7a5a4a' : p[2]} opacity=".95" />
        <rect x="258" y="78" width="14" height="30" fill="#8c7aa8" />
        <rect x="178" y="160" width="44" height="60" rx="3" fill={p[0]} />
        <circle cx="214" cy="192" r="2.5" fill="#ffd86b" />
        {[130, 240].map((x) => <rect key={x} x={x} y="148" width="30" height="30" rx="2" fill={`url(#glass-${uid})`} stroke="#fff" strokeOpacity=".7" />)}
        {['A', 'B'].includes(l.energyClass) && <g><rect x="130" y="96" width="34" height="14" fill="#1b2a52" transform="rotate(-22 147 103)" /><rect x="164" y="82" width="34" height="14" fill="#1b2a52" transform="rotate(-22 181 89)" /></g>}
        <ellipse cx="62" cy="206" rx="26" ry="20" fill="#2e7d4a" /><rect x="58" y="206" width="6" height="14" fill="#5b3b2a" />
        <ellipse cx="344" cy="212" rx="18" ry="14" fill="#3b9158" />
      </g>
    );
  } else {
    const floors = l.type === 'studio' ? 3 : 4 + (hash(l.id) % 3);
    const w = l.type === 'studio' ? 120 : 150; const x0 = 200 - w / 2; const fh = Math.min(26, 150 / floors);
    const top = 220 - floors * fh;
    body.push(
      <g key="b">
        <rect x={x0} y={top} width={w} height={floors * fh} rx="3" fill={wall} />
        <rect x={x0 - 4} y={top - 6} width={w + 8} height="8" rx="2" fill={p[1]} />
        {Array.from({ length: floors }).flatMap((_, fl) => Array.from({ length: l.type === 'studio' ? 3 : 4 }).map((__, c) => {
          const cx = x0 + 14 + c * ((w - 28) / (l.type === 'studio' ? 2 : 3)) - 8;
          const lit = r() > 0.55;
          return <rect key={`${fl}-${c}`} x={cx} y={top + 6 + fl * fh} width="16" height={fh - 10} rx="2" fill={tired && r() > 0.6 ? '#9b92b8' : `url(#glass-${uid})`} opacity={lit ? 1 : 0.8} stroke="#fff" strokeOpacity=".6" />;
        }))}
        <rect x="190" y="190" width="20" height="30" rx="2" fill={p[0]} />
        {['A', 'B'].includes(l.energyClass) && <rect x={x0 + 8} y={top - 14} width={w - 16} height="8" fill="#1b2a52" />}
      </g>
    );
  }
  const scaffolding = worn && (
    <g stroke="#e2b84a" strokeWidth="2" opacity=".95">
      {[120, 160, 200, 240, 280].map((x) => <line key={x} x1={x} y1="90" x2={x} y2="220" />)}
      {[110, 150, 190].map((y) => <line key={y} x1="112" y1={y} x2="288" y2={y} />)}
      <path d="M150 175 l8 -14 l7 12 l8 -10" stroke="#5a4a40" fill="none" strokeWidth="2.5" />
    </g>
  );
  return (
    <g>
      <rect width="400" height="260" fill={`url(#sky-${uid})`} />
      {stars.map(([x, y, s], i) => <circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity=".35" />)}
      {clouds.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="34" ry="9" fill="#fff" opacity=".18" />)}
      <rect y="218" width="400" height="42" fill="#1a1433" opacity=".55" />
      <rect y="214" width="400" height="6" fill={p[1]} opacity=".5" />
      <g transform="translate(-70 -78) scale(1.35)">{body}{scaffolding}</g>
    </g>
  );
}

function Living({ l, uid }) {
  const p = pal(l.cityId); const r = rng(hash(`${l.id}-living`));
  const sofaColor = ['#7a5cf0', '#c15bf0', '#3b7be0', '#d6509a'][hash(l.id) % 4];
  const worn = l.condition === 'to_renovate';
  return (
    <g>
      <rect width="400" height="260" fill="#e9e2f8" />
      <rect y="190" width="400" height="70" fill="#b9a98e" />
      <rect x="40" y="50" width="130" height="110" rx="4" fill={`url(#glass-${uid})`} stroke="#fff" strokeWidth="5" />
      <line x1="105" y1="50" x2="105" y2="160" stroke="#fff" strokeWidth="4" /><line x1="40" y1="105" x2="170" y2="105" stroke="#fff" strokeWidth="4" />
      <rect x="215" y="150" width="150" height="48" rx="12" fill={sofaColor} /><rect x="215" y="124" width="150" height="40" rx="14" fill={sofaColor} opacity=".85" />
      <rect x="236" y="196" width="8" height="12" fill="#3a2b52" /><rect x="336" y="196" width="8" height="12" fill="#3a2b52" />
      <rect x="250" y="206" width="90" height="10" rx="3" fill="#8c7a5a" opacity=".6" />
      <rect x="290" y="40" width="46" height="34" rx="3" fill={p[1]} opacity=".7" />
      <circle cx={190} cy={120} r="12" fill="#ffd86b" opacity=".9" /><rect x="188" y="130" width="4" height="60" fill="#5b4a72" />
      {worn && <path d="M200 60 l14 24 l-8 4 l12 22" stroke="#7a6a5a" strokeWidth="2.5" fill="none" />}
      {r() > 0.5 && <ellipse cx="60" cy="196" rx="22" ry="12" fill="#2e7d4a" />}
    </g>
  );
}

function Kitchen({ l, uid }) {
  const p = pal(l.cityId); const tired = l.condition !== 'good';
  return (
    <g>
      <rect width="400" height="260" fill="#efe9fb" />
      <rect y="190" width="400" height="70" fill="#c9bfa8" />
      <rect x="20" y="40" width="360" height="55" rx="4" fill={tired ? '#8d7f9c' : p[1]} opacity=".9" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={28 + i * 70} y="46" width="62" height="43" rx="3" fill="#fff" opacity=".18" />)}
      <rect x="20" y="130" width="360" height="70" rx="4" fill={tired ? '#6d6280' : p[0]} />
      <rect x="20" y="124" width="360" height="10" rx="3" fill="#e9e2f8" />
      <circle cx="90" cy="118" r="9" fill="#555" /><circle cx="122" cy="118" r="9" fill="#555" />
      <rect x="240" y="106" width="50" height="14" rx="4" fill="#9ab7d8" />
      <path d="M262 106 v-22 h12" stroke="#cfd6e6" strokeWidth="5" fill="none" />
      <circle cx="330" cy="116" r="7" fill="#e8742a" opacity=".85" />
    </g>
  );
}

function Plan({ l }) {
  const rooms = Math.max(1, l.rooms); const w = 300; const h = 170; const cols = Math.min(rooms + 1, 4);
  const names = ['Séjour', 'Chambre', 'Chambre', 'Chambre', 'Chambre'];
  return (
    <g>
      <rect width="400" height="260" fill="#f4f0fc" />
      <g transform="translate(50 30)" stroke="#6d4ff0" strokeWidth="3" fill="#fff">
        <rect width={w} height={h} rx="4" />
        {Array.from({ length: rooms }).map((_, i) => {
          const cw = w / cols; const x = (i % cols) * cw; const y = i < cols ? 0 : h / 2;
          return (
            <g key={i}>
              <rect x={x} y={y} width={cw} height={i < cols ? h / 2 : h / 2} fill={i === 0 ? '#ece6ff' : '#fff'} strokeWidth="2" />
              <text x={x + cw / 2} y={y + h / 4} textAnchor="middle" fontSize="13" fill="#3a2b82" stroke="none" fontWeight="700">{names[i] ?? 'Pièce'}</text>
            </g>
          );
        })}
        <rect x={w - (w / cols)} y={h / 2} width={w / cols} height={h / 2} fill="#e3f0ff" strokeWidth="2" />
        <text x={w - w / (cols * 2)} y={h * 0.78} textAnchor="middle" fontSize="12" fill="#3a2b82" stroke="none" fontWeight="700">Eau</text>
      </g>
      <text x="200" y="240" textAnchor="middle" fontSize="13" fill="#4a3b8a" fontWeight="700">{l.surfaceSqm} m² · {l.rooms} pièce{l.rooms > 1 ? 's' : ''} · plan indicatif</text>
    </g>
  );
}

export const VIEWS = [
  { id: 'facade', label: 'Façade' }, { id: 'living', label: 'Séjour' }, { id: 'kitchen', label: 'Cuisine' }, { id: 'plan', label: 'Plan' },
];

export default function ListingArt({ listing, view = 'facade', alt, className = '', badge = true }) {
  const uid = `${listing.id}-${view}`.replace(/[^a-z0-9-]/gi, '');
  const p = pal(listing.cityId);
  const Scene = { facade: Facade, living: Living, kitchen: Kitchen, plan: Plan }[view] ?? Facade;
  return (
    <svg className={`rp-art ${className}`} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" {...(alt === '' ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': alt ?? `Illustration, vue ${view}` })} focusable="false">
      <Sky id={uid} p={p} night={listing.energyClass === 'G'} />
      <Scene l={listing} uid={uid} />
      <rect x="8" y="8" width="26" height="22" rx="6" fill={DPE_COLORS[listing.energyClass]} opacity=".0" />
    </svg>
  );
}

// Chargement différé : l'illustration n'est dessinée que lorsque la carte approche de l'écran (IntersectionObserver), puis conservée.
// Garde la page légère (56 annonces = 56 dessins) et rapide sur mobile.
export function LazyListingArt(props) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return <div ref={ref} className="rp-art-slot">{seen ? <ListingArt {...props} /> : <div className="rp-art-skel" role="img" aria-label={props.alt ?? 'Illustration en cours de chargement'} />}</div>;
}
