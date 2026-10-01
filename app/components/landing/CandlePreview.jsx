'use client';

import { useMemo, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Segmented } from '@/app/components/ui/primitives';

// Bougies d'EXEMPLE (générées à partir d'une graine fixe, jamais de vrais cours) : aperçu du graphique professionnel du site.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCandles(seed, n) {
  const r = rng(seed);
  let price = 100;
  return Array.from({ length: n }, () => {
    const o = price;
    const c = o + (r() - 0.46) * 9;
    const h = Math.max(o, c) + r() * 5;
    const l = Math.min(o, c) - r() * 5;
    price = c;
    return { o, c, h, l, v: 20 + r() * 80 };
  });
}

const SETS = { '1J': [7, 36], '1S': [21, 30], '1M': [42, 26] };
const W = 640;
const H = 250;
const PAD = { l: 8, r: 56, t: 12, b: 50 };

export default function CandlePreview() {
  const [tf, setTf] = useState('1J');
  const [technical, setTechnical] = useState(true);
  const candles = useMemo(() => makeCandles(SETS[tf][0], SETS[tf][1]), [tf]);
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const iw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;
  const step = iw / candles.length;
  const y = (v) => PAD.t + ph - ((v - lo) / (hi - lo)) * ph;
  const last = candles[candles.length - 1].c;
  const maxV = Math.max(...candles.map((c) => c.v));
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);

  return (
    <div className="lp-candle">
      <div className="lp-candle__tools" aria-hidden="true">
        {['cursor', 'pen', 'text', 'ruler', 'zoom'].map((n) => <span key={n}><Icon name={n} size={17} /></span>)}
      </div>
      <div>
        <div className="lp-candle__bar">
          <Segmented ariaLabel="Période de l'exemple" value={tf} onChange={setTf} options={['1J', '1S', '1M'].map((v) => ({ value: v, label: v }))} />
          <span className="ik-chip ik-chip--soon">Indicateurs</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--ik-fs-xs)', fontWeight: 700, color: 'var(--ik-text-2)' }}>
            Standard
            <button type="button" className="ik-switch" role="switch" aria-checked={technical} aria-label="Graphique technique" onClick={() => setTechnical((t) => !t)} />
            Technique
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Graphique en bougies avec volumes" style={{ display: 'block' }}>
          {ticks.map((t, k) => (
            <g key={k}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--ik-grid)" strokeDasharray="3 5" />
              <text x={W - PAD.r + 8} y={y(t) + 4} fontSize="11" fill="var(--ik-text-3)">{t.toFixed(0)}</text>
            </g>
          ))}
          {technical && candles.map((c, i) => (
            <rect key={`v${tf}${i}`} x={PAD.l + i * step + step * 0.2} y={H - 8 - (c.v / maxV) * 34} width={step * 0.6} height={(c.v / maxV) * 34} rx="2" fill="var(--ik-primary)" opacity="0.35" />
          ))}
          {candles.map((c, i) => {
            const cx = PAD.l + i * step + step / 2;
            const up = c.c >= c.o;
            const color = up ? 'var(--ik-accent)' : 'var(--ik-series-1)';
            return (
              <g key={`${tf}${i}`} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `ik-grow-y var(--ik-dur-slow) var(--ik-ease) ${i * 22}ms both` }}>
                <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1.6" />
                <rect x={cx - step * 0.3} y={y(Math.max(c.o, c.c))} width={step * 0.6} height={Math.max(2, Math.abs(y(c.o) - y(c.c)))} rx="2" fill={up ? color : 'var(--ik-surface-1)'} stroke={color} strokeWidth="1.6" />
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(last)} y2={y(last)} stroke="var(--ik-accent)" strokeDasharray="2 4" />
          <rect x={W - PAD.r + 2} y={y(last) - 10} width="50" height="20" rx="6" fill="var(--ik-primary)" />
          <text x={W - PAD.r + 27} y={y(last) + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{last.toFixed(1)}</text>
        </svg>
      </div>
    </div>
  );
}
