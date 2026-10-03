'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/app/components/ui/primitives';
import { social } from '@/app/lib/social';

const RE = /^[A-Za-z0-9]{3,12}$/;
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Choisir la partie après le # (membres Pro). Les règles sont rappelées ici, mais c'est le SERVEUR qui décide.
export default function TagEditor({ open, onClose, me, onChanged }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!open) return;
    setValue(''); setError(''); setHistory(null);
    social.tagHistory().then((r) => setHistory(r.history)).catch(() => setHistory([]));
  }, [open]);

  if (!me) return null;
  const ok = RE.test(value);
  const submit = async (e) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setError('');
    try { await social.changeTag(value); onChanged?.(); onClose(); }
    catch (err) { setError(err.message || 'Changement impossible'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Choisir mon #">
      {!me.canCustomize ? (
        <div className="tg-form">
          <p className="tg-hint">Choisir ton propre # est réservé aux membres Pro. Tu gardes un # automatique ({me.tag ? `#${me.tag}` : '…'}) ; tes amis te retrouvent avec <strong>{me.identity}</strong>.</p>
          {me.restorable ? <p className="tg-hint">Ton ancien # <strong>#{me.restorable}</strong> te sera rendu si tu redeviens Pro bientôt.</p> : null}
          <Button variant="primary" href="/dashboard?tab=settings&section=billing" onClick={onClose}>Voir les offres</Button>
        </div>
      ) : (
        <form className="tg-form" onSubmit={submit}>
          <p className="tg-hint">Ton identifiant : <strong>{me.identity}</strong>. Tes amis restent tes amis quand tu changes de #.</p>
          <label htmlFor="tg-value" className="ik-muted">Nouveau # (3 à 12 lettres ou chiffres, sans accent)</label>
          <div className="tg-input">
            <span className="tg-input__prefix" aria-hidden="true">{me.username}#</span>
            <input id="tg-value" className="ik-input" value={value} onChange={(e) => setValue(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12))}
              placeholder="ex. Alpha26" autoComplete="off" spellCheck={false} disabled={!me.canChangeNow} aria-describedby="tg-rules" />
          </div>
          {value && ok ? <p className="tg-hint">Aperçu : <strong>{me.username}#{value}</strong></p> : null}
          {!me.canChangeNow && me.nextChangeAt ? <p className="tg-err" role="status">Tu as déjà changé ton # ce mois-ci : prochain changement possible le {dateFr(me.nextChangeAt)}.</p> : null}
          {error ? <p className="tg-err" role="alert">{error}</p> : null}
          <p id="tg-rules" className="tg-hint">Un changement par mois. Certains mots sont interdits, et le # ne doit pas ressembler au pseudo d’un autre joueur. Ton ancien # reste réservé 30 jours.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
            <Button variant="primary" type="submit" loading={busy} disabled={!ok || !me.canChangeNow}>Enregistrer mon #</Button>
          </div>
          {history && history.length > 0 ? (
            <details>
              <summary className="ik-muted">Historique de mes #</summary>
              <ul className="tg-hist">{history.map((h, i) => <li key={i}>{dateFr(h.changedAt)} : #{h.oldTag ?? '—'} → #{h.newTag}</li>)}</ul>
            </details>
          ) : null}
        </form>
      )}
    </Modal>
  );
}
