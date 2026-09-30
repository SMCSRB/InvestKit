'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import { GLOSSARY } from '@/app/lib/glossaire';
import { flatNav } from './nav';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Recherche globale (Ctrl/⌘ + K) : pages, actions et termes du glossaire (données réelles du site).
export default function CommandPalette({ open, onClose, actions }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const results = useMemo(() => {
    const pages = flatNav().map((n) => ({ kind: 'Pages', label: n.label, icon: n.icon, run: () => (n.external ? window.open(n.href, '_blank', 'noopener') : router.push(n.href)), hint: n.external ? 'lien externe' : n.href.split('?')[0] }));
    const acts = actions.map((a) => ({ kind: 'Actions', ...a }));
    const terms = GLOSSARY.map((g) => ({ kind: 'Glossaire', label: g.term, icon: 'bookOpen', hint: g.short?.slice(0, 60), run: () => router.push(`/glossaire#${g.id}`), extra: norm(g.short || '') }));
    const nq = norm(q.trim());
    if (!nq) return [...pages, ...acts].slice(0, 14);
    const score = (r) => { const l = norm(r.label); return l.startsWith(nq) ? 0 : l.includes(nq) ? 1 : (r.extra || '').includes(nq) ? 2 : 9; };
    return [...pages, ...acts, ...terms].map((r) => [score(r), r]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).slice(0, 30).map(([, r]) => r);
  }, [q, router, actions]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  if (!open) return null;
  const run = (r) => { onClose(); r.run(); };
  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); run(results[sel]); }
  };

  let lastKind = null;
  return (
    <div className="ik-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ik-cmd" role="dialog" aria-modal="true" aria-label="Recherche globale" onKeyDown={onKey}>
        <input ref={inputRef} className="ik-cmd__input" placeholder="Chercher une page, une action ou un terme du glossaire…" value={q} onChange={(e) => setQ(e.target.value)} role="combobox" aria-expanded="true" aria-controls="ik-cmd-list" aria-activedescendant={results[sel] ? `ik-cmd-${sel}` : undefined} />
        <ul className="ik-cmd__list ik-scroll" id="ik-cmd-list" role="listbox" ref={listRef}>
          {results.length === 0 && <li className="ik-muted" style={{ padding: 16 }}>Aucun résultat pour « {q} ».</li>}
          {results.map((r, i) => {
            const head = r.kind !== lastKind;
            lastKind = r.kind;
            return (
              <li key={`${r.kind}-${r.label}-${i}`} role="presentation" style={{ listStyle: 'none' }}>
                {head && <div className="ik-cmd__group">{r.kind}</div>}
                <button type="button" id={`ik-cmd-${i}`} role="option" aria-selected={sel === i} className="ik-cmd__item" onMouseMove={() => setSel(i)} onClick={() => run(r)}>
                  <Icon name={r.icon} size={18} />
                  {r.label}
                  {r.hint && <small>{r.hint}</small>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="ik-cmd__foot"><span>↑↓ pour naviguer</span><span>Entrée pour ouvrir</span><span>Échap pour fermer</span></div>
      </div>
    </div>
  );
}
