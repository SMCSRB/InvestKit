'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const tone = (s) => (s < 25 ? '#10b981' : s < 50 ? '#3b82f6' : s < 75 ? '#f59e0b' : '#ef4444');
const fr = (n) => Number(n).toLocaleString('fr-FR');

// Score de risque décomposé du portefeuille simulé (Bourse ou Crypto), calculé par le serveur (voir docs/moteur-risque.md).
export default function PortfolioRisk({ domain, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!API) return;
    let cancelled = false;
    setError('');
    fetch(`${API}/risk/portfolio?domain=${encodeURIComponent(domain)}`)
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Indisponible'); return d; })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [domain, refreshKey]);

  const box = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginTop: 24 };
  if (error) return <div style={box}><p style={{ margin: 0, color: '#fda4af', fontSize: 13 }}>Risque du portefeuille : {error}</p></div>;
  if (!data) return null;
  if (data.empty) return <div style={box}><h3 style={{ fontSize: 15, margin: '0 0 6px', color: 'white' }}>🎯 Risque de ton portefeuille</h3><p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{data.message}</p></div>;

  const s = data.score;
  const top = [...s.factors].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <h3 style={{ fontSize: 15, margin: 0, color: 'white' }}>🎯 Risque de ton portefeuille</h3>
        <div style={{ fontSize: 22, fontWeight: 800, color: tone(s.score) }} aria-label={`Score de risque ${s.score} sur 100, ${s.label}`}>{s.score}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}> / 100 · {s.label}</span></div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 6, margin: '10px 0' }}><div style={{ width: `${s.score}%`, height: 8, borderRadius: 6, background: tone(s.score) }} /></div>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
        Pire crise historique pour ce portefeuille : <strong style={{ color: '#fda4af' }}>{s.worstStress.lossPct} %</strong> ({s.worstStress.label}), soit environ {fr(Math.round(data.totalValue * s.worstStress.lossPct / 100))} 🪙 sur {fr(data.totalValue)} 🪙.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {data.allocation.map((a) => <span key={a.cls} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>{a.label} {a.weightPct} %</span>)}
      </div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>{open ? 'Masquer le détail' : 'Voir le détail (facteurs et crises)'}</button>
      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {(open ? s.factors : top).map((f) => (
            <div key={f.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13 }}><strong style={{ color: 'white' }}>{f.label}</strong><span style={{ color: 'rgba(255,255,255,0.55)' }}>{f.value} · poids {Math.round(f.weight * 100)} %</span></div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 5, margin: '4px 0' }}><div style={{ width: `${f.score}%`, height: 6, borderRadius: 5, background: tone(f.score) }} /></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{f.explanation}{f.advice && <em style={{ color: '#fbbf24' }}> {f.advice}</em>}</div>
            </div>
          ))}
          <div>
            <strong style={{ fontSize: 13, color: 'white' }}>Crises historiques</strong>
            {data.stress.results.map((r) => (
              <div key={r.id} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '3px 0' }}>{r.label} ({r.period}) : <strong style={{ color: r.lossPct < -30 ? '#fda4af' : '#fcd34d' }}>{r.lossPct} %</strong>{r.estimated ? ' ≈' : ''}</div>
            ))}
          </div>
        </div>
      )}
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{data.disclaimer} Crises : pics → creux ; ≈ = partiellement estimé.</p>
    </div>
  );
}
