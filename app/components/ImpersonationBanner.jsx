'use client';

import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/app/lib/session';

// Bandeau affiché tant qu'un administrateur « voit comme » un utilisateur (lecture seule, 15 min). Interroge /auth/me une fois par chargement.
export default function ImpersonationBanner() {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn() || !process.env.NEXT_PUBLIC_API_URL) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.impersonatedBy) setInfo({ email: d.user?.email }); })
      .catch(() => {});
  }, []);

  if (!info) return null;

  const stop = async () => {
    setBusy(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/impersonation/stop`, { method: 'POST' });
    } finally {
      window.location.href = '/admin';
    }
  };

  return (
    <div role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, background: '#b91c1c', color: 'white', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', fontSize: 14, fontWeight: 600 }}>
      <span>👁️ Lecture seule : tu vois le site comme <strong>{info.email}</strong> (15 minutes maximum). Rien ne peut être modifié.</span>
      <button onClick={stop} disabled={busy} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid white', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Quitter</button>
    </div>
  );
}
