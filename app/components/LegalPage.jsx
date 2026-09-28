import Link from 'next/link';
import TestPhaseNotice from './TestPhaseNotice';

// Gabarit commun des pages légales. `sections` : [{ title, body: ReactNode }]
export default function LegalPage({ title, updated, sections }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)',
      padding: 'clamp(30px, 8vw, 40px) clamp(16px, 4vw, 24px) clamp(40px, 10vw, 60px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '28px',
        padding: 'clamp(30px, 6vw, 48px) clamp(20px, 5vw, 40px)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
      }}>
        <h1 style={{ fontSize: 'clamp(24px, 7vw, 36px)', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>{title}</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>Dernière mise à jour : {updated}</p>
        <TestPhaseNotice />
        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>{s.title}</h2>
            <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{s.body}</div>
          </section>
        ))}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(59,130,246,0.1)' }}>
          <Link href="/" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
