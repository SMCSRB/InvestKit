'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MOTION_KEY, THEME_KEY } from '@/app/lib/designRoutes';

const ThemeContext = createContext(null);
const TICKER_KEY = 'ik-ticker';

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
  const [theme, setThemeState] = useState('dark');
  const [motion, setMotionState] = useState('auto'); // auto = suit le système ; on ; off
  const [systemReduced, setSystemReduced] = useState(false);
  const [ticker, setTickerState] = useState('on'); // bande de cours : on | off
  const [ready, setReady] = useState(false); // vrai une fois les réglages lus : avant, on ne touche pas aux attributs posés par le script d'initialisation

  useEffect(() => {
    const t = read(THEME_KEY, 'dark');
    setThemeState(t === 'light' ? 'light' : 'dark');
    const m = read(MOTION_KEY, 'auto');
    setMotionState(m === 'on' || m === 'off' ? m : 'auto');
    setTickerState(read(TICKER_KEY, 'on') === 'off' ? 'off' : 'on');
    setReady(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduced(mq.matches);
    const onChange = (e) => setSystemReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    const d = document.documentElement;
    if (motion === 'auto') d.removeAttribute('data-motion');
    else d.setAttribute('data-motion', motion);
  }, [motion, ready]);

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

  const setTicker = useCallback((v) => {
    const t = v === 'off' ? 'off' : 'on';
    setTickerState(t);
    write(TICKER_KEY, t);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      motion,
      setMotion,
      motionEnabled: motion === 'off' ? false : motion === 'on' ? true : !systemReduced,
      ticker,
      setTicker,
      tickerVisible: ticker !== 'off',
    }),
    [theme, motion, systemReduced, ticker, setTheme, setMotion, setTicker]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return ctx;
}
