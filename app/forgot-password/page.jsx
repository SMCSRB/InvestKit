'use client';

import { useState } from 'react';
import Link from 'next/link';

const box = { maxWidth: 420, width: '100%', background: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: '28px 28px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' };
const input = { width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', background: '#f8fafc' };

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
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={box}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, color: '#0f172a' }}>🔑 Mot de passe oublié</h1>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>Entre l'adresse e-mail de ton compte : nous t'envoyons un lien pour choisir un nouveau mot de passe (valable 1 heure).</p>
        {sent ? (
          <p role="status" style={{ padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#065f46', fontSize: 13 }}>✅ {message}</p>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <input type="email" required placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={input} aria-label="Adresse e-mail" />
            {message && <p role="alert" style={{ margin: 0, fontSize: 12, color: '#991b1b' }}>❌ {message}</p>}
            <button type="submit" disabled={loading || !email} style={{ padding: '12px', borderRadius: 12, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}
        <p style={{ marginTop: 18, fontSize: 13 }}><Link href="/login" style={{ color: '#3b82f6' }}>← Retour à la connexion</Link></p>
      </div>
    </main>
  );
}
