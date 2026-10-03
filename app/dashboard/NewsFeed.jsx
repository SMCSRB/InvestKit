'use client';

import { useEffect, useState } from 'react';
import Icon from '@/app/components/ui/Icon';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const KIND = { new: { icon: 'sparkles', label: 'Nouveauté' }, info: { icon: 'info', label: 'Information' }, maintenance: { icon: 'alert', label: 'Maintenance' } };

// Actualités : uniquement les annonces RÉELLES publiées par l'équipe depuis l'administration (mêmes données que le bandeau d'information).
// Plus de fausses actualités (cours de Bourse, gains, alertes) : sans annonce, un état vide honnête.
export default function NewsFeed() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  useEffect(() => {
    let alive = true;
    fetch(`${API}/announcements`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) setState({ status: 'ok', items: d.announcements || [] }); })
      .catch(() => { if (alive) setState({ status: 'error', items: [] }); });
    return () => { alive = false; };
  }, []);

  if (state.status === 'loading') return <p role="status" style={{ color: 'var(--ik-text-3)', margin: 0 }}>Chargement…</p>;
  if (state.status === 'error') return <p role="alert" style={{ color: 'var(--ik-text-2)', margin: 0 }}>Impossible de charger les actualités pour le moment.</p>;
  if (!state.items.length) {
    return (
      <div style={{ textAlign: 'center', padding: '28px 8px', color: 'var(--ik-text-2)' }}>
        <Icon name="newspaper" size={28} />
        <p style={{ margin: '10px 0 4px', fontWeight: 700, color: 'var(--ik-text)' }}>Aucune actualité pour le moment</p>
        <p style={{ margin: 0, fontSize: 13 }}>Les annonces de l&apos;équipe InvestKit (nouveautés, maintenances) s&apos;afficheront ici.</p>
      </div>
    );
  }
  return state.items.map((a) => {
    const k = KIND[a.kind] || KIND.info;
    return (
      <article key={a.id} style={{ background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)', borderLeft: '4px solid var(--ik-primary)', borderRadius: 16, padding: 18, flex: '0 0 auto' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
          <span aria-hidden="true" style={{ marginTop: 2 }}><Icon name={k.icon} size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ik-text)', margin: '0 0 4px' }}>{a.title}</p>
            {a.body ? <p style={{ fontSize: 13, color: 'var(--ik-text-2)', margin: 0, overflowWrap: 'anywhere' }}>{a.body}</p> : null}
          </div>
          <span style={{ fontSize: 11, color: 'var(--ik-text-3)', whiteSpace: 'nowrap' }}>{k.label}{a.published_at ? ` · ${new Date(a.published_at).toLocaleDateString('fr-FR')}` : ''}</span>
        </div>
      </article>
    );
  });
}
