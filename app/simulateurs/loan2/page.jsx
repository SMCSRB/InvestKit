'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/components/shell/AppShell';

export default function LoanSimulator2Page() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
    <div style={{
      padding: 'clamp(16px, 4vw, 24px)',
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
      }}>
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <h1 style={{
            fontSize: 'clamp(20px, 6vw, 28px)',
            fontWeight: '800',
            background: 'linear-gradient(135deg, var(--ik-primary) 0%, var(--ik-orchid) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
          }}>
            💳 Simulateur Crédit Bancaire
          </h1>
          <button
            onClick={() => router.back()}
            style={{
              padding: 'clamp(8px, 2vw, 10px) clamp(12px, 4vw, 20px)',
              background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)',
              color: 'var(--ik-text)',
              border: '1px solid color-mix(in srgb, var(--ik-text) 20%, transparent)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '600',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'color-mix(in srgb, var(--ik-text) 15%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'color-mix(in srgb, var(--ik-text) 10%, transparent)';
            }}
          >
            ← Retour
          </button>
        </div>

        <iframe
          src="/simulateur-loan2.html"
          style={{
            width: '100%',
            height: 'calc(100vh - 120px)',
            border: 'none',
            borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          }}
          title="Loan Simulator 2"
        />
      </div>
    </div>
    </AppShell>
  );
}
