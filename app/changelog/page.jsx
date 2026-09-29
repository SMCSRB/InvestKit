import Link from 'next/link';
import { CHANGELOG } from '../lib/changelog';

export const metadata = {
  title: 'Nouveautés - InvestKit',
  description: 'Les dernières nouveautés d\'InvestKit.',
};

export default function ChangelogPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', padding: 'clamp(16px, 4vw, 32px)', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#93c5fd', textDecoration: 'none' }}>← Accueil</Link>
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', margin: '16px 0 24px' }}>🆕 Nouveautés</h1>
        {CHANGELOG.map((entry) => (
          <section key={entry.title} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{entry.date}</div>
            <h2 style={{ fontSize: 20, margin: '4px 0 12px' }}>{entry.title}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              {entry.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
