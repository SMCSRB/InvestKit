'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import { AnimatedNumber } from './motion';

const cx = (...a) => a.filter(Boolean).join(' ');

export function Coin({ size = 20 }) {
  return <span className="ik-balance__coin" style={{ width: size, height: size, display: 'inline-block' }} aria-hidden="true" />;
}

export function Card({ as: Tag = 'div', glow, interactive, hero, flat, className, children, ...rest }) {
  return (
    <Tag className={cx('ik-card', glow && 'ik-card--glow', interactive && 'ik-card--interactive', hero && 'ik-card--hero', flat && 'ik-card--flat', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHead({ title, icon, help, actions }) {
  return (
    <div className="ik-card__head">
      <h3 className="ik-card__title">
        {icon && <Icon name={icon} size={18} />}
        {title}
        {help}
      </h3>
      {actions && <div className="ik-card__actions">{actions}</div>}
    </div>
  );
}

// Variation en % ou en valeur : flèche + couleur (jamais la couleur seule).
export function Delta({ value, suffix = '%', digits = 1, className }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <span className={cx('ik-delta', className)}>–</span>;
  const up = value > 0;
  const down = value < 0;
  return (
    <span className={cx('ik-delta', up && 'ik-delta--up', down && 'ik-delta--down', className)}>
      {up && <Icon name="arrowUpRight" size={12} strokeWidth={2.4} />}
      {down && <Icon name="arrowDownRight" size={12} strokeWidth={2.4} />}
      {`${up ? '+' : ''}${value.toFixed(digits).replace('.', ',')}${suffix}`}
      <span className="ik-sr-only">{up ? ' en hausse' : down ? ' en baisse' : ' stable'}</span>
    </span>
  );
}

// Carte de chiffre clé : libellé, valeur animée, variation, lien d'aide optionnel.
export function StatCard({ label, value, format, unit, delta, deltaLabel, icon, help, hero, href, index = 0, children }) {
  const body = (
    <>
      <div className="ik-card__head" style={{ marginBottom: 10 }}>
        <h3 className="ik-card__title" style={hero ? { color: 'rgba(255,255,255,.82)' } : undefined}>
          {icon && <Icon name={icon} size={18} />}
          {label}
          {help}
        </h3>
        {href && <Icon name="arrowUpRight" size={18} />}
      </div>
      <p className="ik-card__value">
        <AnimatedNumber value={value} format={format} />
        {unit && <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>{unit}</span>}
      </p>
      {(delta !== undefined || deltaLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          {delta !== undefined && <Delta value={delta} />}
          {deltaLabel && (
            <span className="ik-muted" style={hero ? { color: 'rgba(255,255,255,.72)' } : undefined}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
      {children}
    </>
  );
  const props = { glow: !hero, hero, interactive: !!href, style: { '--ik-i': index } };
  return href ? (
    <Card as={Link} href={href} {...props} style={{ ...props.style, display: 'block', color: 'inherit', textDecoration: 'none' }}>
      {body}
    </Card>
  ) : (
    <Card {...props}>{body}</Card>
  );
}

export function Button({ variant = 'secondary', size, icon, block, loading, href, children, className, ...rest }) {
  const cls = cx('ik-btn', `ik-btn--${variant}`, size && `ik-btn--${size}`, !children && icon && 'ik-btn--icon', block && 'ik-btn--block', loading && 'is-loading', className);
  const inner = (
    <>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} aria-busy={loading || undefined} {...rest}>
      {inner}
    </button>
  );
}

// Sélecteur de période ou de mode : boutons à état pressé.
export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="ik-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" className="ik-seg__item" aria-pressed={value === o.value} onClick={() => onChange(o.value)} title={o.title}>
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Onglets soulignés avec navigation au clavier (flèches).
export function Tabs({ tabs, value, onChange, ariaLabel }) {
  const onKey = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    e.currentTarget.parentElement.children[next]?.focus();
  };
  return (
    <div className="ik-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t, i) => (
        <button key={t.value} type="button" role="tab" className="ik-tab" aria-selected={value === t.value} tabIndex={value === t.value ? 0 : -1} onClick={() => onChange(t.value)} onKeyDown={(e) => onKey(e, i)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="ik-switch" onClick={() => onChange(!checked)} />;
}

export function Skeleton({ width = '100%', height = 16, style }) {
  return <div className="ik-skeleton" style={{ width, height, ...style }} aria-hidden="true" />;
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="ik-empty">
      <span className="ik-empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// Fenêtre modale : Échap pour fermer, focus piégé et rendu à l'élément d'origine.
export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const root = ref.current;
    const focusables = () => root.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
    (focusables()[0] || root).focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const f = [...focusables()];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="ik-overlay" onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div ref={ref} className="ik-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 'var(--ik-fs-lg)' }}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Fermer" />
        </div>
        {children}
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// Menu déroulant ancré à un bouton : fermeture au clic extérieur et sur Échap.
// Fenêtre flottante sous un bouton. Avec `menu` : vrai menu au clavier (role="menu", flèches haut/bas, Début/Fin, Échap ferme et rend
// le focus au bouton, Tab ferme), le premier élément (role="menuitem") reçoit le focus à l'ouverture. Clic à l'extérieur : ferme.
export function Popover({ trigger, children, align = 'right', width, menu = false, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const closeAndRestore = useCallback(() => { setOpen(false); ref.current?.querySelector('[aria-haspopup]')?.focus(); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && close();
    const onKey = (e) => { if (e.key === 'Escape') (menu ? closeAndRestore : close)(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, closeAndRestore, menu]);
  useEffect(() => {
    if (!open || !menu) return;
    const raf = requestAnimationFrame(() => ref.current?.querySelector('[role="menuitem"]')?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open, menu]);
  const onMenuKey = (e) => {
    const items = [...(ref.current?.querySelectorAll('[role="menuitem"]') ?? [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    const go = (n) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Tab') close();
  };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => setOpen((o) => !o), close })}
      {open && (
        <div className="ik-menu" style={{ top: 'calc(100% + 8px)', [align]: 0, width }} {...(menu ? { role: 'menu', 'aria-label': label, onKeyDown: onMenuKey } : {})}>
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}
