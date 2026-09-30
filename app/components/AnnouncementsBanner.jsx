'use client';

import { useEffect, useState } from 'react';
import Icon from '@/app/components/ui/Icon';

const API = process.env.NEXT_PUBLIC_API_URL;
const KEY = 'dismissedAnnouncements';

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
    <div role="status" className={`ik-banner ik-banner--${item.kind === 'maintenance' ? 'warning' : 'info'}`}>
      <Icon name={item.kind === 'maintenance' ? 'alert' : 'info'} size={18} />
      <span><strong>{item.title}</strong>{item.body ? ` — ${item.body}` : ''}</span>
      <button type="button" className="ik-banner__close" onClick={close} aria-label="Fermer l'annonce">Fermer</button>
    </div>
  );
}
