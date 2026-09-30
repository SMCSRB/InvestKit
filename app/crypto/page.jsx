'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Le graphique n'existe que dans le navigateur (canvas) : chargement dynamique, sans rendu serveur.
const PriceChart = dynamic(() => import('./PriceChart'), { ssr: false, loading: () => <div style={{ color: '#94a3b8' }}>Chargement du graphique…</div> });
const CompareChart = dynamic(() => import('./PriceChart').then((m) => m.CompareChart), { ssr: false });

const API = `${process.env.NEXT_PUBLIC_API_URL}/crypto`;
const card = { minWidth: 0, background: 'rgba(15,23,42,0.65)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 14, padding: 16 };
const btn = (primary) => ({ padding: '9px 14px', borderRadius: 10, border: primary ? 'none' : '1px solid rgba(96,165,250,0.6)', background: primary ? '#2563eb' : 'rgba(59,130,246,0.15)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
const input = { padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.8)', color: '#fff', fontSize: 14, minWidth: 0 };
const TIMEFRAME_DEFAULT = '1d';

const usd = (n) => {
  if (n == null) return '—';
  const a = Math.abs(n);
  return `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: a >= 100 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 5 : 8 })} $`;
};
const big = (n) => {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md$`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M$`;
  return `${Math.round(n).toLocaleString('fr-FR')} $`;
};
const dateFr = (ms) => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const Pct = ({ v }) => (v == null ? <span style={{ color: '#64748b' }}>—</span> : <span style={{ color: v >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{v >= 0 ? '+' : ''}{v.toFixed(2)} %</span>);

async function call(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.status = res.status; throw e; }
  return data;
}

function Disclaimer({ text }) {
  return (
    <div role="note" data-testid="crypto-disclaimer" style={{ ...card, borderColor: 'rgba(251,191,36,0.5)', background: 'rgba(120,53,15,0.25)', color: '#fde68a', fontSize: 13, padding: '10px 14px' }}>
      ⚠️ {text || 'Simulation à but éducatif, pas un conseil en investissement.'}
    </div>
  );
}

function StartScreen({ starts, onStart, busy }) {
  const [pick, setPick] = useState('y2017');
  return (
    <div>
      <h2 style={{ color: '#fff', marginTop: 0 }}>Commence ta partie Crypto</h2>
      <p style={{ color: '#94a3b8' }}>Choisis la date de départ de ta simulation. Tu reverras l&apos;histoire réelle du marché, jour après jour : tu ne verras jamais ce qui se passe après ta date, et tu ne peux pas revenir en arrière.</p>
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {starts.map((s) => (
          <label key={s.id} style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', cursor: s.available ? 'pointer' : 'not-allowed', opacity: s.available ? 1 : 0.5, borderColor: pick === s.id ? 'rgba(96,165,250,0.8)' : undefined }}>
            <input type="radio" name="start" value={s.id} checked={pick === s.id} disabled={!s.available} onChange={() => setPick(s.id)} />
            <span style={{ color: '#e2e8f0' }}>{s.label}{!s.available && ' — données pas encore importées'}</span>
          </label>
        ))}
      </div>
      <button style={btn(true)} disabled={busy} onClick={() => onStart(pick)}>Démarrer à cette date</button>
    </div>
  );
}

function AssetList({ assets, onOpen, filters, setFilters, categories }) {
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 12 }}>
        <input aria-label="Rechercher un actif" placeholder="Rechercher (nom, symbole)" style={{ ...input, flex: '1 1 160px' }} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select aria-label="Catégorie" style={input} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">Toutes catégories</option>
          {Object.entries(categories).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <select aria-label="Tri" style={input} value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
          <option value="marketCap">Capitalisation</option><option value="volume">Volume</option><option value="change1d">Variation 24 h</option><option value="change30d">Variation 30 j</option><option value="name">Nom</option>
        </select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0', fontSize: 13, minWidth: 560 }}>
          <thead><tr style={{ color: '#94a3b8', textAlign: 'right' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>Actif</th><th style={{ padding: 8 }}>Prix</th><th style={{ padding: 8 }}>24 h</th><th style={{ padding: 8 }}>7 j</th><th style={{ padding: 8 }}>30 j</th><th style={{ padding: 8 }}>Volume 24 h</th><th style={{ padding: 8 }}>Capi.</th><th style={{ padding: 8 }}>Risque</th>
          </tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.symbol} data-testid={`row-${a.symbol}`} onClick={() => onOpen(a.symbol)} style={{ cursor: 'pointer', borderTop: '1px solid rgba(148,163,184,0.12)', textAlign: 'right', opacity: a.stale ? 0.6 : 1 }}>
                <td style={{ textAlign: 'left', padding: '10px 12px' }}><strong>{a.symbol}</strong> <span style={{ color: '#94a3b8' }}>{a.name}</span>{a.synthetic && <span title="Données fictives" style={{ marginLeft: 6, fontSize: 10, color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: 4, padding: '0 4px' }}>FICTIF</span>}{a.collapsed && <span style={{ marginLeft: 6, fontSize: 10, color: '#fca5a5', border: '1px solid #fca5a5', borderRadius: 4, padding: '0 4px' }}>EFFONDRÉ</span>}</td>
                <td style={{ padding: 8 }}>{usd(a.price)}</td><td style={{ padding: 8 }}><Pct v={a.change1d} /></td><td style={{ padding: 8 }}><Pct v={a.change7d} /></td><td style={{ padding: 8 }}><Pct v={a.change30d} /></td>
                <td style={{ padding: 8 }}>{big(a.volume24h)}</td><td style={{ padding: 8 }}>{big(a.marketCap)}</td><td style={{ padding: 8 }}>{'●'.repeat(a.risk)}<span style={{ color: '#334155' }}>{'●'.repeat(5 - a.risk)}</span></td>
              </tr>
            ))}
            {!assets.length && <tr><td colSpan={8} style={{ padding: 18, color: '#94a3b8', textAlign: 'center' }}>Aucun actif ne correspond à ta recherche à cette date.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssetView({ symbol, state, simulatedAt, refreshKey, allAssets, onBack }) {
  const [info, setInfo] = useState(null);
  const [tf, setTf] = useState(TIMEFRAME_DEFAULT);
  const [err, setErr] = useState('');
  const [cmpWith, setCmpWith] = useState([]);
  const [cmpData, setCmpData] = useState(null);

  useEffect(() => {
    let off = false;
    call(`/assets/${encodeURIComponent(symbol)}`).then((r) => { if (!off) { setInfo(r); setErr(''); } }).catch((e) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [symbol, simulatedAt]);

  useEffect(() => {
    if (!cmpWith.length) { setCmpData(null); return undefined; }
    let off = false;
    call(`/compare?symbols=${[symbol, ...cmpWith].join(',')}&tf=${tf === '1m' || tf === '5m' || tf === '15m' ? '1h' : tf}&limit=500`).then((r) => { if (!off) setCmpData(r); }).catch((e) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [symbol, cmpWith, tf, simulatedAt]);

  const loader = useCallback((sym, frame, before) => call(`/candles?symbol=${encodeURIComponent(sym)}&tf=${frame}${before != null ? `&before=${before}` : ''}&limit=300`), []);
  const a = info?.asset;
  const frames = state.timeframes.filter((t) => !info || info.timeframes.includes(t.id));

  if (err && !a) return <div style={card}><p style={{ color: '#fca5a5' }}>{err}</p><button style={btn(false)} onClick={onBack}>← Retour au marché</button></div>;
  if (!a) return <div style={{ color: '#94a3b8' }}>Chargement…</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, minWidth: 0 }}>
      <button style={{ ...btn(false), justifySelf: 'start' }} onClick={onBack}>← Retour au marché</button>
      {a.synthetic && <div role="alert" data-testid="synthetic-banner" style={{ ...card, borderColor: '#fbbf24', color: '#fde68a' }}>DONNÉES FICTIVES — ces cours sont générés pour essayer l&apos;interface, ils ne représentent aucun marché réel.</div>}
      <div style={card}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: '#fff' }}>{a.name} <span style={{ color: '#94a3b8', fontSize: 16 }}>{a.symbol}</span></h2>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{usd(a.price)}</span><Pct v={a.change1d} />
        </div>
        <div style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 10px' }}>{state.categories[a.category] || a.category} · coté depuis le {a.listedSince ? dateFr(Date.parse(a.listedSince)) : '—'}</div>
        <p style={{ color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 10px' }}>{a.description}</p>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: '#cbd5e1' }}>
          <span>Capitalisation : <b>{big(a.marketCap)}</b></span><span>Volume 24 h : <b>{big(a.volume24h)}</b></span>
          <span>Plus haut historique (à ce jour) : <b>{usd(a.allTimeHigh)}</b></span><span>Plus bas : <b>{usd(a.allTimeLow)}</b></span>
          <span>Liquidité : <b>palier {a.liquidityTier}</b></span>
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.25)', color: '#e2e8f0', fontSize: 13 }}>
          <b>Risque {a.risk}/5</b> — {state.riskLabels[a.risk]}
        </div>
        {a.collapse && (
          <div role="alert" style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #ef4444', background: 'rgba(127,29,29,0.3)', color: '#fecaca', fontSize: 13 }}>
            <b>{a.collapse.title}</b> ({dateFr(Date.parse(a.collapse.date))}) — {a.collapse.explanation}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {frames.map((t) => <button key={t.id} data-testid={`tf-${t.id}`} onClick={() => setTf(t.id)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${tf === t.id ? 'rgba(96,165,250,0.8)' : 'rgba(148,163,184,0.3)'}`, background: tf === t.id ? 'rgba(59,130,246,0.3)' : 'rgba(15,23,42,0.6)', color: tf === t.id ? '#bfdbfe' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.label}</button>)}
        </div>
        <PriceChart key={symbol} symbol={symbol} tf={tf} candleLoader={loader} refreshKey={refreshKey} />
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16 }}>Comparer avec d&apos;autres actifs</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <select aria-label="Ajouter un actif à comparer" style={input} value="" onChange={(e) => { const v = e.target.value; if (v && cmpWith.length < 3 && !cmpWith.includes(v)) setCmpWith([...cmpWith, v]); }}>
            <option value="">+ Ajouter un actif…</option>
            {allAssets.filter((x) => x.symbol !== symbol && !cmpWith.includes(x.symbol)).map((x) => <option key={x.symbol} value={x.symbol}>{x.symbol} — {x.name}</option>)}
          </select>
          {cmpWith.map((s) => <button key={s} style={btn(false)} onClick={() => setCmpWith(cmpWith.filter((x) => x !== s))}>{s} ✕</button>)}
        </div>
        {cmpData ? <CompareChart data={cmpData} /> : <div style={{ color: '#94a3b8', fontSize: 13 }}>Choisis jusqu&apos;à 3 actifs : les courbes sont ramenées à 100 pour comparer leur évolution.</div>}
      </div>
    </div>
  );
}

export default function CryptoPage() {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', sort: 'marketCap' });
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadState = useCallback(async () => {
    try { setState(await call('/state')); } catch (e) { if (e.status === 401) router.push('/login'); else setMsg(e.message); }
  }, [router]);
  useEffect(() => { if (!localStorage.getItem('token')) { router.push('/login'); return; } loadState(); }, [loadState, router]);

  const simulatedAt = state?.account?.simulatedAt;
  useEffect(() => {
    if (!simulatedAt) return undefined;
    const t = setTimeout(() => {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      call(`/assets?${qs}`).then((r) => setAssets(r.assets)).catch((e) => setMsg(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [simulatedAt, filters]);

  const start = async (id) => { setBusy(true); setMsg(''); try { await call('/account', 'POST', { start: id }); await loadState(); } catch (e) { setMsg(e.message); } setBusy(false); };
  const advance = async (step) => {
    if (busy) return;
    setBusy(true); setMsg('');
    try { await call('/time/advance', 'POST', { step }); await loadState(); setRefreshKey((k) => k + 1); } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const allAssets = useMemo(() => assets, [assets]);
  if (!state) return <main style={{ minHeight: '100vh', background: '#0f172a', padding: 24, color: '#94a3b8' }}>{msg || 'Chargement…'}</main>;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', color: '#e2e8f0', overflowX: 'hidden' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 26 }}>₿ Marché Crypto <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>simulation</span></h1>
        <Link href="/dashboard" style={{ color: '#60a5fa', fontSize: 14 }}>← Tableau de bord</Link>
      </div>
      <div style={{ marginBottom: 14 }}><Disclaimer text={state.disclaimer} /></div>
      {msg && <div role="alert" style={{ ...card, borderColor: '#ef4444', color: '#fecaca', marginBottom: 12 }}>{msg}</div>}

      {!state.hasAccount ? (
        state.dataReady ? <StartScreen starts={state.starts} onStart={start} busy={busy} />
          : <div style={card}><p style={{ color: '#e2e8f0', margin: 0 }}>Les données de marché ne sont pas encore importées : ce domaine ouvrira dès que l&apos;historique sera chargé sur le serveur.</p></div>
      ) : (
        <>
          <div style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Date simulée</div>
              <div data-testid="sim-date" style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{dateFr(simulatedAt)}</div>
            </div>
            {[['day', '+1 jour'], ['week', '+1 semaine'], ['month', '+1 mois']].map(([id, l]) => <button key={id} data-testid={`adv-${id}`} style={btn(true)} disabled={busy || !state.account.canAdvance} onClick={() => advance(id)}>{l}</button>)}
            {!state.account.canAdvance && <span style={{ color: '#94a3b8', fontSize: 12 }}>Fin des données disponibles.</span>}
          </div>
          {selected
            ? <AssetView symbol={selected} state={state} simulatedAt={simulatedAt} refreshKey={refreshKey} allAssets={allAssets} onBack={() => setSelected(null)} />
            : <AssetList assets={allAssets} onOpen={setSelected} filters={filters} setFilters={setFilters} categories={state.categories} />}
        </>
      )}
      <p style={{ color: '#64748b', fontSize: 11, marginTop: 24 }}>{state.attribution}</p>
    </div>
    </main>
  );
}
