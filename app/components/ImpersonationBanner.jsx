'use client';

import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/app/lib/session';
import Icon from '@/app/components/ui/Icon';

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
    <div role="status" className="ik-banner ik-banner--danger">
      <Icon name="lock" size={18} />
      <span>Lecture seule : tu vois le site comme <strong>{info.email}</strong> (15 minutes maximum). Rien ne peut être modifié.</span>
      <button type="button" className="ik-banner__close" onClick={stop} disabled={busy}>Quitter</button>
    </div>
  );
}
