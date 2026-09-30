'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;
const LABELS = {
  experience: { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' },
  riskTolerance: { low: 'Prudent', medium: 'Équilibré', high: 'Audacieux' },
  goals: { learn: 'Apprendre', save: 'Épargner', income: 'Gagner un revenu', grow: 'Faire croître mon capital', retire: 'Préparer la retraite' },
  markets: { stocks: 'Bourse / PEA', crypto: 'Crypto', real_estate: 'Immobilier', bonds: 'Obligations' },
};

const card = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 20, marginBottom: 24 };
const chip = (on) => ({ padding: '6px 12px', borderRadius: 16, border: `1px solid ${on ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`, background: on ? 'rgba(59,130,246,0.25)' : 'transparent', color: 'white', fontSize: 13, cursor: 'pointer' });

// Checklist d'accueil : étapes calculées par le serveur sur l'état réel du compte, récompenses d'InvestCoins une seule fois par étape,
// et questionnaire de profil investisseur avec conseil de départ.
export default function OnboardingChecklist() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ experience: 'beginner', riskTolerance: 'medium', goals: [], markets: [] });
  const [showProfile, setShowProfile] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(false);

  const load = useCallback(() => fetch(`${API}/onboarding`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setData(d); if (d.profile) setForm(d.profile); } }).catch(() => {}), []);
  useEffect(() => { try { setHidden(localStorage.getItem('onboardingHidden') === '1'); } catch { /* ignore */ } load(); }, [load]);

  if (!data || hidden) return null;
  const allDone = data.doneCount === data.total && data.claimableCoins === 0;

  const claim = async () => {
    setMsg('');
    const res = await fetch(`${API}/onboarding/claim`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok && d.coins > 0 ? `+${d.coins} 🪙 ajoutés à ton solde !` : (d.error || ''));
    load();
  };
  const toggle = (k, v, max) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : f[k].length < max ? [...f[k], v] : f[k] }));
  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg('');
    const res = await fetch(`${API}/onboarding/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error || 'Enregistrement impossible'); return; }
    setSuggestion(d.suggestion); setShowProfile(false); load();
  };
  const openStep = (s) => { if (s.link === '#profil') setShowProfile(true); else router.push(s.link); };

  return (
    <section style={card} aria-label="Premiers pas">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 17, color: 'white' }}>🚀 Tes premiers pas {allDone && '— terminés, bravo !'}</h3>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{data.doneCount} / {data.total} étapes</div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 6, margin: '12px 0' }} role="progressbar" aria-valuenow={data.doneCount} aria-valuemin={0} aria-valuemax={data.total}>
        <div style={{ width: `${(data.doneCount / data.total) * 100}%`, height: 8, borderRadius: 6, background: 'linear-gradient(90deg, #3b82f6, #10b981)' }} />
      </div>

      {suggestion && (
        <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 12, padding: 12, margin: '8px 0 14px', color: 'white', fontSize: 14 }}>
          <strong>{suggestion.headline}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'rgba(255,255,255,0.8)' }}>{suggestion.steps.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      {data.nextStep && !allDone && (
        <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ color: 'white', fontSize: 14 }}><strong>Prochaine étape :</strong> {data.nextStep.title}<div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{data.nextStep.description}</div></div>
          <button onClick={() => openStep(data.nextStep)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>C'est parti →</button>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {data.steps.map((s) => (
          <li key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: s.done ? 'rgba(255,255,255,0.55)' : 'white' }}>
            <span aria-hidden="true">{s.done ? '✅' : '⬜'}</span>
            <span style={{ flex: 1, textDecoration: s.done ? 'line-through' : 'none' }}>{s.title}</span>
            <span style={{ fontSize: 12, color: s.claimed ? '#6ee7b7' : '#fbbf24' }}>{s.claimed ? 'récompense reçue' : `+${s.reward} 🪙`}</span>
            {!s.done && <button onClick={() => openStep(s)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', fontSize: 12, cursor: 'pointer' }}>Y aller</button>}
          </li>
        ))}
      </ul>

      {data.claimableCoins > 0 && (
        <button onClick={claim} style={{ marginTop: 14, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Récupérer mes {data.claimableCoins} 🪙</button>
      )}
      {msg && <p role="status" style={{ margin: '10px 0 0', fontSize: 13, color: '#6ee7b7' }}>{msg}</p>}

      {showProfile && (
        <form onSubmit={saveProfile} style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.25)', display: 'grid', gap: 14 }} aria-label="Profil d'investisseur">
          <strong style={{ color: 'white' }}>Ton profil d'investisseur</strong>
          <div><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Ton niveau</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.experience).map(([k, v]) => <button type="button" key={k} style={chip(form.experience === k)} onClick={() => setForm({ ...form, experience: k })} aria-pressed={form.experience === k}>{v}</button>)}</div></div>
          <div><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Face à une baisse de 30 % de ton portefeuille, tu es plutôt…</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.riskTolerance).map(([k, v]) => <button type="button" key={k} style={chip(form.riskTolerance === k)} onClick={() => setForm({ ...form, riskTolerance: k })} aria-pressed={form.riskTolerance === k}>{v}</button>)}</div></div>
          <div><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Tes objectifs (un ou plusieurs)</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.goals).map(([k, v]) => <button type="button" key={k} style={chip(form.goals.includes(k))} onClick={() => toggle('goals', k, 5)} aria-pressed={form.goals.includes(k)}>{v}</button>)}</div></div>
          <div><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Ce qui t'attire (un ou plusieurs)</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.markets).map(([k, v]) => <button type="button" key={k} style={chip(form.markets.includes(k))} onClick={() => toggle('markets', k, 4)} aria-pressed={form.markets.includes(k)}>{v}</button>)}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={!form.goals.length || !form.markets.length} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: form.goals.length && form.markets.length ? '#3b82f6' : '#64748b', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
            <button type="button" onClick={() => setShowProfile(false)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Annuler</button>
          </div>
        </form>
      )}

      {allDone && <button onClick={() => { try { localStorage.setItem('onboardingHidden', '1'); } catch { /* ignore */ } setHidden(true); }} style={{ marginTop: 12, background: 'none', border: 'none', color: '#60a5fa', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Masquer cette carte</button>}
    </section>
  );
}
