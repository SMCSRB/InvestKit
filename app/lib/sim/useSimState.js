'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// État d'un simulateur : valeurs par défaut, relues depuis l'adresse (?s=…, lien partageable) et réécrites à chaque changement.
// Rien n'est envoyé au serveur ni enregistré dans le navigateur : le lien contient les chiffres saisis (partage volontaire).
const encode = (obj) => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch { return ''; } };
const decode = (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; } };

export default function useSimState(defaults) {
  const [state, setState] = useState(defaults);
  const ready = useRef(false);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('s');
    const parsed = s ? decode(s) : null;
    if (parsed && typeof parsed === 'object') {
      const next = { ...defaults };
      for (const k of Object.keys(defaults)) if (k in parsed && typeof parsed[k] === typeof defaults[k]) next[k] = parsed[k];
      setState(next);
    }
    ready.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready.current) return undefined;
    const t = setTimeout(() => { try { window.history.replaceState(null, '', `${window.location.pathname}?s=${encode(state)}`); } catch { /* ignore */ } }, 400);
    return () => clearTimeout(t);
  }, [state]);
  const set = useCallback((k) => (v) => setState((s) => ({ ...s, [k]: v })), []);
  const reset = useCallback(() => setState(defaults), [defaults]);
  return [state, set, reset];
}
