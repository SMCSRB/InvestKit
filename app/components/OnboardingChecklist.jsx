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

const card = { background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--ik-text) 12%, transparent)', borderRadius: 16, padding: 20, marginBottom: 24 };
const chip = (on) => ({ padding: '6px 12px', borderRadius: 16, border: `1px solid ${on ? 'var(--ik-primary)' : 'color-mix(in srgb, var(--ik-text) 20%, transparent)'}`, background: on ? 'color-mix(in srgb, var(--ik-primary) 25%, transparent)' : 'transparent', color: 'var(--ik-text)', fontSize: 13, cursor: 'pointer' });

// Checklist d'accueil : étapes calculées par le serveur sur l'état réel du compte, récompenses d'InvestCoins une seule fois par étape,
// et questionnaire de profil investisseur avec conseil de départ.
export default function OnboardingChecklist() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ experience: 'beginner', riskTolerance: 'medium', goals: [], markets: [] });
  const [showProfile, setShowProfile] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(() => { try { return typeof window !== 'undefined' && localStorage.getItem('onboardingHidden') === '1'; } catch { return false; } });
  const [failed, setFailed] = useState(false);

  const load = useCallback((initial) => fetch(`${API}/onboarding`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setData(d); if (d.profile) setForm(d.profile); } else if (initial) setFailed(true); }).catch(() => { if (initial) setFailed(true); }), []);
  useEffect(() => { if (!hidden) load(true); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (hidden || failed) return null;
  // Emplacement réservé pendant le chargement : évite que tout le tableau de bord saute quand la carte apparaît.
  if (!data) return <div className="dash-onb-skel ik-skeleton" aria-hidden="true" />;
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
        <h2 style={{ margin: 0, fontSize: 17, color: 'var(--ik-text)' }}>🚀 Tes premiers pas {allDone && '— terminés, bravo !'}</h2>
        <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 70%, transparent)' }}>{data.doneCount} / {data.total} étapes</div>
      </div>
      <div style={{ height: 8, background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)', borderRadius: 6, margin: '12px 0' }} role="progressbar" aria-label="Avancement des premiers pas" aria-valuenow={data.doneCount} aria-valuemin={0} aria-valuemax={data.total}>
        <div style={{ width: `${(data.doneCount / data.total) * 100}%`, height: 8, borderRadius: 6, background: 'linear-gradient(90deg, var(--ik-primary), var(--ik-positive))' }} />
      </div>

      {suggestion && (
        <div style={{ background: 'color-mix(in srgb, var(--ik-positive) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--ik-positive) 40%, transparent)', borderRadius: 12, padding: 12, margin: '8px 0 14px', color: 'var(--ik-text)', fontSize: 14 }}>
          <strong>{suggestion.headline}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'color-mix(in srgb, var(--ik-text) 80%, transparent)' }}>{suggestion.steps.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      {data.nextStep && !allDone && (
        <div style={{ background: 'color-mix(in srgb, var(--ik-primary) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--ik-primary) 40%, transparent)', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ color: 'var(--ik-text)', fontSize: 14 }}><strong>Prochaine étape :</strong> {data.nextStep.title}<div style={{ fontSize: 12, color: 'color-mix(in srgb, var(--ik-text) 65%, transparent)' }}>{data.nextStep.description}</div></div>
          <button onClick={() => openStep(data.nextStep)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--ik-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>C'est parti →</button>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {data.steps.map((s) => (
          <li key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: s.done ? 'color-mix(in srgb, var(--ik-text) 55%, transparent)' : 'var(--ik-text)' }}>
            <span aria-hidden="true">{s.done ? '✅' : '⬜'}</span>
            <span style={{ flex: 1, textDecoration: s.done ? 'line-through' : 'none' }}>{s.title}</span>
            <span style={{ fontSize: 12, color: s.claimed ? 'var(--ik-positive)' : 'var(--ik-warning)' }}>{s.claimed ? 'récompense reçue' : `+${s.reward} 🪙`}</span>
            {!s.done && <button onClick={() => openStep(s)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid color-mix(in srgb, var(--ik-text) 25%, transparent)', background: 'transparent', color: 'var(--ik-text)', fontSize: 12, cursor: 'pointer' }}>Y aller</button>}
          </li>
        ))}
      </ul>

      {data.claimableCoins > 0 && (
        <button onClick={claim} style={{ marginTop: 14, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--ik-positive)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Récupérer mes {data.claimableCoins} 🪙</button>
      )}
      {msg && <p role="status" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ik-positive)' }}>{msg}</p>}

      {showProfile && (
        <form onSubmit={saveProfile} style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'color-mix(in srgb, var(--ik-text) 6%, transparent)', display: 'grid', gap: 14 }} aria-label="Profil d'investisseur">
          <strong style={{ color: 'var(--ik-text)' }}>Ton profil d'investisseur</strong>
          <div><div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 70%, transparent)', marginBottom: 6 }}>Ton niveau</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.experience).map(([k, v]) => <button type="button" key={k} style={chip(form.experience === k)} onClick={() => setForm({ ...form, experience: k })} aria-pressed={form.experience === k}>{v}</button>)}</div></div>
          <div><div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 70%, transparent)', marginBottom: 6 }}>Face à une baisse de 30 % de ton portefeuille, tu es plutôt…</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.riskTolerance).map(([k, v]) => <button type="button" key={k} style={chip(form.riskTolerance === k)} onClick={() => setForm({ ...form, riskTolerance: k })} aria-pressed={form.riskTolerance === k}>{v}</button>)}</div></div>
          <div><div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 70%, transparent)', marginBottom: 6 }}>Tes objectifs (un ou plusieurs)</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.goals).map(([k, v]) => <button type="button" key={k} style={chip(form.goals.includes(k))} onClick={() => toggle('goals', k, 5)} aria-pressed={form.goals.includes(k)}>{v}</button>)}</div></div>
          <div><div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 70%, transparent)', marginBottom: 6 }}>Ce qui t'attire (un ou plusieurs)</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Object.entries(LABELS.markets).map(([k, v]) => <button type="button" key={k} style={chip(form.markets.includes(k))} onClick={() => toggle('markets', k, 4)} aria-pressed={form.markets.includes(k)}>{v}</button>)}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={!form.goals.length || !form.markets.length} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: form.goals.length && form.markets.length ? 'var(--ik-primary)' : 'var(--ik-text-3)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
            <button type="button" onClick={() => setShowProfile(false)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ik-text) 25%, transparent)', background: 'transparent', color: 'var(--ik-text)', cursor: 'pointer' }}>Annuler</button>
          </div>
        </form>
      )}

      {allDone && <button onClick={() => { try { localStorage.setItem('onboardingHidden', '1'); } catch { /* ignore */ } setHidden(true); }} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--ik-accent)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>Masquer cette carte</button>}
    </section>
  );
}
