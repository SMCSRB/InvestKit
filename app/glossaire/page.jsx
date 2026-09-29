'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { GLOSSARY, GLOSSARY_CATEGORIES } from '../lib/glossaire';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function GlossairePage() {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = norm(q.trim());
    const items = GLOSSARY.filter((g) => !needle || norm(`${g.term} ${g.short} ${g.long}`).includes(needle));
    return Object.entries(GLOSSARY_CATEGORIES)
      .map(([key, label]) => ({ key, label, items: items.filter((g) => g.category === key) }))
      .filter((g) => g.items.length);
  }, [q]);

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', padding: 'clamp(16px, 4vw, 32px)', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: '#60a5fa', fontSize: 14 }}>← Retour</Link>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', margin: '12px 0 6px', color: '#fff' }}>Glossaire</h1>
        <p style={{ color: '#94a3b8', marginTop: 0 }}>
          Les mots de l&apos;investissement immobilier, expliqués simplement. Les chiffres « Dans le jeu » sont des simplifications pédagogiques.
        </p>
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mot (ex. cash-flow, notaire…)"
          aria-label="Rechercher dans le glossaire"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.7)', color: '#fff', fontSize: 15, margin: '10px 0 24px' }}
        />
        {groups.length === 0 && <p>Aucun mot ne correspond à « {q} ».</p>}
        {groups.map((g) => (
          <section key={g.key} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(96,165,250,0.3)', paddingBottom: 6 }}>{g.label}</h2>
            {g.items.map((it) => (
              <article key={it.id} id={it.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(148,163,184,0.15)', scrollMarginTop: 20 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 17, color: '#fff' }}>{it.term}</h3>
                <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{it.short}</p>
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6 }}>{it.long}</p>
                {it.inGame && <p style={{ margin: '8px 0 0', color: '#93c5fd', fontSize: 14 }}>🎮 Dans le jeu : {it.inGame}</p>}
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
