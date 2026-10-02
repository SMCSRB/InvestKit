'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Coin } from '@/app/components/ui/primitives';
import { AnimatedNumber } from '@/app/components/ui/motion';
import { STARTING_COINS } from '@/app/lib/siteFacts';

// Scène de gauche : cartes 3D flottantes qui suivent légèrement la souris (graphique en bougies qui se dessine, pièce qui tourne,
// anneau de parcours, notification de succès). TOUT est illustratif et le dit : aucun cours réel, aucune promesse de gain.
// Les bougies viennent d'un générateur à graine fixe (même rendu serveur et navigateur, aucune donnée de marché).
const DOMAINS = ['Bourse', 'Crypto', 'Immobilier'];

const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function makeCandles(n) {
  const rnd = seeded(7);
  let price = 38;
  return Array.from({ length: n }, (_, i) => {
    const open = price;
    price = Math.min(88, Math.max(14, price + (rnd() - 0.38) * 14 + 1.1));
    const close = price;
    const hi = Math.max(open, close) + rnd() * 7;
    const lo = Math.min(open, close) - rnd() * 7;
    return { i, up: close >= open, wl: Math.max(0, lo), wh: hi - Math.max(0, lo), bl: Math.min(open, close), bh: Math.max(3, Math.abs(close - open)), close };
  });
}

export default function AuthVisual({ mode = 'signup' }) {
  const [coins, setCoins] = useState(0);
  const candles = useMemo(() => makeCandles(22), []);
  useEffect(() => { const t = setTimeout(() => setCoins(STARTING_COINS), 600); return () => clearTimeout(t); }, []);
  const trend = candles.map((c, i) => `${i ? 'L' : 'M'}${((i + 0.5) / candles.length) * 100},${100 - c.close}`).join(' ');
  const login = mode === 'login';

  return (
    <aside className="au-visual" aria-label="Présentation d’InvestKit">
      <div className="au-visual__text">
        <p className="au-eyebrow">{login ? 'Content de te revoir' : 'Simulateur d’investissement'}</p>
        <h2>
          {login ? 'Ton portefeuille de' : 'Apprends la'}
          <span className="au-words" aria-hidden="true">{DOMAINS.map((d, i) => <span key={d} style={{ '--i': i }}>{d}</span>)}</span>
          <span className="ik-sr-only">{DOMAINS.join(', ')}</span>
          {login ? <em>t’attend.</em> : <em>sans risquer un euro.</em>}
        </h2>
        <p className="au-visual__lead">{login ? 'Reprends où tu t’étais arrêté : tes positions, tes cours et ton classement.' : 'Joue avec des InvestCoins, teste tes idées et comprends avant de te lancer pour de vrai.'}</p>
      </div>

      <div className="au-stage" aria-hidden="true">
        <div className="au-stage__rings"><i /><i /></div>
        <div className="au-stage__scene">
          <div className="au-pos au-pos--chart"><div className="au-bob" style={{ '--t': '8s' }}>
            <div className="au-glass au-chartcard">
              <div className="au-chartcard__head"><span>Portefeuille</span><span>▲ tendance</span></div>
              <div className="au-candles">
                {candles.map((c) => <i key={c.i} className={c.up ? 'up' : 'dn'} style={{ '--i': c.i, '--wl': `${c.wl}%`, '--wh': `${c.wh}%`, '--bl': `${c.bl}%`, '--bh': `${c.bh}%` }} />)}
                <svg className="au-trend" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path d={trend} /></svg>
              </div>
              <div className="au-chartcard__cap"><span>8 derniers mois</span></div>
            </div>
          </div></div>

          <div className="au-pos au-pos--coins"><div className="au-bob" style={{ '--t': '6s', '--dl': '-1s' }}>
            <div className="au-glass au-coincard">
              <span className="au-coin3d"><Coin size={40} /></span>
              <div><strong><AnimatedNumber value={coins} duration={1800} /></strong><span>InvestCoins offerts, monnaie de jeu</span></div>
            </div>
          </div></div>

          <div className="au-pos au-pos--ring"><div className="au-bob" style={{ '--t': '7s', '--dl': '-3s' }}>
            <div className="au-glass au-ringcard">
              <svg className="au-ring" viewBox="0 0 46 46" focusable="false"><circle cx="23" cy="23" r="18" /><circle cx="23" cy="23" r="18" /></svg>
              <div><strong>Parcours d’éducation</strong><span>Cours et quiz, pas à pas</span></div>
            </div>
          </div></div>

          <div className="au-pos au-pos--toast"><div className="au-bob" style={{ '--t': '9s', '--dl': '-4s' }}>
            <div className="au-glass au-toast"><Icon name="check" size={18} strokeWidth={2.6} />Chapitre terminé : récompense reçue</div>
          </div></div>
          <div className="au-chips">
            <span className="au-chip3" style={{ '--x': '2%', '--y': '2%', '--t': '5s' }}>Bourse</span>
            <span className="au-chip3" style={{ '--x': '40%', '--y': '-6%', '--t': '6.5s', '--dl': '-2s' }}>Crypto</span>
            <span className="au-chip3" style={{ '--x': '80%', '--y': '82%', '--t': '5.5s', '--dl': '-1s' }}>Immobilier</span>
          </div>

        </div>
      </div>
    </aside>
  );
}
