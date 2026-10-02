'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// État d'un simulateur : valeurs par défaut, relues depuis l'adresse (?s=…, lien partageable) et réécrites à chaque changement.
// Rien n'est envoyé au serveur ni enregistré dans le navigateur : le lien contient les chiffres saisis (partage volontaire).
// `allowed` : valeurs permises pour les champs à choix (ex. { envelope: ['pea', 'cto'] }) ; toute autre valeur d'un lien est ignorée.
const encode = (obj) => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch { return ''; } };
const decode = (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; } };

export default function useSimState(defaults, allowed = {}) {
  const [state, setState] = useState(defaults);
  const ready = useRef(false);
  const touched = useRef(false);
  const latest = useRef(defaults);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('s');
    const parsed = s ? decode(s) : null;
    if (parsed && typeof parsed === 'object') {
      const next = { ...defaults };
      for (const k of Object.keys(defaults)) {
        const v = parsed[k];
        if (!(k in parsed) || typeof v !== typeof defaults[k]) continue;
        if (typeof v === 'number' && !Number.isFinite(v)) continue;
        if (allowed[k] && !allowed[k].includes(v)) continue;
        next[k] = v;
      }
      setState(next); latest.current = next;
    }
    ready.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const write = useCallback((st) => { try { window.history.replaceState(null, '', `${window.location.pathname}?s=${encode(st)}`); } catch { /* ignore */ } }, []);
  useEffect(() => {
    latest.current = state;
    if (!ready.current || !touched.current) return undefined;
    const t = setTimeout(() => write(state), 300);
    return () => clearTimeout(t);
  }, [state, write]);
  const set = useCallback((k) => (v) => { touched.current = true; setState((s) => ({ ...s, [k]: v })); }, []);
  const reset = useCallback(() => { touched.current = false; setState(defaults); try { window.history.replaceState(null, '', window.location.pathname); } catch { /* ignore */ } }, [defaults]);
  // Lien à partager : toujours l'état le plus récent, sans attendre l'écriture différée.
  const shareUrl = useCallback(() => `${window.location.origin}${window.location.pathname}?s=${encode(latest.current)}`, []);
  return [state, set, reset, shareUrl];
}
