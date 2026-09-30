'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isThemedPath, MOTION_KEY, THEME_KEY } from '@/app/lib/designRoutes';

const ThemeContext = createContext(null);

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : le réglage vaut pour la session seulement */
  }
};

export function ThemeProvider({ children }) {
  const pathname = usePathname() || '/';
  const [theme, setThemeState] = useState('dark');
  const [motion, setMotionState] = useState('auto'); // auto = suit le système ; on ; off
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    const t = read(THEME_KEY, 'dark');
    setThemeState(t === 'light' ? 'light' : 'dark');
    const m = read(MOTION_KEY, 'auto');
    setMotionState(m === 'on' || m === 'off' ? m : 'auto');
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const onChange = (e) => setSystemReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const themed = isThemedPath(pathname);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themed ? theme : 'dark');
  }, [theme, themed]);

  useEffect(() => {
    const d = document.documentElement;
    if (motion === 'auto') d.removeAttribute('data-motion');
    else d.setAttribute('data-motion', motion);
  }, [motion]);

  const setTheme = useCallback((t) => {
    const v = t === 'light' ? 'light' : 'dark';
    setThemeState(v);
    write(THEME_KEY, v);
  }, []);
  const setMotion = useCallback((m) => {
    const v = m === 'on' || m === 'off' ? m : 'auto';
    setMotionState(v);
    write(MOTION_KEY, v);
  }, []);

  const value = useMemo(
    () => ({
      theme: themed ? theme : 'dark',
      themed,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      motion,
      setMotion,
      motionEnabled: motion === 'off' ? false : motion === 'on' ? true : !systemReduced,
    }),
    [theme, themed, motion, systemReduced, setTheme, setMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return ctx;
}
