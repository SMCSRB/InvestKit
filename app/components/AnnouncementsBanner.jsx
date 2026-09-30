'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const KEY = 'dismissedAnnouncements';
const COLORS = { info: '#1d4ed8', maintenance: '#b45309' };

const readDismissed = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

// Bandeau d'information géré depuis l'administration (annonces « info » et « maintenance » publiées). Fermable, mémorisé par annonce.
export default function AnnouncementsBanner() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (!API) return;
    fetch(`${API}/announcements`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const dismissed = readDismissed();
        const a = d?.announcements?.find((x) => x.kind !== 'new' && !dismissed.includes(x.id));
        if (a) setItem(a);
      })
      .catch(() => {});
  }, []);

  if (!item) return null;
  const close = () => { try { localStorage.setItem(KEY, JSON.stringify([...readDismissed(), item.id].slice(-50))); } catch { /* ignore */ } setItem(null); };

  return (
    <div role="status" style={{ background: COLORS[item.kind] || COLORS.info, color: 'white', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', fontSize: 14 }}>
      <span>{item.kind === 'maintenance' ? '🔧' : 'ℹ️'} <strong>{item.title}</strong>{item.body ? ` — ${item.body}` : ''}</span>
      <button onClick={close} aria-label="Fermer l'annonce" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.6)', color: 'white', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}>Fermer</button>
    </div>
  );
}
