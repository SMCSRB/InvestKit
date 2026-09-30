'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/context/ThemeContext';

// Apparition au défilement. Sans IntersectionObserver ou avec animations coupées : visible tout de suite.
export function Reveal({ children, index = 0, as: Tag = 'div', className = '', style, ...rest }) {
  const ref = useRef(null);
  const { motionEnabled } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!motionEnabled || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motionEnabled]);

  return (
    <Tag
      ref={ref}
      className={`ik-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ '--ik-i': index, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Chiffre qui s'anime vers sa valeur (solde, patrimoine...). Formatage par `format`.
export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('fr-FR'), duration = 900, className = '' }) {
  const { motionEnabled } = useTheme();
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (!Number.isFinite(value)) return undefined;
    if (!motionEnabled) {
      fromRef.current = value;
      setShown(value);
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(from + (value - from) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = value;
    };
  }, [value, motionEnabled, duration]);

  return <span className={`ik-num ${className}`.trim()}>{Number.isFinite(value) ? format(shown) : '–'}</span>;
}

// Pièces qui s'envolent d'un point de départ vers le solde (récompense quotidienne).
export function burstCoins(fromEl, toEl, count = 8) {
  if (typeof document === 'undefined' || !fromEl || !toEl) return;
  if (document.documentElement.getAttribute('data-motion') === 'off') return;
  if (
    document.documentElement.getAttribute('data-motion') !== 'on' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  for (let i = 0; i < count; i += 1) {
    const coin = document.createElement('span');
    coin.className = 'ik-coin-fx';
    coin.style.left = `${a.left + a.width / 2 - 11 + (Math.random() * 30 - 15)}px`;
    coin.style.top = `${a.top + a.height / 2 - 11 + (Math.random() * 20 - 10)}px`;
    coin.style.setProperty('--ik-fly-x', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
    coin.style.setProperty('--ik-fly-y', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
    coin.style.animationDelay = `${i * 70}ms`;
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 1400 + i * 70);
  }
}
