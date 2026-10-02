import Link from 'next/link';
import { CHANGELOG } from '../lib/changelog';
import LiveEntries from './LiveEntries';
import PublicShell from '@/app/components/landing/PublicShell';

export const metadata = {
  title: 'Nouveautés - InvestKit',
  description: 'Les dernières nouveautés d\'InvestKit.',
};

export default function ChangelogPage() {
  return (
    <PublicShell>
    <div style={{ color: 'var(--ik-text-2)', minWidth: 0 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--ik-accent)', textDecoration: 'none' }}>← Accueil</Link>
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', margin: '16px 0 24px' }}>🆕 Nouveautés</h1>
        <LiveEntries />
        {CHANGELOG.map((entry) => (
          <section key={entry.title} style={{ background: 'color-mix(in srgb, var(--ik-text) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--ik-text) 12%, transparent)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--ik-text-3)' }}>{entry.date}</div>
            <h2 style={{ fontSize: 20, margin: '4px 0 12px', color: 'var(--ik-text)' }}>{entry.title}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              {entry.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
    </PublicShell>
  );
}
