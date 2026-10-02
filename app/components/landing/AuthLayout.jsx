'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/app/components/ui/Logo';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';
import AuthScene from '@/app/components/auth/AuthScene';
import AuthVisual from '@/app/components/auth/AuthVisual';

// Mise en page des écrans de compte : en-tête minimal (logo + retour, jamais collant ni au-dessus du formulaire), fond animé,
// panneau visuel à gauche sur ordinateur, formulaire dans une carte à droite. Sur mobile : formulaire seul sur fond allégé.
export function useAuthMotion() {
  const { motionEnabled } = useTheme();
  const [paused, setPaused] = useState(false);
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    // Appareil modeste : peu de mémoire ou peu de cœurs, ou économiseur de données → fond allégé.
    const nav = navigator;
    setLite((nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || !!nav.connection?.saveData);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  return { animated: motionEnabled, paused, lite };
}

export function AuthFrame({ children, minimal = false, footer = true, mode = 'signup' }) {
  const { theme, toggleTheme } = useTheme();
  const { animated, paused, lite } = useAuthMotion();
  return (
    <div className="au" data-anim={animated ? 'on' : 'off'} data-paused={paused ? 'true' : 'false'} data-lite={lite ? 'true' : 'false'}>
      <AuthScene lite={lite} animated={animated} />
      <a href="#au-main" className="ik-skip-link">Aller au contenu</a>
      <header className="au-top">
        <Link href="/" aria-label="InvestKit, accueil"><Logo size={34} /></Link>
        <div className="au-top__right">
          <Link href="/" className="au-back"><Icon name="chevronLeft" size={16} />Accueil</Link>
          <Button variant="ghost" size="sm" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'} />
        </div>
      </header>
      <main id="au-main" className="au-main">
        {minimal ? null : <AuthVisual mode={mode} />}
        {children}
      </main>
      {footer && (
        <footer className="au-foot">
          <Link href="/conditions">Conditions</Link> · <Link href="/privacy">Confidentialité</Link> · <Link href="/contact">Contact</Link>
        </footer>
      )}
    </div>
  );
}

export default function AuthLayout({ children, mode }) {
  return (
    <AuthFrame mode={mode}>
      <div className="au-card-wrap"><div className="au-card">{children}</div></div>
    </AuthFrame>
  );
}

export function AuthHeader({ title, subtitle, icon }) {
  return (
    <div className="au-head">
      {icon}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export const AuthBadge = ({ name }) => <div className="au-badge"><Icon name={name} size={28} /></div>;
