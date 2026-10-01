'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/app/components/shell/AppShell';

const API = `${process.env.NEXT_PUBLIC_API_URL}/auth`;
const card = { background: 'var(--ik-surface-2)', border: '1px solid color-mix(in srgb, var(--ik-text) 12%, transparent)', borderRadius: 14, padding: 18, marginBottom: 16 };
const input = { padding: '10px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ik-text) 24%, transparent)', background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: 14, width: '100%', maxWidth: 360, display: 'block', marginTop: 4 };
const btn = (danger) => ({ padding: '10px 16px', borderRadius: 10, border: 'none', background: danger ? 'var(--ik-negative)' : 'var(--ik-primary)', color: danger ? 'var(--ik-text-on-negative)' : 'var(--ik-text-on-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' });

export default function MesDonneesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    setReady(true);
  }, [router]);

  const token = () => localStorage.getItem('token');

  const download = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${API}/me/export`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'investkit-mes-donnees.json'; a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: 'Tes données ont été téléchargées (fichier investkit-mes-donnees.json).' });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${API}/me/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ password, confirm, ...(code ? { code } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'TWO_FACTOR_REQUIRED') setNeedCode(true);
        throw new Error(data.error || 'Erreur');
      }
      localStorage.clear();
      router.push('/');
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };

  if (!ready) return null;
  return (
    <AppShell>
    <div style={{ color: 'var(--ik-text-2)', minWidth: 0 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: 'var(--ik-accent)', fontSize: 14 }}>← Tableau de bord</Link>
        <h1 style={{ margin: '8px 0 4px', color: 'var(--ik-text)', fontSize: 'clamp(24px, 5vw, 32px)' }}>Mes données</h1>
        <p style={{ color: 'var(--ik-text-3)', marginTop: 0 }}>Tu as le droit de récupérer tes données et de faire supprimer ton compte. Voir aussi la <Link href="/privacy" style={{ color: 'var(--ik-accent)' }}>politique de confidentialité</Link>.</p>
        {msg && <div role="status" style={{ ...card, borderColor: msg.ok ? '#4ade80' : 'var(--ik-negative)' }}>{msg.text}</div>}

        <section style={card}>
          <h2 style={{ marginTop: 0, color: 'var(--ik-text)', fontSize: 18 }}>Télécharger mes données</h2>
          <p style={{ fontSize: 14, color: 'var(--ik-text-2)' }}>Un fichier contenant ton profil, tes pièces, tes portefeuilles, ta partie Immobilier, ta banque et ton historique de sécurité. Il ne contient jamais ton mot de passe, ton secret de double authentification ni aucun code.</p>
          <button style={btn(false)} disabled={busy} onClick={download}>Télécharger mes données</button>
        </section>

        <section style={{ ...card, borderColor: 'var(--ik-negative)' }}>
          <h2 style={{ marginTop: 0, color: 'var(--ik-text)', fontSize: 18 }}>Supprimer mon compte</h2>
          <p style={{ fontSize: 14, color: 'var(--ik-text-2)' }}><strong>Cette action est définitive.</strong> Toutes tes données de jeu (pièces, portefeuilles, biens, prêts, classement) sont supprimées. Ton abonnement Pro éventuel est annulé d&apos;abord. Le journal de sécurité est conservé sans ton identité. Pense à télécharger tes données avant.</p>
          <label style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Ton mot de passe
            <input style={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {needCode && (
            <label style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Code de double authentification (ou code de secours)
              <input style={input} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
          )}
          <label style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>Pour confirmer, écris <strong>SUPPRIMER</strong>
            <input style={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button style={btn(true)} disabled={busy || confirm !== 'SUPPRIMER' || !password} onClick={remove}>Supprimer définitivement mon compte</button>
        </section>
      </div>
    </div>
    </AppShell>
  );
}
