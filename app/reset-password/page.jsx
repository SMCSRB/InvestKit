'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthLayout, { AuthHeader } from '@/app/components/landing/AuthLayout';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';

const rules = (p) => [
  { ok: p.length >= 8, label: '8 caractères minimum' },
  { ok: /[A-Z]/.test(p), label: 'une majuscule' },
  { ok: /[a-z]/.test(p), label: 'une minuscule' },
  { ok: /[0-9]/.test(p), label: 'un chiffre' },
];

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const valid = rules(password).every((r) => r.ok) && password === confirm;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) { setDone(true); setTimeout(() => router.push('/login'), 2500); }
      else setMessage(data.error || 'Une erreur est survenue');
    } catch {
      setMessage('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="ik-notice ik-notice--danger" role="alert" style={{ margin: 0 }}><Icon name="alert" size={20} /><p>Lien invalide. <Link href="/forgot-password" className="ik-link">Demande un nouveau lien</Link>.</p></div>;
  }
  if (done) {
    return <div className="ik-notice ik-notice--success" role="status" style={{ margin: 0 }}><Icon name="check" size={20} /><p>Mot de passe modifié. Redirection vers la connexion…</p></div>;
  }
  const matches = !!password && password === confirm;
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div className="ik-field">
        <label className="ik-label" htmlFor="rp-new">Nouveau mot de passe</label>
        <input id="rp-new" className="ik-input" type="password" autoComplete="new-password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="ik-field">
        <label className="ik-label" htmlFor="rp-confirm">Confirmer le mot de passe</label>
        <input id="rp-confirm" className="ik-input" type="password" autoComplete="new-password" required placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
        {[...rules(password), { ok: matches, label: 'les deux mots de passe correspondent' }].map((r) => (
          <li key={r.label} className={r.ok ? 'ik-up' : ''} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--ik-fs-sm)', color: r.ok ? undefined : 'var(--ik-text-3)' }}>
            <Icon name={r.ok ? 'check' : 'x'} size={15} strokeWidth={2.4} />{r.label}<span className="ik-sr-only">{r.ok ? ' (rempli)' : ' (à remplir)'}</span>
          </li>
        ))}
      </ul>
      {message && <div className="ik-notice ik-notice--danger" role="alert" style={{ margin: 0 }}><Icon name="alert" size={20} /><p>{message}</p></div>}
      <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || !valid}>{loading ? 'Enregistrement…' : 'Changer mon mot de passe'}</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthHeader
        icon={<div className="lp-domain__icon" style={{ margin: '0 auto 14px', width: 56, height: 56 }}><Icon name="lock" size={28} /></div>}
        title="Nouveau mot de passe"
        subtitle="Choisis un mot de passe que tu n'utilises nulle part ailleurs."
      />
      <Suspense fallback={null}><ResetForm /></Suspense>
      <p style={{ margin: '18px 0 0', textAlign: 'center' }}><Link href="/login" className="ik-link">← Retour à la connexion</Link></p>
    </AuthLayout>
  );
}
