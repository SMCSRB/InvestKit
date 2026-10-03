'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { GLOSSARY } from '../lib/glossaire';
import {
  DOMAINS_BY_CATEGORY, DOMAINS_OVERRIDE, GLOSSARY_DOMAINS, GLOSSARY_LEVELS, GLOSSARY_TOOLS, LEVEL_1, LEVEL_3,
  SOURCES, SOURCE_CHECKED_ON, SOURCE_STATUS, TOOLS_BY_ID,
} from '../lib/glossaireMeta';
import { FICHES } from '../lib/glossaireFiches';
import AppShell from '@/app/components/shell/AppShell';
import Icon from '@/app/components/ui/Icon';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const levelOf = (id) => (LEVEL_1.includes(id) ? 1 : LEVEL_3.includes(id) ? 3 : 2);
const letterOf = (term) => {
  const c = norm(term).replace(/[^a-z0-9]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Calculé une seule fois : fiche enrichie de chaque mot, triée par ordre alphabétique français.
const ENTRIES = GLOSSARY.map((g) => ({
  ...g,
  level: levelOf(g.id),
  domains: DOMAINS_OVERRIDE[g.id] || DOMAINS_BY_CATEGORY[g.category] || [],
  fiche: FICHES[g.id] || null,
  letter: letterOf(g.term),
  search: norm(`${g.term} ${g.short} ${g.long} ${FICHES[g.id]?.ex || ''}`),
  termNorm: norm(g.term),
})).sort((a, b) => a.termNorm.localeCompare(b.termNorm, 'fr'));
const BY_ID = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));

function Highlight({ text, needle }) {
  if (!needle) return text;
  const n = norm(text);
  if (n.length !== text.length) return text;
  const i = n.indexOf(needle);
  if (i < 0) return text;
  return (<>{text.slice(0, i)}<mark>{text.slice(i, i + needle.length)}</mark>{text.slice(i + needle.length)}</>);
}

