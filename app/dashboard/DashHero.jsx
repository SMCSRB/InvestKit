'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/app/components/ui/Icon';
import { Coin3D } from '@/app/components/landing/Stage3D';
import { AnimatedNumber, Reveal, burstCoins } from '@/app/components/ui/motion';
import { useTheme } from '@/app/context/ThemeContext';
import { useShell } from '@/app/components/shell/ShellContext';
import PlanBadge from '@/app/components/plan/PlanBadge';
import { planLine } from '@/app/lib/plan';
import Coin from '@/app/components/ui/Coin';

const greeting = () => {
  const h = new Date().getHours();
  return h < 6 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};

const ACTIONS = [
  { href: '/dashboard?tab=trading', icon: 'chart', title: 'Bourse et PEA', hint: 'Simule des achats' },
  { href: '/crypto', icon: 'candles', title: 'Crypto', hint: 'Marché' },
  { href: '/immobilier', icon: 'building', title: 'Immobilier', hint: 'Achète, loue, revends' },
  { href: '/education', icon: 'book', title: 'Apprendre', hint: 'Cours et quiz' },
];

// Accueil vivant du tableau de bord : salutation, série de jours, scène 3D qui suit le curseur (parallaxe en profondeur),
// raccourcis en grandes cartes. Tout est réel (nom, série, patrimoine) ; mouvement coupé par « Animations : Non ».
export default function DashHero({ username, patrimoine, loading }) {
  const ref = useRef(null);
  const { motionEnabled } = useTheme();
  const shell = useShell();
  const wallet = shell?.wallet ?? null;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [hello, setHello] = useState('Bonjour');

  useEffect(() => { setHello(greeting()); }, []);

  // Parallaxe : la souris décale chaque couche selon sa profondeur (--px / --py entre -1 et 1). Uniquement transform.
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionEnabled || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let raf = 0; let px = 0; let py = 0;
    const paint = () => { raf = 0; el.style.setProperty('--px', px.toFixed(3)); el.style.setProperty('--py', py.toFixed(3)); };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2; py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const leave = () => { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(paint); };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); if (raf) cancelAnimationFrame(raf); };
  }, [motionEnabled]);

  const streak = wallet?.dailyStreak ?? 0;
  const ready = !!wallet?.canClaimToday;
  // Même action que le bouton cadeau de la barre du haut (même fonction du serveur, mêmes données partagées)
  const chipRef = useRef(null);
  const claim = async () => {
    if (!shell || busy) return;
    setBusy(true); setMsg('');
    try {
      const r = await shell.claimDaily();
      if (motionEnabled) burstCoins(chipRef.current, document.querySelector('.ik-balance'));
      setMsg(`+${r.reward} InvestCoins ! Série : ${r.newStreak} jour${r.newStreak > 1 ? 's' : ''}.`);
    } catch (e) {
      setMsg(e.message || 'Récompense indisponible pour le moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Reveal>
        <section ref={ref} className="dh" aria-label="Accueil du tableau de bord">
          <div className="dh__copy">
            <p className="dh__eyebrow">{hello}{username ? ',' : ''}</p>
            <h2 className="dh__title">{username || 'Investisseur'}<PlanBadge plan={shell?.user?.plan} /></h2>
            {shell?.user?.plan?.isPro && <p className="dh__plan" data-testid="plan-line">{planLine(shell.user.plan)}</p>}
            <p className="dh__sub">Voici où en est ton parcours. Choisis une action pour continuer.</p>
            <div className="dh__chips">
              {streak > 0 && <span className="dh__chip dh__chip--flame"><Icon name="flame" size={16} /> Série de {streak} jour{streak > 1 ? 's' : ''}</span>}
              {ready && <button ref={chipRef} type="button" className="dh__chip dh__chip--claim" onClick={claim} disabled={busy}><Icon name="gift" size={16} /> Récupérer ma récompense du jour</button>}
              {msg && <span className="dh__chip" role="status">{msg}</span>}
            </div>
          </div>
          <div className="dh__scene" aria-hidden="true">
            <span className="dh__orb dh__orb--a" style={{ '--d': 0.5 }} />
            <span className="dh__orb dh__orb--b" style={{ '--d': 1.2 }} />
            <div className="dh__layer dh__layer--coin" style={{ '--d': 1 }}><div className="dh__float"><Coin3D size={104} /></div></div>
            <div className="dh__layer dh__layer--mini1" style={{ '--d': 1.7 }}><div className="dh__float dh__float--slow"><Coin3D size={40} /></div></div>
            <div className="dh__layer dh__layer--mini2" style={{ '--d': 0.8 }}><div className="dh__float dh__float--slower"><Coin3D size={28} /></div></div>
            {!loading && Number.isFinite(patrimoine) && (
              <div className="dh__layer dh__layer--glass" style={{ '--d': 2.2 }}>
                <div className="dh__glass">
                  <span>Patrimoine</span>
                  <strong className="ik-num"><AnimatedNumber value={patrimoine} /> <Coin /></strong>
                </div>
              </div>
            )}
          </div>
        </section>
      </Reveal>

      <nav className="dh-actions" aria-label="Que veux-tu faire ?">
        {ACTIONS.map((a, i) => (
          <Reveal key={a.href} index={i} data-tilt="">
            <Link href={a.href} className="dh-action">
              <span className="dh-action__icon"><Icon name={a.icon} size={26} /></span>
              <span className="dh-action__txt"><strong>{a.title}</strong><span>{a.hint}</span></span>
              <Icon name="arrowUpRight" size={18} className="dh-action__go" />
            </Link>
          </Reveal>
        ))}
      </nav>
    </>
  );
}
