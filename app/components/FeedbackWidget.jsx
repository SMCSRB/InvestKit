'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isLoggedIn } from '@/app/lib/session';

const API = process.env.NEXT_PUBLIC_API_URL;

// Bouton flottant « Un retour ? » pour les joueurs connectés : 👍/👎 rapide, ou signalement d'un bug / d'une idée (texte libre).
export default function FeedbackWidget() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('thumb'); // thumb | bug | idea
  const [message, setMessage] = useState('');
  const [state, setState] = useState({ busy: false, done: '', error: '' });

  useEffect(() => { setVisible(isLoggedIn() && !pathname.startsWith('/admin') && !pathname.startsWith('/login')); }, [pathname]);
  useEffect(() => { if (!open) setState({ busy: false, done: '', error: '' }); }, [open]);
  if (!visible || !API) return null;

  const send = async (body) => {
    setState({ busy: true, done: '', error: '' });
    try {
      const res = await fetch(`${API}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, page: pathname }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Envoi impossible');
      setState({ busy: false, done: 'Merci ! Ton retour a bien été envoyé.', error: '' });
      setMessage('');
    } catch (e) {
      setState({ busy: false, done: '', error: e.message });
    }
  };

  const tab = (id, label) => (
    <button type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: mode === id ? '#3b82f6' : 'transparent', color: 'white', fontSize: 12, cursor: 'pointer' }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9000, fontFamily: 'inherit' }}>
      {open && (
        <div role="dialog" aria-label="Envoyer un retour" style={{ width: 300, maxWidth: 'calc(100vw - 32px)', marginBottom: 10, padding: 14, borderRadius: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>{tab('thumb', '👍 👎 Avis')}{tab('bug', '🐞 Bug')}{tab('idea', '💡 Idée')}</div>
          {state.done ? (
            <p role="status" style={{ margin: 0, fontSize: 13, color: '#6ee7b7' }}>✅ {state.done}</p>
          ) : mode === 'thumb' ? (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13 }}>Cette page t'a-t-elle été utile ?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" disabled={state.busy} onClick={() => send({ kind: 'thumb', rating: 1 })} style={{ flex: 1, padding: 10, fontSize: 22, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(16,185,129,0.15)', cursor: 'pointer' }} aria-label="Utile">👍</button>
                <button type="button" disabled={state.busy} onClick={() => send({ kind: 'thumb', rating: -1 })} style={{ flex: 1, padding: 10, fontSize: 22, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(244,63,94,0.15)', cursor: 'pointer' }} aria-label="Pas utile">👎</button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); send({ kind: mode, message }); }}>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={5} maxLength={2000} rows={4}
                placeholder={mode === 'bug' ? 'Que s\'est-il passé ? Sur quelle page ?' : 'Quelle amélioration proposes-tu ?'}
                aria-label="Ton message" style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#1a1a2e', color: 'white', fontSize: 13 }} />
              <button type="submit" disabled={state.busy || message.trim().length < 5} style={{ marginTop: 8, width: '100%', padding: 9, borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>{state.busy ? 'Envoi…' : 'Envoyer'}</button>
            </form>
          )}
          {state.error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 12, color: '#fda4af' }}>❌ {state.error}</p>}
        </div>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ padding: '10px 14px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.25)', background: '#1e293b', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
        💬 Un retour ?
      </button>
    </div>
  );
}
