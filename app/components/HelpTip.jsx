'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { glossaryById } from '../lib/glossaire';

/**
 * Icône « ? » : au clic (ou au clavier), affiche l'explication d'un terme du glossaire.
 * Usage : <HelpTip term="effort-epargne" />
 */
export default function HelpTip({ term, label }) {
  const entry = glossaryById[term];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!entry) return null;

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }}>
      <button
        type="button"
        className="helptip-btn"
        aria-label={label || `Explication : ${entry.term}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          borderRadius: '50%', border: '1px solid rgba(96,165,250,0.7)',
          background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: 700, cursor: 'pointer',
        }}
      >?</button>
      {open && (
        <span
          role="dialog"
          style={{
            position: 'absolute', zIndex: 50, top: 24, left: -8, width: 'min(320px, 80vw)', padding: '12px 14px',
            borderRadius: 10, background: '#0f172a', border: '1px solid rgba(96,165,250,0.5)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#e2e8f0', fontSize: 13, lineHeight: 1.5, textAlign: 'left',
            fontWeight: 400, textTransform: 'none', letterSpacing: 'normal',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4, color: '#fff' }}>{entry.term}</strong>
          {entry.short}
          {entry.inGame && <span style={{ display: 'block', marginTop: 6, color: '#93c5fd' }}>Dans le jeu : {entry.inGame}</span>}
          <Link href={`/glossaire#${entry.id}`} style={{ display: 'block', marginTop: 8, color: '#60a5fa', fontSize: 12 }}>
            Voir l&apos;explication complète →
          </Link>
          {entry.quiz && (
            <Link href={`/education/${entry.quiz.domain}/${entry.quiz.chapter}`} style={{ display: 'block', marginTop: 4, color: '#60a5fa', fontSize: 12 }}>
              📝 Teste-toi : quiz lié →
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
