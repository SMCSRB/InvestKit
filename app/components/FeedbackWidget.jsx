'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isLoggedIn } from '@/app/lib/session';
import Icon from '@/app/components/ui/Icon';

const API = process.env.NEXT_PUBLIC_API_URL;

// Bouton flottant « Un retour ? » pour les joueurs connectés : avis rapide, ou signalement d'un bug / d'une idée (texte libre).
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

  return (
    <div className="ik-fb">
      {open && (
        <div role="dialog" aria-label="Envoyer un retour" className="ik-fb__panel">
          <div className="ik-seg" role="group" aria-label="Type de retour" style={{ marginBottom: 12 }}>
            {[['thumb', 'Avis'], ['bug', 'Bug'], ['idea', 'Idée']].map(([id, label]) => (
              <button key={id} type="button" className="ik-seg__item" aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>
            ))}
          </div>
          {state.done ? (
            <p role="status" className="ik-up" style={{ margin: 0, fontSize: 'var(--ik-fs-sm)', display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="check" size={16} />{state.done}</p>
          ) : mode === 'thumb' ? (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 'var(--ik-fs-sm)', color: 'var(--ik-text-2)' }}>Cette page t&apos;a-t-elle été utile ?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="ik-btn ik-btn--sm" style={{ flex: 1, color: 'var(--ik-positive)' }} disabled={state.busy} onClick={() => send({ kind: 'thumb', rating: 1 })}><Icon name="check" size={16} />Utile</button>
                <button type="button" className="ik-btn ik-btn--sm" style={{ flex: 1, color: 'var(--ik-negative)' }} disabled={state.busy} onClick={() => send({ kind: 'thumb', rating: -1 })}><Icon name="x" size={16} />Pas utile</button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); send({ kind: mode, message }); }}>
              <textarea className="ik-textarea" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={5} maxLength={2000} rows={4}
                placeholder={mode === 'bug' ? 'Que s\'est-il passé ? Sur quelle page ?' : 'Quelle amélioration proposes-tu ?'} aria-label="Ton message" />
              <button type="submit" className="ik-btn ik-btn--primary ik-btn--block" style={{ marginTop: 10 }} disabled={state.busy || message.trim().length < 5}>{state.busy ? 'Envoi…' : 'Envoyer'}</button>
            </form>
          )}
          {state.error && <p role="alert" className="ik-error" style={{ margin: '8px 0 0' }}>{state.error}</p>}
        </div>
      )}
      <button type="button" className="ik-btn ik-btn--sm ik-fb__btn" data-tour="feedback" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name="mail" size={16} />Un retour ?
      </button>
    </div>
  );
}
