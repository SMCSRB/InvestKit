'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const box = { maxWidth: 420, width: '100%', background: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: '28px 28px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' };
const input = { width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', background: '#f8fafc' };

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
    return <p role="alert" style={{ color: '#991b1b', fontSize: 14 }}>Lien invalide. <Link href="/forgot-password" style={{ color: '#3b82f6' }}>Demande un nouveau lien</Link>.</p>;
  }
  if (done) {
    return <p role="status" style={{ padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#065f46', fontSize: 13 }}>✅ Mot de passe modifié. Redirection vers la connexion…</p>;
  }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
      <input type="password" autoComplete="new-password" required placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={input} aria-label="Nouveau mot de passe" />
      <input type="password" autoComplete="new-password" required placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={input} aria-label="Confirmer le mot de passe" />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12, color: '#64748b' }}>
        {rules(password).map((r) => <li key={r.label} style={{ color: r.ok ? '#059669' : '#64748b' }}>{r.ok ? '✓' : '○'} {r.label}</li>)}
        <li style={{ color: password && password === confirm ? '#059669' : '#64748b' }}>{password && password === confirm ? '✓' : '○'} les deux mots de passe correspondent</li>
      </ul>
      {message && <p role="alert" style={{ margin: 0, fontSize: 12, color: '#991b1b' }}>❌ {message}</p>}
      <button type="submit" disabled={loading || !valid} style={{ padding: 12, borderRadius: 12, border: 'none', background: valid ? '#3b82f6' : '#94a3b8', color: 'white', fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed' }}>
        {loading ? 'Enregistrement…' : 'Changer mon mot de passe'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={box}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, color: '#0f172a' }}>🔒 Nouveau mot de passe</h1>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>Choisis un mot de passe que tu n'utilises nulle part ailleurs.</p>
        <Suspense fallback={null}><ResetForm /></Suspense>
        <p style={{ marginTop: 18, fontSize: 13 }}><Link href="/login" style={{ color: '#3b82f6' }}>← Retour à la connexion</Link></p>
      </div>
    </main>
  );
}
