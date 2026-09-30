'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout, { AuthHeader } from '@/app/components/landing/AuthLayout';
import Icon from '@/app/components/ui/Icon';
import { Button } from '@/app/components/ui/primitives';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { kind, text }
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const verificationEmail = sessionStorage.getItem('verificationEmail');
    if (!verificationEmail) {
      router.push('/signup');
    } else {
      setEmail(verificationEmail);
    }
  }, [router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^[0-9]*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setMessage({ kind: 'danger', text: 'Entre le code à 6 chiffres' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ kind: 'success', text: 'Email vérifié !' });
        sessionStorage.setItem('userEmail', email);
        setTimeout(() => router.push('/onboarding'), 1500);
      } else {
        setMessage({ kind: 'danger', text: data.error || 'Code invalide' });
      }
    } catch (error) {
      setMessage({ kind: 'danger', text: 'Erreur de connexion au serveur' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage({ kind: 'success', text: 'Code renvoyé avec succès' });
        setResendTimer(60);
      } else {
        setMessage({ kind: 'danger', text: 'Erreur lors de l\'envoi du code' });
      }
    } catch (error) {
      setMessage({ kind: 'danger', text: 'Erreur de connexion' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon={<div className="lp-domain__icon" style={{ margin: '0 auto 14px', width: 56, height: 56 }}><Icon name="mail" size={28} /></div>}
        title="Vérifie ton email"
        subtitle={<>Nous avons envoyé un code à<br /><strong style={{ color: 'var(--ik-text)', wordBreak: 'break-all' }}>{email}</strong></>}
      />
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
        <div className="ik-field">
          <label className="ik-label" htmlFor="code-0" style={{ textAlign: 'center' }}>Code de vérification (6 chiffres)</label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} role="group" aria-label="Code à 6 chiffres">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                className="ik-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={1}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                autoFocus={index === 0}
                aria-label={`Chiffre ${index + 1} sur 6`}
                required
                style={{ width: 'clamp(40px, 12vw, 52px)', height: 56, padding: 0, textAlign: 'center', fontSize: 'var(--ik-fs-lg)', fontWeight: 800, borderColor: digit ? 'var(--ik-positive)' : undefined }}
              />
            ))}
          </div>
        </div>

        {message && (
          <div className={`ik-notice ik-notice--${message.kind}`} role={message.kind === 'danger' ? 'alert' : 'status'} style={{ margin: 0 }}>
            <Icon name={message.kind === 'success' ? 'check' : 'alert'} size={20} /><p>{message.text}</p>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" block loading={loading} disabled={loading || code.join('').length !== 6}>{loading ? 'Vérification…' : 'Vérifier le code'}</Button>
        <Button variant="ghost" block onClick={handleResendCode} disabled={resendTimer > 0 || loading}>{resendTimer > 0 ? `Renvoyer dans ${resendTimer} s` : 'Renvoyer le code'}</Button>
      </form>
      <p style={{ margin: '18px 0 0', textAlign: 'center' }}><Link href="/signup" className="ik-link">← Retour à l&apos;inscription</Link></p>
    </AuthLayout>
  );
}
