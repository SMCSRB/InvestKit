'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import Logo, { LogoMark } from '@/app/components/ui/Logo';
import { Button, Switch } from '@/app/components/ui/primitives';
import { NAV_BOTTOM, NAV_MAIN, isActive } from './nav';

function Item({ item, pathname, collapsed, onNavigate }) {
  const active = isActive(pathname, item.href);
  const props = {
    className: 'ik-navitem',
    'aria-current': active ? 'page' : undefined,
    title: collapsed ? item.label : undefined,
    onClick: onNavigate,
  };
  const inner = (
    <>
      <Icon name={item.icon} />
      <span className="ik-sidebar__text">{item.label}</span>
      {item.external && <Icon name="external" size={14} className="ik-sidebar__text" />}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" {...props}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} {...props}>
      {inner}
    </Link>
  );
}

export default function Sidebar({ pathname, collapsed, onToggle, onNavigate, theme, onToggleTheme, isAdmin, showUpgrade }) {
  const [open, setOpen] = useState(true);
  const bottom = isAdmin ? [...NAV_BOTTOM.slice(0, 1), { id: 'admin', label: 'Administration', href: '/admin', icon: 'shield' }, ...NAV_BOTTOM.slice(1)] : NAV_BOTTOM;
  return (
    <aside className="ik-sidebar" id="ik-sidebar" aria-label="Navigation principale">
      <div className="ik-sidebar__top">
        <Link href="/dashboard" className="ik-sidebar__logo" aria-label="InvestKit, tableau de bord">
          {collapsed ? <LogoMark size={36} /> : <Logo size={36} />}
        </Link>
        <Button variant="ghost" size="sm" icon={collapsed ? 'chevronsRight' : 'chevronsLeft'} onClick={onToggle} aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'} className="ik-desktop-only" />
        <Button variant="ghost" size="sm" icon="x" onClick={onNavigate} aria-label="Fermer le menu" className="ik-mobile-only" />
      </div>

      <nav className="ik-nav ik-scroll" aria-label="Menu">
        {NAV_MAIN.map((item) => {
          if (!item.children) return <Item key={item.id} item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />;
          if (collapsed) return item.children.map((c) => <Item key={c.id} item={c} pathname={pathname} collapsed onNavigate={onNavigate} />);
          const anyActive = item.children.some((c) => isActive(pathname, c.href));
          return (
            <div key={item.id}>
              <button type="button" className="ik-navitem" aria-expanded={open || anyActive} aria-controls={`sub-${item.id}`} onClick={() => setOpen((o) => !o)}>
                <Icon name={item.icon} />
                <span className="ik-sidebar__text">{item.label}</span>
                <Icon name="chevronDown" size={16} className="ik-navitem__chev" />
              </button>
              {(open || anyActive) && (
                <div className="ik-navsub" id={`sub-${item.id}`}>
                  {item.children.map((c) => (
                    <Item key={c.id} item={c} pathname={pathname} collapsed={false} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {showUpgrade && (
        <div className="ik-upgrade">
          <span className="ik-upgrade__icon">
            <Icon name="crown" size={22} />
          </span>
          <h4>Passer Pro</h4>
          <p>Tous les domaines et le portefeuille global.</p>
          <Button href="/dashboard?tab=settings" variant="secondary" size="sm" onClick={onNavigate}>
            Voir l&apos;offre
          </Button>
        </div>
      )}

      <div className="ik-sidebar__foot">
        {bottom.map((item) => (
          <Item key={item.id} item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        <div className="ik-themerow">
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
          <span>{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</span>
          <Switch checked={theme === 'dark'} onChange={onToggleTheme} label="Mode sombre" />
        </div>
      </div>
    </aside>
  );
}
