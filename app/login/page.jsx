'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markLoggedIn } from '@/app/lib/session';
import AuthLayout, { AuthHeader } from '@/app/components/landing/AuthLayout';
import { LogoMark } from '@/app/components/ui/Logo';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { kind: 'success' | 'danger' | 'info', text }
  const [tempToken, setTempToken] = useState(null); // connexion en attente du code 2FA
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const finishLogin = () => {
    setMessage({ kind: 'success', text: 'Connexion réussie !' });
    markLoggedIn(); // le vrai jeton est dans un cookie httpOnly posé par le serveur
    setTimeout(() => router.push('/dashboard'), 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/${tempToken ? '2fa/login-verify' : 'login'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tempToken ? { tempToken, code: code.trim() } : { email, password }),
        }
      );

      const data = await response.json();
      if (response.ok && data.requires2FA) {
        setTempToken(data.tempToken);
        setMessage({ kind: 'info', text: 'Entre le code à 6 chiffres de ton application d\'authentification (ou un code de secours).' });
      } else if (response.ok) {
        finishLogin();
      } else {
        if (tempToken && response.status === 401 && /expir/i.test(data.error || '')) { setTempToken(null); setCode(''); }
        setMessage({ kind: 'danger', text: data.error || 'Email ou mot de passe incorrect' });
      }
    } catch (error) {
      setMessage({ kind: 'danger', text: 'Erreur de connexion au serveur' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader icon={<div style={{ display: 'grid', placeItems: 'center', marginBottom: 14 }}><LogoMark size={52} /></div>} title="Connexion" subtitle="Accède à ton compte InvestKit" />

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div className="ik-field">
          <label className="ik-label" htmlFor="login-email">Email</label>
          <input id="login-email" className="ik-input" type="email" autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="ik-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="ik-label" htmlFor="login-password">Mot de passe</label>
            <Link href="/forgot-password" className="ik-link">Mot de passe oublié ?</Link>
          </div>
          <div className="ik-input-wrap">
            <input id="login-password" className="ik-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button variant="ghost" size="sm" icon={showPassword ? 'eyeOff' : 'eye'} className="ik-input-wrap__btn" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} />
          </div>
        </div>

        {tempToken && (
          <div className="ik-field">
            <label className="ik-label" htmlFor="code2fa">Code de double authentification</label>
            <input id="code2fa" className="ik-input" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
          </div>
        )}

        {message && (
          <div className={`ik-notice ik-notice--${message.kind}`} role={message.kind === 'danger' ? 'alert' : 'status'} style={{ margin: 0 }}>
            <Icon name={message.kind === 'success' ? 'check' : message.kind === 'danger' ? 'alert' : 'shield'} size={20} />
            <p>{message.text}</p>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || !email || !password}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <p className="ik-muted" style={{ margin: '20px 0 0', textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--ik-border)' }}>
        Pas encore de compte ? <Link href="/signup" className="ik-link">Créer un compte</Link>
      </p>
    </AuthLayout>
  );
}
