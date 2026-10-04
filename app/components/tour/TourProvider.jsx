'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isLoggedIn } from '@/app/lib/session';
import { MAIN_TOUR, PAGE_TOURS, TOUR_EVENT_MENU, TOUR_EVENT_OPEN, SECTIONS, stepsOf, pageTourFor } from '@/app/lib/tour/steps';
import { MOBILE_MAX, pathMatches, progressOf, resolveTarget, resumeIndex, shouldInvite, stepIndexFrom } from '@/app/lib/tour/engine';
import TourOverlay from './TourOverlay';
import TourLauncher from './TourLauncher';
import TourInvite from './TourInvite';

const API = process.env.NEXT_PUBLIC_API_URL;
const NO_TOUR = ['/', '/guide', '/login', '/signup', '/admin', '/onboarding', '/verify-email', '/forgot-password', '/reset-password'];
const RESOLVE_TIMEOUT = 4000;     // un élément introuvable ne bloque jamais la visite : l'étape est sautée
const SAVE_DELAY = 2500;          // les écritures serveur sont regroupées (limite de requêtes de l'API)

const TourContext = createContext(null);
export const useTour = () => useContext(TourContext);

const request = async (path, method = 'GET', body) => {
  const res = await fetch(`${API}/guide${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

const reducedMotion = () => {
  try { return document.documentElement.dataset.motion === 'off' || (document.documentElement.dataset.motion !== 'on' && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
};

const isVisible = (n) => {
  const r = n.getBoundingClientRect();
  if (!(r.width > 1 && r.height > 1)) return false;
  if (r.right <= 0 || r.left >= window.innerWidth) return false;     // hors écran sur le côté (menu du téléphone fermé)
  const cs = window.getComputedStyle(n);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
};

const queryAll = (sel) => Array.from(document.querySelectorAll(sel));

export default function TourProvider({ children }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [state, setState] = useState(null);                       // { tours, seen } venu du serveur
  const [run, setRun] = useState(null);                           // { tour, index, dir }
  const [skipped, setSkipped] = useState(() => new Set());
  const [el, setEl] = useState(null);
  const [done, setDone] = useState(false);
  const [resolveKey, setResolveKey] = useState(0);
  const [panel, setPanel] = useState(false);
  const [invite, setInvite] = useState(null);
  const stateRef = useRef(null);
  const pending = useRef({ patch: null, seen: new Set(), timer: null });
  const navTries = useRef({});
  const preparedRef = useRef(false);

  const steps = useMemo(() => (run ? stepsOf(run.tour) : []), [run?.tour]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = run ? steps[run.index] ?? null : null;

  // ── État serveur ────────────────────────────────────────────────────────────
  const flush = useCallback(() => {
    const p = pending.current;
    if (p.timer) { clearTimeout(p.timer); p.timer = null; }
    if (!p.patch && p.seen.size === 0) return;
    const body = { ...(p.patch || {}), ...(p.seen.size ? { seen: [...p.seen] } : {}) };
    p.patch = null; p.seen = new Set();
    request('', 'PUT', body).catch(() => { /* l'état local reste juste ; au pire on reproposera la visite */ });
  }, []);

  const save = useCallback((patch, seen = [], now = false) => {
    const cur = stateRef.current;
    if (cur) {
      const next = { tours: { ...cur.tours }, seen: [...new Set([...cur.seen, ...seen])] };
      if (patch?.tour) {
        const t = next.tours[patch.tour] || { status: 'new', step: null };
        const status = patch.status ?? t.status;
        next.tours[patch.tour] = { status, step: ['done', 'new', 'dismissed'].includes(status) ? null : (patch.step !== undefined ? patch.step : t.step) };
      }
      stateRef.current = next; setState(next);
    }
    const p = pending.current;
    if (patch?.tour) p.patch = p.patch && p.patch.tour === patch.tour ? { ...p.patch, ...patch } : patch;
    seen.forEach((s) => p.seen.add(s));
    if (now) flush(); else if (!p.timer) p.timer = setTimeout(flush, SAVE_DELAY);
  }, [flush]);

  useEffect(() => {
    if (!API || !isLoggedIn() || stateRef.current) return;
    if (NO_TOUR.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)))) return;
    let off = false;
    request('').then((s) => { if (!off) { stateRef.current = s; setState(s); } }).catch(() => {});
    return () => { off = true; };
  }, [pathname]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', flush); };
  }, [flush]);

  // ── Lancement, arrêt, reprise ───────────────────────────────────────────────
  const open = useCallback((tour, { restart = false } = {}) => {
    const list = stepsOf(tour);
    if (!list.length) return;
    const t = stateRef.current?.tours?.[tour];
    const index = !restart && t && (t.status === 'paused' || t.status === 'running') ? resumeIndex(list, t.step) : 0;
    navTries.current = {}; preparedRef.current = false;
    setSkipped(new Set()); setDone(false); setEl(null); setInvite(null); setPanel(false);
    setRun({ tour, index, dir: 1 });
    save({ tour, status: 'running', step: list[index].id });
  }, [save]);

  const pause = useCallback(() => {
    if (!run) return;
    save({ tour: run.tour, status: 'paused', step: step?.id ?? null }, [], true);
    setRun(null); setEl(null);
  }, [run, step, save]);

  const finish = useCallback((status) => {
    if (!run) return;
    const seenNow = status === 'done' ? (run.tour === MAIN_TOUR ? SECTIONS.map((s) => s.id) : [PAGE_TOURS[run.tour] ? run.tour : step?.section].filter(Boolean)) : [];
    save({ tour: run.tour, status }, seenNow, true);
    setRun(null); setEl(null);
  }, [run, step, save]);

  const reset = useCallback(async (scope = 'all') => {
    flush();
    try { const s = await request('/reset', 'POST', { scope }); stateRef.current = s; setState(s); } catch { /* ignoré */ }
  }, [flush]);

  const goStep = useCallback((dir) => {
    if (!run) return;
    const avoid = new Set(skipped);
    if (dir < 0) steps.forEach((s) => { if (s.kind === 'travel') avoid.add(s.id); });
    const next = stepIndexFrom(steps, run.index, dir, avoid);
    if (next === null) { if (dir > 0) finish('done'); return; }
    const target = steps[next];
    const passed = dir > 0 && step && step.kind !== 'travel' && target.section !== step.section ? [step.section] : [];
    navTries.current = {}; preparedRef.current = false;
    setDone(false); setEl(null);
    setRun({ ...run, index: next, dir });
    save({ tour: run.tour, status: 'running', step: target.id }, passed.filter((s) => run.tour === MAIN_TOUR || s === run.tour));
  }, [run, steps, step, skipped, finish, save]);

  const skipMissing = useCallback(() => {
    if (!step) return;
    setSkipped((s) => new Set(s).add(step.id));
    goStep(run.dir);
  }, [step, run, goStep]);

  // Ouverture demandée de l'extérieur (Aide et support, bouton de la page).
  useEffect(() => {
    const onOpen = (e) => { const d = e.detail || {}; if (d.tour === 'panel') setPanel(true); else open(d.tour || MAIN_TOUR, { restart: !!d.restart }); };
    window.addEventListener(TOUR_EVENT_OPEN, onOpen);
    return () => window.removeEventListener(TOUR_EVENT_OPEN, onOpen);
  }, [open]);

  // ── Invitations automatiques (premier passage) ──────────────────────────────
  const noTourPage = NO_TOUR.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)));
  useEffect(() => {
    if (!state || run || noTourPage) { setInvite(null); return undefined; }
    if (pathname === '/dashboard' && state.tours.main.status === 'new') { const t = setTimeout(() => open(MAIN_TOUR), 900); return () => clearTimeout(t); }
    const pageTour = pageTourFor(pathname);
    if (shouldInvite({ pageTour, tours: state.tours, seen: state.seen, running: false, section: pageTour })) { const t = setTimeout(() => setInvite(pageTour), 1200); return () => clearTimeout(t); }
    setInvite(null);
    return undefined;
  }, [state, run, pathname, noTourPage, open]);

  // ── Trouver l'élément de l'étape (et emmener le joueur sur la bonne page) ────
  useEffect(() => {
    if (!run || !step) return undefined;
    setEl(null);
    const ids = step.id;
    if (step.kind === 'travel' && pathMatches(step.to, pathname)) { goStep(run.dir); return undefined; }   // déjà arrivé
    if (step.kind !== 'travel' && step.page && !pathMatches(step.page, pathname)) {
      navTries.current[ids] = (navTries.current[ids] || 0) + 1;
      if (navTries.current[ids] > 2) { skipMissing(); return undefined; }  // la page nous renvoie ailleurs : on ne boucle pas
      router.push(step.page);
      return undefined;
    }
    if (step.kind === 'center') return undefined;
    if (step.kind === 'travel' && window.innerWidth <= MOBILE_MAX) window.dispatchEvent(new CustomEvent(TOUR_EVENT_MENU, { detail: { open: true } }));
    const selectors = step.kind === 'travel' ? step.via : step.target;
    const started = Date.now();
    const tick = () => {
      const node = resolveTarget(selectors, queryAll, isVisible);
      if (node) { setEl(node); return true; }
      if (step.prepare?.click && !preparedRef.current && Date.now() - started > 300) {
        const b = resolveTarget(step.prepare.click, queryAll, isVisible);
        if (b) { preparedRef.current = true; b.click(); }
      }
      if (Date.now() - started > RESOLVE_TIMEOUT) { skipMissing(); return true; }
      return false;
    };
    if (tick()) return undefined;
    const id = setInterval(() => { if (tick()) clearInterval(id); }, 120);
    return () => clearInterval(id);
  }, [run?.tour, run?.index, pathname, resolveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // L'élément a disparu de la page (rafraîchissement) : on le cherche de nouveau, sauf si l'action de l'étape est faite.
  useEffect(() => {
    if (!el || done) return undefined;
    const id = setInterval(() => { if (!el.isConnected) setResolveKey((k) => k + 1); }, 400);
    return () => clearInterval(id);
  }, [el, done]);

  // ── Étapes actives : on attend une vraie action du joueur ───────────────────
  useEffect(() => {
    const cond = step?.action?.done;
    if (!run || !cond || !el || done) return undefined;
    if (cond.event) {
      const on = () => setDone(true);
      window.addEventListener(cond.event, on);
      return () => window.removeEventListener(cond.event, on);
    }
    if (cond.click) {
      const on = (e) => { if (e.target instanceof Element && e.target.closest(cond.click)) setDone(true); };
      document.addEventListener('click', on, true);
      return () => document.removeEventListener('click', on, true);
    }
    if (cond.appears) {
      const id = setInterval(() => { if (resolveTarget(cond.appears, queryAll, isVisible)) { setDone(true); clearInterval(id); } }, 200);
      return () => clearInterval(id);
    }
    return undefined;
  }, [run?.index, step, el, done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Étape de déplacement : le guide clique lui-même le menu (ou navigue directement).
  const travel = useCallback(() => {
    if (!step || step.kind !== 'travel') return;
    if (step.click !== false && el && el.isConnected) el.click(); else router.push(step.to);
  }, [step, el, router]);

  useEffect(() => { if (run && pathname.startsWith('/admin')) { setRun(null); } }, [run, pathname]);

  const ctx = useMemo(() => ({ state, open, reset, running: !!run, openPanel: () => setPanel(true), closePanel: () => setPanel(false), panel }), [state, open, reset, run, panel]);
  const loggedIn = !!state && !noTourPage;

  return (
    <TourContext.Provider value={ctx}>
      {children}
      {loggedIn && !run && <TourLauncher pathname={pathname} onOpen={open} onPanel={() => setPanel(true)} />}
      {loggedIn && !run && invite && <TourInvite tour={invite} onStart={() => open(invite, { restart: true })} onLater={() => { save({ tour: invite, status: 'dismissed' }, [], true); setInvite(null); }} />}
      {run && <span hidden data-testid="tour-running" />}
      {run && step && (
        <TourOverlay
          step={step}
          el={el}
          done={done}
          progress={progressOf(steps, run.index, skipped)}
          first={stepIndexFrom(steps, run.index, -1, new Set(steps.filter((s) => s.kind === 'travel').map((s) => s.id).concat([...skipped]))) === null}
          last={!!step.last || stepIndexFrom(steps, run.index, 1, skipped) === null}
          mini={run.tour !== MAIN_TOUR}
          tourLabel={run.tour === MAIN_TOUR ? 'Visite guidée' : `Guide : ${PAGE_TOURS[run.tour]?.label ?? ''}`}
          onNext={() => (step.kind === 'travel' ? travel() : goStep(1))}
          onPrev={() => goStep(-1)}
          onPause={pause}
          onSkip={() => finish('dismissed')}
          onSkipStep={() => goStep(1)}
          onFinish={() => finish('done')}
          reduced={reducedMotion()}
        />
      )}
      {panel && <TourPanelHost onClose={() => setPanel(false)} />}
    </TourContext.Provider>
  );
}

// Panneau « Mon parcours de découverte » ouvert depuis le bouton « ? » (chargé à la demande).
function TourPanelHost({ onClose }) {
  const [Panel, setPanel] = useState(null);
  useEffect(() => { import('./TourChecklist').then((m) => setPanel(() => m.TourPanel)); }, []);
  return Panel ? <Panel onClose={onClose} /> : null;
}
