'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/ui/Icon';
import { downloadMyData } from '@/app/lib/exportData';

const API = process.env.NEXT_PUBLIC_API_URL || '';
export const CONFIRM_PHRASE = 'SUPPRIMER';

// Suppression RÉELLE du compte (POST /auth/me/delete) : mot de passe, code 2FA si activée, et mot « SUPPRIMER » à écrire.
// Le serveur annule l'abonnement d'abord ; si l'annulation échoue, le compte n'est PAS supprimé. Irréversible.
export default function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const reset = () => { setOpen(false); setPassword(''); setCode(''); setConfirm(''); setErr(''); setNeedCode(false); };
  const submit = async (e) => {
    e.preventDefault();
    if (busy || confirm !== CONFIRM_PHRASE) return;
    setBusy(true); setErr('');
    let res;
    try { res = await fetch(`${API}/auth/me/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, code: needCode ? code : undefined, confirm }) }); }
    catch { setBusy(false); setErr('Connexion impossible : ton compte n\'a pas été supprimé. Réessaie.'); return; }
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { if (data.code === 'TWO_FACTOR_REQUIRED') setNeedCode(true); setErr(data.error || 'La suppression a échoué : ton compte n\'a pas été supprimé.'); return; }
    try { localStorage.clear(); } catch { /* ignore */ }
    router.push('/');
  };

  if (!open) return <button type="button" className="pf-btn" style={{ borderColor: 'var(--ik-negative)', color: 'var(--ik-negative)' }} onClick={() => setOpen(true)}><Icon name="alert" size={16} />Supprimer mon compte</button>;
  return (
    <form className="pf-box" onSubmit={submit} aria-label="Supprimer mon compte">
      <p className="pf-hint" style={{ color: 'var(--ik-text)' }}><strong>Irréversible.</strong> Ton compte, ta progression, tes InvestCoins, tes portefeuilles, tes amis et ta photo sont supprimés. Si tu as un abonnement, il est annulé d&apos;abord (s&apos;il ne peut pas l&apos;être, rien n&apos;est supprimé).</p>
      <div className="pf-actions"><button type="button" className="pf-btn pf-btn--ghost" onClick={async () => { const r = await downloadMyData(); setNote(r.ok ? 'Fichier téléchargé.' : r.error); }}>Télécharger mes données avant</button></div>
      {note && <p role="status" className="pf-msg pf-msg--ok">{note}</p>}
      <label className="pf-label" htmlFor="del-pwd">Mot de passe</label>
      <input id="del-pwd" className="pf-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {needCode && (<>
        <label className="pf-label" htmlFor="del-2fa">Code de double authentification</label>
        <input id="del-2fa" className="pf-input" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
      </>)}
      <label className="pf-label" htmlFor="del-confirm">Écris {CONFIRM_PHRASE} pour confirmer</label>
      <input id="del-confirm" className="pf-input" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {err && <p role="alert" className="pf-msg pf-msg--err">{err}</p>}
      <div className="pf-actions">
        <button type="submit" className="pf-btn" style={{ borderColor: 'var(--ik-negative)', background: 'color-mix(in srgb, var(--ik-negative) 25%, transparent)' }} disabled={busy || confirm !== CONFIRM_PHRASE || !password}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</button>
        <button type="button" className="pf-btn pf-btn--ghost" onClick={reset}>Annuler</button>
      </div>
    </form>
  );
}
