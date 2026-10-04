'use client';

import Link from 'next/link';
import { PageHeader } from '@/app/components/shell/AppShell';
import { Card } from '@/app/components/ui/primitives';
import Icon from '@/app/components/ui/Icon';
import GuideText from '@/app/components/guide/GuideText';
import { GUIDE_SECTIONS, GUIDE_MODES, GUIDE_DOMAINS, OPEN_GUIDE_EVENT } from '@/app/lib/guide';

const pill = (ok) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 'var(--ik-fs-sm)', fontWeight: 600,
  background: ok ? 'color-mix(in srgb, var(--ik-positive) 16%, transparent)' : 'color-mix(in srgb, var(--ik-text) 10%, transparent)',
  color: ok ? 'var(--ik-positive)' : 'var(--ik-text-2)',
});

function Links({ items }) {
  if (!items?.length) return null;
  return (
    <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
      {items.map((l) => <li key={l.href}><Link href={l.href} className="ik-link">{l.label}</Link></li>)}
    </ul>
  );
}

function Modes() {
  return (
    <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
      {GUIDE_MODES.map((m) => (
        <div key={m.id} data-testid={`mode-${m.id}`} style={{ border: '1px solid var(--ik-border)', borderRadius: 14, padding: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <strong>{m.name}</strong>
            <span style={pill(m.available)}>{m.available ? 'Disponible aujourd\'hui' : 'Pas encore disponible'}</span>
          </div>
          <p className="ik-muted" style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-sm)' }}>{m.who}</p>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{m.text}</p>
        </div>
      ))}
    </div>
  );
}

function Domains() {
  return (
    <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
      {GUIDE_DOMAINS.map((d) => (
        <div key={d.id} data-testid={`domain-${d.id}`} style={{ border: '1px solid var(--ik-border)', borderRadius: 14, padding: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <Icon name={d.icon} size={20} />
            <Link href={d.href} className="ik-link" style={{ fontWeight: 700 }}>{d.name}</Link>
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.55 }}>{d.text}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 'var(--ik-fs-sm)' }}>
            {d.course && <li><Link href={`/education/${d.course}`} className="ik-link">Le cours</Link></li>}
            {d.terms.map((t) => <li key={t.id}><Link href={`/glossaire#${t.id}`} className="ik-link">{t.label}</Link></li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function GuideContent() {
  return (
    <>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 16, minWidth: 0 }}>
        <PageHeader title="Guide du site" subtitle="Tout ce qu'il faut savoir pour bien démarrer, en quelques minutes." />
        <nav aria-label="Rubriques du guide" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GUIDE_SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="ik-btn ik-btn--sm">{s.title}</a>)}
        </nav>
        {GUIDE_SECTIONS.map((s) => (
          <Card key={s.id}>
            <section id={s.id} data-testid={`section-${s.id}`} style={{ scrollMarginTop: 'calc(var(--ik-sticky-offset, 70px) + 12px)', minWidth: 0 }}>
              <h2 style={{ margin: '0 0 10px', fontSize: 'var(--ik-fs-lg)', display: 'flex', gap: 10, alignItems: 'center' }}><Icon name={s.icon} size={22} />{s.title}</h2>
              {s.body.map((p, i) => <p key={i} style={{ margin: '0 0 10px', lineHeight: 1.6 }}><GuideText>{p}</GuideText></p>)}
              {s.id === 'modes' && <Modes />}
              {s.id === 'domaines' && <Domains />}
              <Links items={s.links} />
            </section>
          </Card>
        ))}
        <Card>
          <p style={{ margin: 0 }}>
            Envie de le revoir pas à pas ?{' '}
            <button type="button" className="ik-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => window.dispatchEvent(new Event(OPEN_GUIDE_EVENT))}>Relancer le parcours de bienvenue</button>
          </p>
        </Card>
      </div>
    </>
  );
}
