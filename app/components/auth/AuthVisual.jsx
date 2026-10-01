'use client';

import { useEffect, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Coin } from '@/app/components/ui/primitives';
import { AnimatedNumber } from '@/app/components/ui/motion';
import { AVAILABLE_DOMAINS, STARTING_COINS } from '@/app/lib/siteFacts';

// Panneau de gauche (ordinateur) : accroche, mini graphique qui se trace, compteur d'InvestCoins et cartes qui défilent doucement.
// Tout est illustratif et le dit : aucun cours réel ni promesse de gain n'est affiché.
const CARDS = [
  ...AVAILABLE_DOMAINS.map((d) => ({ icon: d.icon, title: d.name, text: d.sub })),
  { icon: 'bookOpen', title: 'Cours et quiz', text: 'Chaque notion expliquée avant que tu t’en serves.' },
];
const LINE = 'M0,100 C30,96 45,84 70,88 S110,64 140,70 S185,44 215,50 S262,22 290,28 S312,14 320,10';

export default function AuthVisual() {
  const [coins, setCoins] = useState(0);
  useEffect(() => { const t = setTimeout(() => setCoins(STARTING_COINS), 500); return () => clearTimeout(t); }, []);
  return (
    <aside className="au-visual" aria-label="Présentation d’InvestKit">
      <p className="au-eyebrow">Simulateur d’investissement</p>
      <h2>Apprends à investir, <em>sans risquer un euro.</em></h2>
      <p className="au-visual__lead">Bourse, crypto, immobilier : joue avec des InvestCoins, teste tes idées et comprends avant de te lancer pour de vrai.</p>

      <div className="au-chart" aria-hidden="true">
        <svg viewBox="0 0 320 110" preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id="au-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ik-accent)" stopOpacity=".38" />
              <stop offset="1" stopColor="var(--ik-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="au-chart__area" d={`${LINE} L320,110 L0,110 Z`} />
          <path className="au-chart__line" d={LINE} />
          <circle className="au-chart__dot" cx="320" cy="10" r="4" />
        </svg>
        <div className="au-chart__cap"><span>Exemple illustratif</span><span>pas un cours réel</span></div>
      </div>

      <div className="au-coins">
        <Coin size={34} />
        <div>
          <strong><AnimatedNumber value={coins} duration={1600} /></strong>{' '}InvestCoins
          <div className="ik-muted" style={{ fontSize: 'var(--ik-fs-sm)' }}>offerts pour démarrer, une monnaie de jeu sans valeur réelle</div>
        </div>
      </div>

      <div className="au-cards">
        {CARDS.map((c, i) => (
          <div className="au-fcard" key={c.title} style={{ '--i': i }}>
            <span className="au-fcard__ico"><Icon name={c.icon} size={22} /></span>
            <div><strong>{c.title}</strong><span>{c.text}</span></div>
          </div>
        ))}
      </div>
    </aside>
  );
}
