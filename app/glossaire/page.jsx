'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { GLOSSARY, GLOSSARY_CATEGORIES } from '../lib/glossaire';
import AppShell from '@/app/components/shell/AppShell';

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
    <AppShell>
    <div style={{ color: 'var(--ik-text-2)', minWidth: 0 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: 'var(--ik-accent)', fontSize: 14 }}>← Retour</Link>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', margin: '12px 0 6px', color: 'var(--ik-text)' }}>Glossaire</h1>
        <p style={{ color: 'var(--ik-text-3)', marginTop: 0 }}>
          Les mots de l&apos;immobilier, de la Bourse et de la crypto, expliqués simplement. Les chiffres « Dans le jeu » sont des simplifications pédagogiques.
        </p>
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mot (ex. cash-flow, notaire…)"
          aria-label="Rechercher dans le glossaire"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ik-text) 24%, transparent)', background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: 15, margin: '10px 0 24px' }}
        />
        {groups.length === 0 && <p>Aucun mot ne correspond à « {q} ».</p>}
        {groups.map((g) => (
          <section key={g.key} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, color: 'var(--ik-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid color-mix(in srgb, var(--ik-primary) 30%, transparent)', paddingBottom: 6 }}>{g.label}</h2>
            {g.items.map((it) => (
              <article key={it.id} id={it.id} style={{ padding: '14px 0', borderBottom: '1px solid color-mix(in srgb, var(--ik-text) 9%, transparent)', scrollMarginTop: 20 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 17, color: 'var(--ik-text)' }}>{it.term}</h3>
                <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{it.short}</p>
                <p style={{ margin: 0, color: 'var(--ik-text-2)', lineHeight: 1.6 }}>{it.long}</p>
                {it.inGame && <p style={{ margin: '8px 0 0', color: 'var(--ik-accent)', fontSize: 14 }}>🎮 Dans le jeu : {it.inGame}</p>}
                {it.quiz && <p style={{ margin: '8px 0 0', fontSize: 14 }}><Link href={`/education/${it.quiz.domain}/${it.quiz.chapter}`} style={{ color: 'var(--ik-accent)' }}>📝 Teste-toi : chapitre et quiz liés →</Link></p>}
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
    </AppShell>
  );
}
