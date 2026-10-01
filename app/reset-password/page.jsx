'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthLayout, { AuthBadge, AuthHeader } from '@/app/components/landing/AuthLayout';
import { Button } from '@/app/components/ui/primitives';
import { Notice, PasswordField, PasswordRules, StrengthMeter, SuccessMark, passwordOk } from '@/app/components/auth/fields';
import { authPost, errorText } from '@/app/lib/authApi';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const match = password.length > 0 && password === confirm;
  const valid = passwordOk(password) && match;

  const submit = async (e) => {
    e.preventDefault();
    if (loading || !valid) return;
    setLoading(true); setError('');
    const r = await authPost('reset-password', { resetToken: token, newPassword: password });
    setLoading(false);
    if (r.ok) { setDone(true); timer.current = setTimeout(() => router.push('/login'), 2200); }
    else setError(errorText(r, 'Une erreur est survenue.'));
  };

  if (!token) {
    return <><AuthHeader icon={<AuthBadge name="alert" />} title="Lien invalide" subtitle="Ce lien est incomplet ou a expiré." /><Notice>Demande un nouveau lien pour choisir ton mot de passe.</Notice><p className="au-alt"><Link href="/forgot-password" className="ik-link">Recevoir un nouveau lien</Link></p></>;
  }
  if (done) {
    return <div className="au-success" role="status"><SuccessMark /><h1 style={{ margin: 0, fontSize: 'var(--ik-fs-xl)' }}>Mot de passe modifié</h1><p className="ik-muted" style={{ margin: 0 }}>Redirection vers la connexion…</p></div>;
  }
  return (
    <>
      <AuthHeader icon={<AuthBadge name="lock" />} title="Nouveau mot de passe" subtitle="Choisis un mot de passe que tu n’utilises nulle part ailleurs." />
      <form className="au-form" onSubmit={submit}>
        <div>
          <PasswordField label="Nouveau mot de passe" value={password} onChange={setPassword} valid={passwordOk(password)} autoFocus />
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}><StrengthMeter password={password} /><PasswordRules password={password} /></div>
        </div>
        <div>
          <PasswordField label="Confirme ton mot de passe" value={confirm} onChange={setConfirm} valid={match && passwordOk(password)} invalid={confirm.length > 0 && !match} describedBy="rp-match" />
          <p id="rp-match" role="status" className={confirm ? (match ? 'ik-up au-hint' : 'ik-error au-hint') : 'au-hint'} style={{ fontWeight: 700 }}>{confirm ? (match ? 'Les mots de passe correspondent.' : 'Les mots de passe ne correspondent pas encore.') : ''}</p>
        </div>
        {error && <Notice>{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || !valid}>{loading ? 'Enregistrement…' : 'Changer mon mot de passe'}</Button>
      </form>
      <p className="au-alt"><Link href="/login" className="ik-link">← Retour à la connexion</Link></p>
    </>
  );
}

export default function ResetPasswordPage() {
  return <AuthLayout><Suspense fallback={null}><ResetForm /></Suspense></AuthLayout>;
}
