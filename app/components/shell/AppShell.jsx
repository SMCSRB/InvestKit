'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trackPage } from '@/app/lib/backLink';
import { useTheme } from '@/app/context/ThemeContext';
import CommandPalette from './CommandPalette';
import TiltScope from '@/app/components/landing/TiltScope';
import { ShellDataContext } from './ShellContext';
import Sidebar from './Sidebar';
import TickerBar from './TickerBar';
import Topbar from './Topbar';
import useShellData from './useShellData';

const COLLAPSE_KEY = 'ik-sidebar';

// Suit la requête de l'adresse (?tab=…) pour surligner la bonne entrée du menu. Isolé dans Suspense (exigé par Next.js).
function SearchSync({ onChange }) {
  const s = useSearchParams().toString();
  useEffect(() => onChange(s), [s, onChange]);
  return null;
}

// Coque commune des pages connectées : menu latéral repliable, bandeau de cours, barre supérieure, recherche Ctrl/⌘ + K.
export default function AppShell({ children }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const data = useShellData();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const mainRef = useRef(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'collapsed'); } catch { /* ignore */ }
    document.body.classList.add('ik');
    return () => document.body.classList.remove('ik');
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname, search]);
  // La visite guidée ouvre le menu du téléphone quand elle doit en montrer une entrée.
  useEffect(() => {
    const on = (e) => setMenuOpen(!!e.detail?.open);
    window.addEventListener('ik:tour-menu', on);
    return () => window.removeEventListener('ik:tour-menu', on);
  }, []);
  useEffect(() => { trackPage(pathname); }, [pathname]);   // mémorise la page précédente (lien « retour » de la Banque)

  // Hauteur réelle de la barre du haut + bande de cours (toutes deux collées en haut de l'écran) : publiée dans --ik-sticky-offset.
  // Elle sert aux ancres (scroll-padding) et aux éléments collants de page, pour que rien ne passe SOUS ces barres.
  useEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      const top = document.querySelector('.ik-topbar');
      const tick = document.querySelector('.ik-ticker');
      const h = (top?.offsetHeight ?? 0) + (tick?.offsetHeight ?? 0);
      root.style.setProperty('--ik-sticky-offset', `${h}px`);
      root.style.setProperty('--ik-topbar-real', `${top?.offsetHeight ?? 0}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const watch = () => { ro.disconnect(); ['.ik-topbar', '.ik-ticker'].forEach((s) => { const el = document.querySelector(s); if (el) ro.observe(el); }); measure(); };
    watch();
    const mo = new MutationObserver(watch);                       // la bande apparaît quand ses cours sont chargés (ou quand on la masque)
    const host = document.querySelector('.ik-main');
    if (host) mo.observe(host, { childList: true });
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', measure); root.style.removeProperty('--ik-sticky-offset'); root.style.removeProperty('--ik-topbar-real'); };
  }, []);

  // Menu mobile : Échap le ferme ; à l'ouverture le focus va sur son bouton de fermeture, à la fermeture il revient au bouton d'ouverture.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    document.querySelector('#ik-sidebar button[aria-label="Fermer le menu"]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.querySelector('button[aria-controls="ik-sidebar"]')?.focus();
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? 'expanded' : 'collapsed'); } catch { /* ignore */ }
      return !c;
    });
  }, []);

  const actions = useMemo(() => [
    { label: theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre', icon: theme === 'dark' ? 'sun' : 'moon', run: toggleTheme },
    { label: 'Récompense quotidienne', icon: 'gift', run: () => router.push('/banque'), hint: 'Banque' },
  ], [theme, toggleTheme, router]);

  return (
    <ShellDataContext.Provider value={data}>
    <div className="ik-app" data-collapsed={collapsed} data-open={menuOpen}>
      <a href="#ik-main" className="ik-skip-link">Aller au contenu</a>
      <Suspense fallback={null}><SearchSync onChange={setSearch} /></Suspense>
      <TiltScope />
      <Sidebar
        pathname={pathname}
        search={search}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        onNavigate={() => setMenuOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        isAdmin={data.isAdmin}
        showUpgrade={!!data.user && !data.user.hasProAccess}
      />
      <div className="ik-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <div className="ik-main">
        <Topbar data={data} theme={theme} onToggleTheme={toggleTheme} onOpenSearch={() => setSearchOpen(true)} onOpenMenu={() => setMenuOpen(true)} />
        <TickerBar />
        <main id="ik-main" ref={mainRef} className="ik-content ik-page-enter" key={pathname}>
          {children}
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} actions={actions} />
    </div>
    </ShellDataContext.Provider>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="ik-pagehead">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ik-pagehead__actions">{actions}</div>}
    </div>
  );
}
