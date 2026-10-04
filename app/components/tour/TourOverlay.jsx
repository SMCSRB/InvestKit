'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { holeOf, isUsableRect, placePopover, MOBILE_MAX } from '@/app/lib/tour/engine';

const POP_WIDTH = 348;

const rectOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
const same = (a, b) => !!a && !!b && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
const typing = (t) => t instanceof Element && (t.closest('input, textarea, select, [contenteditable="true"]') !== null);

// Projecteur : l'écran est assombri sauf l'élément expliqué (cerclé), avec une bulle à flèche (ou un panneau en bas sur téléphone).
export default function TourOverlay({ step, el, done, progress, first, last, mini, tourLabel, reduced, onNext, onPrev, onPause, onSkip, onSkipStep, onFinish }) {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [rect, setRect] = useState(null);
  const [size, setSize] = useState({ w: POP_WIDTH, h: 200 });
  const popRef = useRef(null);
  const active = !!step.action;
  const centered = step.kind === 'center' || !step.target && step.kind !== 'travel';
  const sheet = vp.w <= MOBILE_MAX;

  // Mesure continue de l'élément (défilement, redimensionnement, animations de la page) ; on ne met à jour que si ça bouge.
  useEffect(() => {
    if (!el) { setRect(null); return undefined; }
    let raf = 0;
    const loop = () => {
      if (el.isConnected) { const r = rectOf(el); setRect((p) => (same(p, r) ? p : (isUsableRect(r) ? r : null))); } else setRect(null);
      setVp((p) => (p.w === window.innerWidth && p.h === window.innerHeight ? p : { w: window.innerWidth, h: window.innerHeight }));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [el]);

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Amène l'élément à l'écran (au-dessus du panneau sur téléphone).
  useEffect(() => {
    if (!el || centered) return;
    const behavior = reduced ? 'auto' : 'smooth';
    const prev = el.style.scrollMarginTop;
    if (window.innerWidth <= MOBILE_MAX) el.style.scrollMarginTop = '84px';
    try { el.scrollIntoView({ block: window.innerWidth <= MOBILE_MAX ? 'start' : 'center', behavior, inline: 'nearest' }); } catch { /* ancien navigateur */ }
    const t = setTimeout(() => { el.style.scrollMarginTop = prev; }, 900);
    return () => { clearTimeout(t); el.style.scrollMarginTop = prev; };
  }, [el, centered, reduced, step.id]);

  useLayoutEffect(() => {
    const n = popRef.current;
    if (n) setSize((p) => (p.h === n.offsetHeight && p.w === n.offsetWidth ? p : { w: n.offsetWidth || POP_WIDTH, h: n.offsetHeight }));
  });

  // Le focus suit l'étape (annoncé par le lecteur d'écran) ; sur une étape active on le laisse ensuite au joueur.
  useEffect(() => { popRef.current?.focus({ preventScroll: true }); }, [step.id]);

  // Clavier : flèches, Entrée, Échap ; Tab reste dans la bulle tant que la visite masque la page.
  const onKey = useCallback((e) => {
    if (typing(e.target)) return;
    const inBtn = e.target instanceof Element && e.target.closest('button, a');
    if (e.key === 'Escape') { e.preventDefault(); onPause(); return; }
    if (e.key === 'ArrowRight' && !(active && !done)) { e.preventDefault(); (last ? onFinish : onNext)(); return; }
    if (e.key === 'ArrowLeft' && !first) { e.preventDefault(); onPrev(); return; }
    if (e.key === 'Enter' && !inBtn && !(active && !done)) { e.preventDefault(); (last ? onFinish : onNext)(); return; }
    if (e.key === 'Tab' && !active && popRef.current) {
      const f = popRef.current.querySelectorAll('button:not([disabled]), a[href]');
      if (!f.length) return;
      const a = f[0]; const z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === popRef.current)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }, [active, done, first, last, onNext, onPrev, onPause, onFinish]);
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  const hole = rect && !centered ? holeOf(rect, vp.w, vp.h) : null;
  const place = placePopover({ hole, size: { w: Math.min(POP_WIDTH, size.w), h: size.h }, viewport: vp, prefer: step.placement || 'bottom' });
  const waiting = active && !done;
  const style = place.mode === 'sheet' ? undefined : { left: place.left, top: place.top, width: place.width ?? POP_WIDTH };
  if (!centered && !el) return null;          // l'élément n'est pas encore trouvé : aucun voile (jamais d'écran noir en attente)
  const nextLabel = step.kind === 'travel' ? 'Y aller' : last ? 'Terminer' : step.id === 'welcome' ? 'Commencer' : 'Suivant';

  return (
    <div className="ik-tour" data-testid="tour" data-step={step.id} data-reduced={reduced ? '1' : undefined}>
      {hole ? (
        <>
          <div className="ik-tour__veil" style={{ left: 0, top: 0, width: '100%', height: hole.top }} />
          <div className="ik-tour__veil" style={{ left: 0, top: hole.top + hole.height, width: '100%', bottom: 0 }} />
          <div className="ik-tour__veil" style={{ left: 0, top: hole.top, width: hole.left, height: hole.height }} />
          <div className="ik-tour__veil" style={{ left: hole.left + hole.width, top: hole.top, right: 0, height: hole.height }} />
          {!(active || step.kind === 'travel') && <div className="ik-tour__veil ik-tour__veil--clear" style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} />}
          <div className="ik-tour__ring" style={{ left: hole.left, top: hole.top, width: hole.width, height: hole.height }} data-testid="tour-ring" />
        </>
      ) : <div className="ik-tour__veil" style={{ inset: 0 }} />}

      <div
        ref={popRef}
        className={`ik-tour__pop ik-tour__pop--${place.mode}`}
        data-placement={place.placement}
        style={style}
        role="dialog"
        aria-modal="false"
        aria-labelledby="ik-tour-title"
        aria-describedby="ik-tour-text"
        tabIndex={-1}
        data-testid="tour-pop"
      >
        {place.arrow != null && <span className="ik-tour__arrow" style={place.placement === 'top' || place.placement === 'bottom' ? { left: place.arrow } : { top: place.arrow }} aria-hidden="true" />}
        <div className="ik-tour__head">
          <span className="ik-tour__count" data-testid="tour-count">{step.kind === 'travel' ? tourLabel : `${tourLabel} · étape ${progress.n} sur ${progress.total}`}</span>
          <button type="button" className="ik-tour__x" onClick={onPause} aria-label="Mettre la visite en pause (Échap)" data-testid="tour-pause"><Icon name="x" size={18} /></button>
        </div>
        <div className="ik-tour__bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.n} aria-label="Avancement de la visite"><span style={{ width: `${Math.round((progress.n / progress.total) * 100)}%` }} /></div>
        <h2 id="ik-tour-title" className="ik-tour__title">{step.title}</h2>
        <p id="ik-tour-text" className="ik-tour__text">{step.text}</p>
        <div aria-live="polite" className="ik-tour__live">
          {waiting && <p className="ik-tour__hint" data-testid="tour-hint">{step.action.hint}</p>}
          {active && done && <p className="ik-tour__ok" data-testid="tour-ok"><Icon name="check" size={16} /> {step.action.success || 'C\'est fait.'}</p>}
        </div>
        <div className="ik-tour__foot">
          <button type="button" className="ik-tour__skip" onClick={onSkip} data-testid="tour-skip">{mini ? 'Quitter' : 'Passer la visite'}</button>
          {waiting && <button type="button" className="ik-tour__skip" onClick={onSkipStep} data-testid="tour-skip-step">Passer cette étape</button>}
          <span className="ik-tour__btns">
          {!first && <button type="button" className="ik-btn ik-btn--sm" onClick={onPrev} data-testid="tour-prev">Précédent</button>}
          {!waiting && <button type="button" className="ik-btn ik-btn--primary ik-btn--sm" onClick={last ? onFinish : onNext} data-testid="tour-next">{nextLabel}</button>}
          </span>
        </div>
      </div>
    </div>
  );
}
