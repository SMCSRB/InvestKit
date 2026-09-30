'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout, { AuthHeader } from '@/app/components/landing/AuthLayout';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setSent(true); setMessage(data.message); }
      else setMessage(data.error || 'Une erreur est survenue');
    } catch {
      setMessage('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon={<div className="lp-domain__icon" style={{ margin: '0 auto 14px', width: 56, height: 56 }}><Icon name="lock" size={28} /></div>}
        title="Mot de passe oublié"
        subtitle="Entre l'adresse e-mail de ton compte : nous t'envoyons un lien pour choisir un nouveau mot de passe (valable 1 heure)."
      />
      {sent ? (
        <div className="ik-notice ik-notice--success" role="status" style={{ margin: 0 }}><Icon name="check" size={20} /><p>{message}</p></div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          <div className="ik-field">
            <label className="ik-label" htmlFor="fp-email">Adresse e-mail</label>
            <input id="fp-email" className="ik-input" type="email" autoComplete="email" required placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {message && <div className="ik-notice ik-notice--danger" role="alert" style={{ margin: 0 }}><Icon name="alert" size={20} /><p>{message}</p></div>}
          <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || !email}>{loading ? 'Envoi…' : 'Envoyer le lien'}</Button>
        </form>
      )}
      <p style={{ margin: '18px 0 0', textAlign: 'center' }}><Link href="/login" className="ik-link">← Retour à la connexion</Link></p>
    </AuthLayout>
  );
}