function Card({ entry, open, onToggle, onJump, needle, target }) {
  const f = entry.fiche;
  const tools = (TOOLS_BY_ID[entry.id] || []).map((k) => GLOSSARY_TOOLS[k]).filter(Boolean);
  const src = SOURCES[entry.id];
  const bodyId = `gl-body-${entry.id}`;
  return (
    <article id={entry.id} className="gl__card" data-open={open} data-target={target || undefined}>
      <h3 className="gl__term"><Highlight text={entry.term} needle={needle} /></h3>
      <p className="gl__short"><Highlight text={entry.short} needle={needle} /></p>
      <div className="gl__tags">
        <span className={`gl__tag gl__tag--level${entry.level}`}>{GLOSSARY_LEVELS[entry.level].label}</span>
        {entry.domains.map((d) => (
          <span key={d} className="gl__tag"><Icon name={GLOSSARY_DOMAINS[d].icon} size={13} />{GLOSSARY_DOMAINS[d].label}</span>
        ))}
      </div>
      <button type="button" className="gl__more" aria-expanded={open} aria-controls={bodyId} onClick={() => onToggle(entry.id)}>
        {open ? 'Replier la fiche' : 'Voir la fiche complète'}
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="gl__body" id={bodyId}>
          <p className="gl__long">{entry.long}</p>
          {f?.ex && (
            <div className="gl__block">
              <h4 className="gl__block-title"><Icon name="lightbulb" size={16} />Exemple concret</h4>
              <p>{f.ex}</p>
            </div>
          )}
          {entry.inGame && (
            <div className="gl__block">
              <h4 className="gl__block-title gl__game"><Icon name="coins" size={16} />Dans le jeu</h4>
              <p>{entry.inGame}</p>
            </div>
          )}
          {f?.vs?.length > 0 && (
            <div className="gl__block">
              <h4 className="gl__block-title"><Icon name="scale" size={16} />À ne pas confondre avec</h4>
              <ul className="gl__vs-list">
                {f.vs.map((v, i) => {
                  const other = v[0] ? BY_ID[v[0]] : null;
                  const label = other ? other.term : v[1];
                  const note = other ? v[1] : v[2];
                  return (
                    <li key={i} className="gl__vs-item">
                      {other ? <a href={`#${other.id}`} className="gl__vs" onClick={(e) => { e.preventDefault(); onJump(other.id); }}>{label}</a> : <strong>{label}</strong>}
                      {' : '}{note}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {(entry.quiz || tools.length > 0) && (
            <div className="gl__links">
              {entry.quiz && (
                <Link className="gl__link" href={`/education/${entry.quiz.domain}/${entry.quiz.chapter}`}>
                  <Icon name="graduationCap" size={16} />Leçon et quiz liés
                </Link>
              )}
              {tools.map((t) => (
                <Link key={t.href} className="gl__link" href={t.href}><Icon name={t.icon} size={16} />{t.label}</Link>
              ))}
            </div>
          )}
          {src && (
            <div className="gl__source">
              <span className={`gl__source-status gl__source-status--${src.statut}`}>
                <Icon name={src.statut === 'non-source' ? 'triangleAlert' : src.statut === 'jeu' ? 'coins' : 'shieldCheck'} size={14} />
                {SOURCE_STATUS[src.statut]}
              </span>
              <div>Contrôlé le {new Date(SOURCE_CHECKED_ON).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} : {src.points}.</div>
              {src.refs.length > 0 && (
                <ul>{src.refs.map((r) => (<li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.label}</a></li>))}</ul>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function GlossairePage() {
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState(null);
  const [level, setLevel] = useState(null);
  const [openIds, setOpenIds] = useState(() => new Set());
  const [targetId, setTargetId] = useState(null);
  const pendingScroll = useRef(null);

  const needle = norm(q.trim());
  const filtered = useMemo(() => {
    let list = ENTRIES.filter((e) => (!domain || e.domains.includes(domain)) && (!level || e.level === level));
    if (needle) {
      list = list.filter((e) => e.search.includes(needle));
      const rank = (e) => (e.termNorm.startsWith(needle) ? 0 : e.termNorm.includes(needle) ? 1 : norm(e.short).includes(needle) ? 2 : 3);
      list = [...list].sort((a, b) => rank(a) - rank(b) || a.termNorm.localeCompare(b.termNorm, 'fr'));
    }
    return list;
  }, [needle, domain, level]);

  const groups = useMemo(() => {
    if (needle) return [];
    const m = new Map();
    for (const e of filtered) { if (!m.has(e.letter)) m.set(e.letter, []); m.get(e.letter).push(e); }
    return [...m.entries()];
  }, [filtered, needle]);
  const letters = useMemo(() => new Set(groups.map(([l]) => l)), [groups]);

  const toggle = useCallback((id) => {
    setOpenIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  // Aller à une fiche (lien #id, bouton « à ne pas confondre avec ») : on retire les filtres qui la cacheraient, on l'ouvre et on la montre.
  const goTo = useCallback((id) => {
    if (!BY_ID[id]) return;
    setQ(''); setDomain(null); setLevel(null);
    setOpenIds((s) => new Set(s).add(id));
    setTargetId(id);
    pendingScroll.current = id;
    if (typeof window !== 'undefined' && window.location.hash !== `#${id}`) window.history.replaceState(null, '', `#${id}`);
  }, []);

  useEffect(() => {
    const fromHash = () => { const id = decodeURIComponent(window.location.hash.replace(/^#/, '')); if (id) goTo(id); };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [goTo]);

  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      pendingScroll.current = null;
      el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  });

  useEffect(() => {
    if (!targetId) return undefined;
    const t = setTimeout(() => setTargetId(null), 2500);
    return () => clearTimeout(t);
  }, [targetId]);

  const jumpLetter = (l) => document.getElementById(`lettre-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const hasFilters = Boolean(needle || domain || level);
  const reset = () => { setQ(''); setDomain(null); setLevel(null); };

  const renderCard = (e) => (
    <Card key={e.id} entry={e} open={openIds.has(e.id)} onToggle={toggle} onJump={goTo} needle={needle} target={targetId === e.id} />
  );

  return (
    <AppShell>
      <div className="gl">
        <Link href="/dashboard" className="gl__back"><Icon name="chevronLeft" size={16} />Retour</Link>
        <h1 className="gl__title">Glossaire</h1>
        <p className="gl__intro">
          {ENTRIES.length} mots de l&apos;immobilier, de la Bourse, de la crypto et du crédit, expliqués simplement, avec un exemple concret.
          Les chiffres « Dans le jeu » sont des simplifications pédagogiques.
        </p>

        <div className="gl__search" role="search">
          <Icon name="search" size={18} />
          <input
            className="gl__input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un mot (cash-flow, PEA…)" aria-label="Rechercher dans le glossaire" autoComplete="off"
          />
          {q && <button type="button" className="gl__clear" aria-label="Effacer la recherche" onClick={() => setQ('')}><Icon name="x" size={18} /></button>}
        </div>

        <div className="gl__filters">
          <div className="gl__group" role="group" aria-label="Filtrer par domaine">
            <span className="gl__group-label">Domaine</span>
            {Object.entries(GLOSSARY_DOMAINS).map(([k, d]) => (
              <button key={k} type="button" className="gl__chip" aria-pressed={domain === k} onClick={() => setDomain(domain === k ? null : k)}>
                <Icon name={d.icon} size={15} />{d.label}
              </button>
            ))}
          </div>
          <div className="gl__group" role="group" aria-label="Filtrer par niveau">
            <span className="gl__group-label">Niveau</span>
            {Object.entries(GLOSSARY_LEVELS).map(([k, l]) => (
              <button key={k} type="button" className="gl__chip" aria-pressed={level === Number(k)} title={l.hint} onClick={() => setLevel(level === Number(k) ? null : Number(k))}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {!needle && (
          <nav className="gl__az" aria-label="Index alphabétique">
            {LETTERS.map((l) => (
              <button key={l} type="button" className="gl__letter" disabled={!letters.has(l)} onClick={() => jumpLetter(l)} aria-label={`Aller à la lettre ${l}`}>{l}</button>
            ))}
          </nav>
        )}

        <div className="gl__status" aria-live="polite">
          <span>{filtered.length} {filtered.length > 1 ? 'mots' : 'mot'}{hasFilters ? ` sur ${ENTRIES.length}` : ''}</span>
          {hasFilters && <button type="button" className="gl__reset" onClick={reset}>Tout réinitialiser</button>}
        </div>

        {filtered.length === 0 && (
          <div className="gl__empty">
            <p style={{ margin: '0 0 8px', color: 'var(--ik-text)' }}>Aucun mot ne correspond{q ? ` à « ${q} »` : ''}.</p>
            <button type="button" className="gl__reset" onClick={reset}>Voir tous les mots</button>
          </div>
        )}

        {needle ? filtered.map(renderCard) : groups.map(([l, items]) => (
          <section key={l} aria-labelledby={`lettre-${l}`}>
            <h2 className="gl__letter-title" id={`lettre-${l}`}>{l}</h2>
            {items.map(renderCard)}
          </section>
        ))}

        <p className="gl__disclaimer">
          Les définitions sont pédagogiques et ne constituent pas un conseil en investissement. Les taux et plafonds réels changent : les fiches qui en parlent
          indiquent leur date de contrôle et leurs sources ; celles marquées « non sourcé » ne sont qu&apos;un ordre de grandeur.
        </p>
      </div>
    </AppShell>
  );
}
