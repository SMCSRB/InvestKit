'use client';

import { GAME_VALUE_HELP, GAME_VALUE_LABEL } from '@/app/lib/immoSources';
import { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DPE_COLORS, DPE_TEXT } from './api';

// ---- Mode Simple (chiffres clés) / Avancé (détails) : mémorisé dans le navigateur, Simple par défaut ----
const ModeCtx = createContext({ advanced: false, setAdvanced: () => {} });
export const useImmoMode = () => useContext(ModeCtx);
export function ImmoModeProvider({ children }) {
  const [advanced, setAdvancedState] = useState(false);
  useEffect(() => { try { setAdvancedState(localStorage.getItem('ik-immo-mode') === 'advanced'); } catch { /* ignore */ } }, []);
  const setAdvanced = (v) => { setAdvancedState(v); try { localStorage.setItem('ik-immo-mode', v ? 'advanced' : 'simple'); } catch { /* ignore */ } };
  return <ModeCtx.Provider value={{ advanced, setAdvanced }}>{children}</ModeCtx.Provider>;
}

export function Dpe({ cls, size = 'md' }) {
  return <span className={`rp-dpe rp-dpe--${size}`} style={{ background: DPE_COLORS[cls], color: DPE_TEXT[cls] }} title={`DPE ${cls}`}><span className="ik-sr-only">Classe énergie </span>{cls}</span>;
}

export function Pill({ tone = 'neutral', children, icon }) {
  return <span className={`rp-pill rp-pill--${tone}`}>{icon}{children}</span>;
}

export function Heart({ on, onClick, label }) {
  return (
    <button type="button" className={`rp-heart ${on ? 'is-on' : ''}`} onClick={(e) => { e.stopPropagation(); onClick(); }} aria-pressed={on} aria-label={label}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
    </button>
  );
}

export function Row({ label, children, help, game }) {
  return <div className="rp-row"><dt>{label}{help}{game && <GameValueTag />}</dt><dd>{children}</dd></div>;
}

// Marque « valeur de jeu » : ce chiffre n'a pas de source ouverte (règle d'Andreja). Texte, pas seulement une couleur.
export function GameValueTag({ compact }) {
  return <span className={`rp-gv${compact ? ' rp-gv--compact' : ''}`} title={GAME_VALUE_HELP} data-testid="game-value-tag">{GAME_VALUE_LABEL}</span>;
}

// Éléments « plein écran » (signature, tiroir de filtres, barre d'achat) : posés directement sur <body>. Dans la page, un parent animé
// (transform) ferait « fixed » se comporter comme « absolute » et décalerait ces éléments.
export function Portal({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return ready ? createPortal(<div className="rp-portal">{children}</div>, document.body) : null;
}
