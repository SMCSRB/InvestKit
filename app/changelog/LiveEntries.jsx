'use client';

import { useEffect, useState } from 'react';

// Nouveautés publiées depuis l'administration (annonces de type « new »), affichées avant la liste écrite dans le code.
export default function LiveEntries() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_URL) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/announcements`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems((d?.announcements || []).filter((a) => a.kind === 'new')))
      .catch(() => {});
  }, []);
  return items.map((a) => (
    <section key={a.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: '#94a3b8' }}>{a.published_at ? new Date(a.published_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}</div>
      <h2 style={{ fontSize: 20, margin: '4px 0 12px', color: '#fff' }}>{a.title}</h2>
      <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.body}</p>
    </section>
  ));
}
