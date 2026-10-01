'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout, { AuthBadge, AuthHeader } from '@/app/components/landing/AuthLayout';
import { Button } from '@/app/components/ui/primitives';
import { useTheme } from '@/app/context/ThemeContext';
import { CodeInput, Confetti, Notice, SuccessMark } from '@/app/components/auth/fields';
import { authPost, errorText } from '@/app/lib/authApi';

// Vérification de l'e-mail : code à 6 chiffres en cases séparées (collage accepté), envoi automatique à la saisie du 6e chiffre.
// Les messages restent neutres : on ne dit jamais si l'adresse existe.
export default function VerifyEmailPage() {
  const router = useRouter();
  const { motionEnabled } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { kind, text }
  const [timer, setTimer] = useState(0);
  const [done, setDone] = useState(false);
  const redirect = useRef(null);

  useEffect(() => {
    let mail = null;
    // Le bouton du mail ouvre /verify-email?email=… : on l'accepte s'il ressemble à une adresse (le serveur revérifie tout).
    try {
      const fromLink = new URLSearchParams(window.location.search).get('email');
      if (fromLink && /^[^\s@]{1,64}@[^\s@]{1,255}$/.test(fromLink)) { mail = fromLink; sessionStorage.setItem('verificationEmail', fromLink); }
    } catch { /* ignore */ }
    if (!mail) { try { mail = sessionStorage.getItem('verificationEmail'); } catch { /* ignore */ } }
    if (!mail) router.push('/signup'); else setEmail(mail);
    return () => clearTimeout(redirect.current);
  }, [router]);

  useEffect(() => {
    if (timer <= 0) return undefined;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const verify = async (value) => {
    const c = value ?? code;
    if (loading || c.length !== 6) return;
    setLoading(true); setMsg(null);
    const r = await authPost('verify-email', { email, code: c });
    setLoading(false);
    if (r.ok) {
      try { sessionStorage.setItem('userEmail', email); } catch { /* ignore */ }
      setDone(true);
      redirect.current = setTimeout(() => router.push('/onboarding'), motionEnabled ? 1500 : 400);
    } else {
      setCode('');
      setMsg({ kind: 'danger', text: errorText(r, 'Code invalide ou expiré.') });
    }
  };

  const resend = async () => {
    setLoading(true); setMsg(null);
    const r = await authPost('resend-code', { email });
    setLoading(false);
    if (r.ok) { setMsg({ kind: 'success', text: 'Si l’adresse est valide, un nouveau code vient d’être envoyé.' }); setTimer(60); setCode(''); }
    else setMsg({ kind: 'danger', text: errorText(r, 'Impossible d’envoyer le code pour le moment.') });
  };

  if (done) {
    return <AuthLayout><Confetti run={motionEnabled} /><div className="au-success" role="status"><SuccessMark /><h1 style={{ margin: 0, fontSize: 'var(--ik-fs-xl)' }}>E-mail vérifié !</h1><p className="ik-muted" style={{ margin: 0 }}>On prépare ton compte…</p></div></AuthLayout>;
  }

  return (
    <AuthLayout>
      <AuthHeader icon={<AuthBadge name="mail" />} title="Vérifie ton e-mail" subtitle={<>Si l’adresse est valide, un code à 6 chiffres vient d’être envoyé à<br /><strong style={{ color: 'var(--ik-text)', wordBreak: 'break-all' }}>{email}</strong></>} />
      <form className="au-form" onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <div className="ik-field">
          <span className="ik-label" style={{ textAlign: 'center' }}>Code de vérification</span>
          <CodeInput label="Code de vérification à 6 chiffres" value={code} onChange={setCode} onComplete={verify} disabled={loading} status={msg?.kind === 'danger' ? 'error' : undefined} />
          <p className="au-hint" style={{ textAlign: 'center' }}>Tu peux coller le code d’un seul coup. Il est valable 15 minutes.</p>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || code.length !== 6}>{loading ? 'Vérification…' : 'Vérifier le code'}</Button>
        <Button variant="ghost" block onClick={resend} disabled={timer > 0 || loading}>{timer > 0 ? `Renvoyer le code dans ${timer} s` : 'Renvoyer le code'}</Button>
      </form>
      <p className="au-alt"><Link href="/signup" className="ik-link">← Retour à l’inscription</Link></p>
    </AuthLayout>
  );
}
