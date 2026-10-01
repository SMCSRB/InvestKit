import Link from 'next/link';
import TestPhaseNotice from './TestPhaseNotice';
import PublicShell from '@/app/components/landing/PublicShell';

// Gabarit commun des pages légales. `sections` : [{ title, body: ReactNode }]
export default function LegalPage({ title, updated, sections }) {
  return (
    <PublicShell>
    <div style={{ padding: 'clamp(24px, 6vw, 48px) clamp(16px, 4vw, 24px)' }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'var(--ik-surface-card)',
        borderRadius: '28px',
        padding: 'clamp(30px, 6vw, 48px) clamp(20px, 5vw, 40px)',
        boxShadow: 'var(--ik-shadow-card)',
      }}>
        <h1 style={{ fontSize: 'clamp(24px, 7vw, 36px)', fontWeight: 800, color: 'var(--ik-text)', margin: '0 0 8px 0' }}>{title}</h1>
        <p style={{ fontSize: '13px', color: 'var(--ik-text-3)', margin: '0 0 24px 0' }}>Dernière mise à jour : {updated}</p>
        <TestPhaseNotice />
        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ik-text)', margin: '0 0 10px 0' }}>{s.title}</h2>
            <div style={{ fontSize: '14px', color: 'var(--ik-text-2)', lineHeight: 1.6 }}>{s.body}</div>
          </section>
        ))}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid color-mix(in srgb, var(--ik-primary) 10%, transparent)' }}>
          <Link href="/" style={{ color: 'var(--ik-accent)', fontWeight: 600, textDecoration: 'none' }}>← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
    </PublicShell>
  );
}
