'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout, { AuthBadge, AuthHeader } from '@/app/components/landing/AuthLayout';
import { Button } from '@/app/components/ui/primitives';
import { Notice, SuccessMark } from '@/app/components/auth/fields';
import { authPost, errorText } from '@/app/lib/authApi';

// Mot de passe oublié : la réponse est la même que l'adresse ait un compte ou non (le serveur et cet écran ne le révèlent jamais).
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    const r = await authPost('forgot-password', { email: email.trim() });
    setLoading(false);
    if (r.ok) setSent(true); else setError(errorText(r, 'Une erreur est survenue. Réessaie dans un instant.'));
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="au-success" role="status">
          <SuccessMark />
          <h1 style={{ margin: 0, fontSize: 'var(--ik-fs-xl)' }}>Vérifie ta boîte mail</h1>
          <p className="ik-muted" style={{ margin: 0 }}>Si un compte correspond à cette adresse, un lien pour choisir un nouveau mot de passe vient d’être envoyé (valable 1 heure). Pense à regarder tes courriers indésirables.</p>
        </div>
      ) : (
        <>
          <AuthHeader icon={<AuthBadge name="lock" />} title="Mot de passe oublié" subtitle="Entre l’adresse e-mail de ton compte : on t’envoie un lien pour en choisir un nouveau." />
          <form className="au-form" onSubmit={submit}>
            <div className="ik-field">
              <label className="ik-label" htmlFor="fp-email">Adresse e-mail</label>
              <input id="fp-email" className="ik-input" type="email" inputMode="email" autoComplete="email" required placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" spellCheck={false} autoFocus />
            </div>
            {error && <Notice>{error}</Notice>}
            <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || !email}>{loading ? 'Envoi…' : 'Envoyer le lien'}</Button>
          </form>
        </>
      )}
      <p className="au-alt"><Link href="/login" className="ik-link">← Retour à la connexion</Link></p>
    </AuthLayout>
  );
}
