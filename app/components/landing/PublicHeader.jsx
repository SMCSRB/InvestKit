'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/app/components/ui/Logo';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';
import { endSession } from '@/app/lib/session';
import useVisitor from './useVisitor';

export const PUBLIC_NAV = [
  { href: '/#domaines', label: 'Domaines' },
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#education', label: 'Éducation' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/#faq', label: 'FAQ' },
];

// En-tête des pages publiques : navigation, bascule sombre/clair, connexion et invitation (ou accès au compte si connecté).
export default function PublicHeader() {
  const { theme, toggleTheme } = useTheme();
  const { loggedIn, ctaLabel } = useVisitor();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logout = async () => { await endSession(); router.push('/'); router.refresh(); };

  const actions = loggedIn ? (
    <>
      <Button variant="ghost" size="sm" onClick={logout} className="lp-hide-mobile">Se déconnecter</Button>
      <Button variant="primary" size="sm" href="/dashboard">Mon tableau de bord</Button>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" href="/login" className="lp-hide-mobile">Se connecter</Button>
      <Button variant="primary" size="sm" href="/signup" className="lp-hide-mobile">{ctaLabel}</Button>
    </>
  );

  return (
    <div className="lp-header" role="banner">
      <div className="lp-wrap">
        <div className="lp-header__row">
          <Link href="/" className="lp-logo" aria-label="InvestKit, accueil"><Logo size={36} /></Link>
          <nav className="lp-nav" aria-label="Sections de la page">
            {PUBLIC_NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
          <div className="lp-header__actions">
            <Button variant="ghost" size="sm" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'} />
            {actions}
            <Button variant="ghost" size="sm" icon={open ? 'x' : 'menu'} className="lp-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="lp-mobile" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} />
          </div>
        </div>
        {open && (
          <div className="lp-mobile" id="lp-mobile">
            {PUBLIC_NAV.map((n) => <a key={n.href} href={n.href} className="lp-mobile__link" onClick={() => setOpen(false)}>{n.label}</a>)}
            {loggedIn ? (
              <>
                <Button variant="primary" href="/dashboard" block>Mon tableau de bord</Button>
                <Button variant="ghost" block onClick={logout}>Se déconnecter</Button>
              </>
            ) : (
              <>
                <Button variant="primary" href="/signup" block>{ctaLabel}</Button>
                <Button variant="secondary" href="/login" block><Icon name="user" size={18} />Se connecter</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
