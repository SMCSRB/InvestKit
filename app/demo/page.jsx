'use client';

import { useState } from 'react';
import Link from 'next/link';

const SIMULATORS = [
  { key: 'pea', label: '📊 PEA', src: '/simulateur-pea.html' },
  { key: 'loan2', label: '🏠 Immobilier', src: '/simulateur-loan2.html' },
  { key: 'loan1', label: '🏦 Prêt bancaire', src: '/simulateur-loan1.html' },
];

// Page publique : aucun compte requis, les simulateurs sont des pages autonomes
// (aucune donnée n'est envoyée au serveur).
export default function DemoPage() {
  const [active, setActive] = useState(SIMULATORS[0]);
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', padding: 'clamp(16px, 4vw, 24px)', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#93c5fd', textDecoration: 'none' }}>← Accueil</Link>
        <h1 style={{ fontSize: 'clamp(22px, 6vw, 30px)', margin: '12px 0 4px' }}>Essayer les simulateurs</h1>
        <p style={{ color: '#94a3b8', marginTop: 0 }}>
          Démonstration gratuite, sans compte. Simulations pédagogiques : ce ne sont pas des conseils en investissement.
          {' '}<Link href="/signup" style={{ color: '#93c5fd' }}>Créer un compte</Link> pour le jeu complet (Bourse, Crypto, Immobilier, Banque).
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
          {SIMULATORS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s)}
              aria-pressed={active.key === s.key}
              style={{
                padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                background: active.key === s.key ? '#2563eb' : 'rgba(255,255,255,0.08)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <iframe
          key={active.key}
          src={`${active.src}?api=${encodeURIComponent(process.env.NEXT_PUBLIC_API_URL || '')}`}
          title={`Simulateur ${active.label}`}
          style={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 500, border: 'none', borderRadius: 16 }}
        />
      </div>
    </main>
  );
}
