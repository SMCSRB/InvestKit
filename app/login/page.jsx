'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markLoggedIn } from '@/app/lib/session';
import AuthLayout, { AuthBadge, AuthHeader } from '@/app/components/landing/AuthLayout';
import { LogoMark } from '@/app/components/ui/Logo';
import { Button } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';
import { CodeInput, Confetti, Notice, PasswordField, SuccessMark } from '@/app/components/auth/fields';
import { authPost, errorText } from '@/app/lib/authApi';

// Connexion. Le message d'erreur est volontairement le même pour « adresse inconnue » et « mauvais mot de passe » (aucune fuite sur l'existence d'un compte).
export default function LoginPage() {
  const router = useRouter();
  const { motionEnabled } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempToken, setTempToken] = useState(null); // mot de passe validé, code 2FA attendu
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);       // saisie d'un code de secours (texte) plutôt que des 6 cases
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    try { if (localStorage.getItem('token')) router.push('/dashboard'); } catch { /* ignore */ }
    return () => clearTimeout(timer.current);
  }, [router]);

  const finish = () => {
    markLoggedIn(); // le vrai jeton est dans un cookie httpOnly posé par le serveur
    setDone(true);
    timer.current = setTimeout(() => router.push('/dashboard'), motionEnabled ? 1200 : 300);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    const r = await authPost('login', { email: email.trim(), password });
    setLoading(false);
    if (r.ok && r.data.requires2FA) { setTempToken(r.data.tempToken); setCode(''); setBackup(false); return; }
    if (r.ok) { finish(); return; }
    setError(errorText(r, 'E-mail ou mot de passe incorrect.'));
  };

  const submitCode = async (value) => {
    const c = (value ?? code).trim();
    if (loading || !c) return;
    setLoading(true); setError('');
    const r = await authPost('2fa/login-verify', { tempToken, code: c });
    setLoading(false);
    if (r.ok) { finish(); return; }
    if (r.status === 401 && /expir/i.test(r.data?.error || '')) { setTempToken(null); setCode(''); setError('La vérification a expiré. Reconnecte-toi.'); return; }
    setCode('');
    setError(errorText(r, 'Code incorrect.'));
  };

  if (done) {
    return (
      <AuthLayout mode="login">
        <Confetti run={motionEnabled} />
        <div className="au-success" role="status"><SuccessMark /><h1 style={{ margin: 0, fontSize: 'var(--ik-fs-xl)' }}>Connexion réussie</h1><p className="ik-muted" style={{ margin: 0 }}>On t’emmène sur ton tableau de bord…</p></div>
      </AuthLayout>
    );
  }

  if (tempToken) {
    return (
      <AuthLayout mode="login">
        <AuthHeader icon={<AuthBadge name="shield" />} title="Double authentification" subtitle={backup ? 'Entre l’un de tes codes de secours.' : 'Entre le code à 6 chiffres de ton application d’authentification.'} />
        <form className="au-form" onSubmit={(e) => { e.preventDefault(); submitCode(); }}>
          {backup ? (
            <div className="ik-field">
              <label className="ik-label" htmlFor="login-backup">Code de secours</label>
              <input id="login-backup" className="ik-input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} autoFocus placeholder="XXXX-XXXX" />
              <p className="au-hint">Chaque code de secours ne marche qu’une fois.</p>
            </div>
          ) : (
            <CodeInput label="Code de double authentification" value={code} onChange={setCode} onComplete={submitCode} disabled={loading} status={error ? 'error' : undefined} />
          )}
          {error && <Notice>{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || (backup ? !code.trim() : code.length !== 6)}>{loading ? 'Vérification…' : 'Valider'}</Button>
          <div className="au-row">
            <button type="button" className="ik-link au-link-btn" onClick={() => { setBackup((b) => !b); setCode(''); setError(''); }}>{backup ? 'Utiliser le code à 6 chiffres' : 'Utiliser un code de secours'}</button>
            <button type="button" className="ik-link au-link-btn" onClick={() => { setTempToken(null); setCode(''); setError(''); }}>← Retour</button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="login">
      <AuthHeader icon={<div style={{ display: 'grid', placeItems: 'center', marginBottom: 14 }}><LogoMark size={52} /></div>} title="Content de te revoir" subtitle="Connecte-toi pour retrouver ton portefeuille." />
      <form className="au-form" onSubmit={submitPassword}>
        <div className="ik-field">
          <label className="ik-label" htmlFor="login-email">Adresse e-mail</label>
          <input id="login-email" name="username" className="ik-input" type="email" inputMode="email" autoComplete="username" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" spellCheck={false} required />
        </div>
        <div>
          <div className="au-row" style={{ marginBottom: 6 }}>
            <span />
            <Link href="/forgot-password" className="ik-link">Mot de passe oublié ?</Link>
          </div>
          <PasswordField id="login-password" name="password" label="Mot de passe" autoComplete="current-password" placeholder="" value={password} onChange={setPassword} />
        </div>
        {error && <Notice>{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || !email || !password}>{loading ? 'Connexion…' : 'Se connecter'}</Button>
      </form>
      <p className="au-alt">Pas encore de compte ? <Link href="/signup" className="ik-link">Créer un compte</Link></p>
    </AuthLayout>
  );
}
