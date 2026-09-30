'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const tone = (s) => (s < 25 ? 'var(--ik-positive)' : s < 50 ? 'var(--ik-primary)' : s < 75 ? 'var(--ik-warning)' : 'var(--ik-negative)');
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

  const box = { background: 'color-mix(in srgb, var(--ik-text) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--ik-text) 10%, transparent)', borderRadius: 16, padding: 20, marginTop: 24 };
  if (error) return <div style={box}><p style={{ margin: 0, color: '#fda4af', fontSize: 13 }}>Risque du portefeuille : {error}</p></div>;
  if (!data) return null;
  if (data.empty) return <div style={box}><h3 style={{ fontSize: 15, margin: '0 0 6px', color: 'var(--ik-text)' }}>🎯 Risque de ton portefeuille</h3><p style={{ margin: 0, fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 60%, transparent)' }}>{data.message}</p></div>;

  const s = data.score;
  const top = [...s.factors].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <h3 style={{ fontSize: 15, margin: 0, color: 'var(--ik-text)' }}>🎯 Risque de ton portefeuille</h3>
        <div style={{ fontSize: 22, fontWeight: 800, color: tone(s.score) }} aria-label={`Score de risque ${s.score} sur 100, ${s.label}`}>{s.score}<span style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 50%, transparent)' }}> / 100 · {s.label}</span></div>
      </div>
      <div style={{ height: 8, background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)', borderRadius: 6, margin: '10px 0' }}><div style={{ width: `${s.score}%`, height: 8, borderRadius: 6, background: tone(s.score) }} /></div>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'color-mix(in srgb, var(--ik-text) 75%, transparent)' }}>
        Pire crise historique pour ce portefeuille : <strong style={{ color: '#fda4af' }}>{s.worstStress.lossPct} %</strong> ({s.worstStress.label}), soit environ {fr(Math.round(data.totalValue * s.worstStress.lossPct / 100))} 🪙 sur {fr(data.totalValue)} 🪙.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {data.allocation.map((a) => <span key={a.cls} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 10, background: 'color-mix(in srgb, var(--ik-text) 8%, transparent)', color: 'color-mix(in srgb, var(--ik-text) 80%, transparent)' }}>{a.label} {a.weightPct} %</span>)}
      </div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ background: 'none', border: 'none', color: 'var(--ik-accent)', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>{open ? 'Masquer le détail' : 'Voir le détail (facteurs et crises)'}</button>
      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {(open ? s.factors : top).map((f) => (
            <div key={f.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 13 }}><strong style={{ color: 'var(--ik-text)' }}>{f.label}</strong><span style={{ color: 'color-mix(in srgb, var(--ik-text) 55%, transparent)' }}>{f.value} · poids {Math.round(f.weight * 100)} %</span></div>
              <div style={{ height: 6, background: 'color-mix(in srgb, var(--ik-text) 10%, transparent)', borderRadius: 5, margin: '4px 0' }}><div style={{ width: `${f.score}%`, height: 6, borderRadius: 5, background: tone(f.score) }} /></div>
              <div style={{ fontSize: 12, color: 'color-mix(in srgb, var(--ik-text) 65%, transparent)' }}>{f.explanation}{f.advice && <em style={{ color: 'var(--ik-warning)' }}> {f.advice}</em>}</div>
            </div>
          ))}
          <div>
            <strong style={{ fontSize: 13, color: 'var(--ik-text)' }}>Crises historiques</strong>
            {data.stress.results.map((r) => (
              <div key={r.id} style={{ fontSize: 12, color: 'color-mix(in srgb, var(--ik-text) 70%, transparent)', padding: '3px 0' }}>{r.label} ({r.period}) : <strong style={{ color: r.lossPct < -30 ? '#fda4af' : '#fcd34d' }}>{r.lossPct} %</strong>{r.estimated ? ' ≈' : ''}</div>
            ))}
          </div>
        </div>
      )}
      <p style={{ margin: '12px 0 0', fontSize: 11, color: 'color-mix(in srgb, var(--ik-text) 40%, transparent)' }}>{data.disclaimer} Crises : pics → creux ; ≈ = partiellement estimé.</p>
    </div>
  );
}
