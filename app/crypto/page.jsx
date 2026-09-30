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


const coins = (n) => `${Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} 🪙`;
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `o-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const TYPE_LABEL = { market: 'Au marché', limit: 'Limite', stop_loss: 'Stop-loss', take_profit: 'Take-profit' };

function OrderTicket({ symbol, asset, onDone }) {
  const [side, setSide] = useState('buy');
  const [type, setType] = useState('market');
  const [mode, setMode] = useState('qty');           // quantité ou montant (achat au marché seulement)
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [quote, setQuote] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState(uid);        // un identifiant par tentative : un double clic n'envoie jamais deux ordres

  const isMarket = type === 'market';
  const byAmount = isMarket && side === 'buy' && mode === 'amount';
  useEffect(() => { if (side === 'buy' && (type === 'stop_loss' || type === 'take_profit')) setType('market'); }, [side, type]);
  useEffect(() => {
    setQuote(null);
    if (!isMarket) return undefined;
    const q = byAmount ? `amountCoins=${encodeURIComponent(amount)}` : `quantity=${encodeURIComponent(qty)}`;
    if (!(byAmount ? amount : qty)) return undefined;
    const t = setTimeout(() => { call(`/quote?symbol=${symbol}&side=${side}&${q}`).then(setQuote).catch(() => setQuote(null)); }, 350);
    return () => clearTimeout(t);
  }, [symbol, side, type, mode, qty, amount, isMarket, byAmount]);

  const submit = async () => {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const body = { clientOrderId: orderId, symbol, side, type };
      if (byAmount) body.amountCoins = Number(amount); else body.quantity = qty;
      if (!isMarket) body.price = Number(price);
      const r = await call('/orders', 'POST', body);
      const o = r.order;
      setOrderId(uid());
      setMsg(o.status === 'filled'
        ? { ok: true, text: `Exécuté : ${o.fill.quantity} ${symbol} à ${usd(o.fill.price)} (prix de marché ${usd(o.fill.refPrice)}, écart ${o.fill.spreadPct.toFixed(2)} %, glissement ${o.fill.slippagePct.toFixed(3)} %). Frais : ${coins(o.fill.feeCoins)}${o.fill.taxCoins ? `, impôt : ${coins(o.fill.taxCoins)}` : ''}.` }
        : { ok: true, text: `Ordre ${TYPE_LABEL[o.type].toLowerCase()} enregistré : il attend que le prix atteigne ${usd(o.price)}. Il sera exécuté quand tu avanceras dans le temps.` });
      setQty(''); setAmount(''); setPrice('');
      onDone();
    } catch (e) { setMsg({ ok: false, text: e.message }); setOrderId(uid()); }
    setBusy(false);
  };
  const tab = (active, color) => ({ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#fff', background: active ? color : 'rgba(15,23,42,0.8)', opacity: active ? 1 : 0.6 });
  return (
    <div style={card} data-testid="order-ticket">
      <h3 style={{ margin: '0 0 10px', color: '#fff', fontSize: 16 }}>Passer un ordre — {symbol}</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button data-testid="side-buy" style={tab(side === 'buy', '#16a34a')} onClick={() => setSide('buy')}>Acheter</button>
        <button data-testid="side-sell" style={tab(side === 'sell', '#dc2626')} onClick={() => setSide('sell')}>Vendre</button>
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0,1fr)' }}>
        <select aria-label="Type d'ordre" style={input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="market">Au marché (immédiat)</option><option value="limit">Limite (à mon prix)</option>
          {side === 'sell' && <><option value="stop_loss">Stop-loss (limiter la perte)</option><option value="take_profit">Take-profit (sécuriser un gain)</option></>}
        </select>
        {isMarket && side === 'buy' && (
          <select aria-label="Saisie" style={input} value={mode} onChange={(e) => setMode(e.target.value)}><option value="qty">Saisir une quantité</option><option value="amount">Saisir un montant en 🪙</option></select>
        )}
        {byAmount
          ? <input aria-label="Montant en pièces" inputMode="numeric" placeholder="Montant total (frais inclus) en 🪙" style={input} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          : <input aria-label="Quantité" inputMode="decimal" placeholder={`Quantité de ${symbol} (8 décimales max)`} style={input} value={qty} onChange={(e) => setQty(e.target.value.replace(',', '.'))} />}
        {!isMarket && <input aria-label="Prix" inputMode="decimal" placeholder={type === 'limit' ? 'Prix limite en $' : type === 'stop_loss' ? 'Prix de déclenchement (sous le prix actuel)' : 'Prix de déclenchement (au-dessus du prix actuel)'} style={input} value={price} onChange={(e) => setPrice(e.target.value.replace(',', '.'))} />}
      </div>
      {quote && (
        <div data-testid="quote" style={{ marginTop: 10, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
          Prix estimé <b>{usd(quote.execution.price)}</b> (marché {usd(quote.refPrice)}) · écart {quote.execution.spreadPct.toFixed(2)} % · glissement {quote.execution.slippagePct.toFixed(3)} %<br />
          Montant <b>{coins(quote.execution.notionalCoins)}</b> · frais <b>{coins(quote.execution.feeCoins)}</b> · {side === 'buy' ? 'total débité' : 'net crédité (avant impôt)'} <b>{coins(quote.execution.totalCoins)}</b>
          {quote.stale && <div style={{ color: '#fbbf24' }}>Cet actif n&apos;est plus coté : dernier prix connu.</div>}
        </div>
      )}
      {side === 'sell' && <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Une vente est imposée si tes cessions de l&apos;année dépassent le seuil de la flat tax (barème de jeu, à reconfirmer).</div>}
      <button data-testid="submit-order" style={{ ...btn(true), width: '100%', marginTop: 12, background: side === 'buy' ? '#16a34a' : '#dc2626' }} disabled={busy} onClick={submit}>{side === 'buy' ? 'Acheter' : 'Vendre'} {symbol}</button>
      {msg && <div role="status" data-testid="order-msg" style={{ marginTop: 10, fontSize: 13, color: msg.ok ? '#86efac' : '#fca5a5' }}>{msg.text}</div>}
    </div>
  );
}

function PortfolioView({ simulatedAt, refreshKey, onOpen }) {
  const [p, setP] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    Promise.all([call('/portfolio'), call('/orders?status=filled')]).then(([a, b]) => { setP(a); setHistory(b.orders); setErr(''); }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load, simulatedAt, refreshKey]);
  const cancel = async (id) => { try { await call(`/orders/${id}`, 'DELETE'); load(); } catch (e) { setErr(e.message); } };
  if (err && !p) return <div style={card}><p style={{ color: '#fca5a5' }}>{err}</p></div>;
  if (!p) return <div style={{ color: '#94a3b8' }}>Chargement…</div>;
  const tone = (n) => (n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#e2e8f0');
  const stat = (label, value, color) => <div style={{ ...card, flex: '1 1 150px' }}><div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800, color: color || '#fff' }}>{value}</div></div>;
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0,1fr)' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {stat('Patrimoine', coins(p.wealthCoins))}{stat('Pièces disponibles', coins(p.balanceCoins))}{stat('Valeur des cryptos', coins(p.holdingsValueCoins))}
        {stat('Plus-value latente', coins(p.unrealizedCoins), tone(p.unrealizedCoins))}{stat('Plus-value réalisée', coins(p.realizedCoins), tone(p.realizedCoins))}{stat('Frais payés', coins(p.feesPaidCoins))}{stat('Impôts payés', coins(p.taxPaidCoins))}
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <h3 style={{ margin: 0, padding: '12px 14px', color: '#fff', fontSize: 16 }}>Mes positions</h3>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0', fontSize: 13, minWidth: 600 }}>
          <thead><tr style={{ color: '#94a3b8', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: '8px 12px' }}>Actif</th><th style={{ padding: 8 }}>Quantité</th><th style={{ padding: 8 }}>Prix moyen</th><th style={{ padding: 8 }}>Prix</th><th style={{ padding: 8 }}>Valeur</th><th style={{ padding: 8 }}>Latent</th><th style={{ padding: 8 }}>Part</th></tr></thead>
          <tbody>
            {p.positions.map((x) => (
              <tr key={x.symbol} data-testid={`pos-${x.symbol}`} onClick={() => onOpen(x.symbol)} style={{ cursor: 'pointer', borderTop: '1px solid rgba(148,163,184,0.12)', textAlign: 'right' }}>
                <td style={{ textAlign: 'left', padding: '10px 12px' }}><b>{x.symbol}</b> <span style={{ color: '#94a3b8' }}>{x.name}</span></td>
                <td style={{ padding: 8 }}>{x.quantity}</td><td style={{ padding: 8 }}>{usd(x.avgCost)}</td><td style={{ padding: 8 }}>{usd(x.price)}</td><td style={{ padding: 8 }}>{coins(x.valueCoins)}</td>
                <td style={{ padding: 8, color: tone(x.unrealizedCoins) }}>{coins(x.unrealizedCoins)}{x.unrealizedPct !== null && ` (${x.unrealizedPct >= 0 ? '+' : ''}${x.unrealizedPct.toLocaleString('fr-FR')} %)`}</td><td style={{ padding: 8 }}>{x.allocationPct.toLocaleString('fr-FR')} %</td>
              </tr>
            ))}
            {!p.positions.length && <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>Aucune position : ouvre un actif du marché pour acheter.</td></tr>}
          </tbody></table></div>
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16 }}>Ordres en attente</h3>
        {p.openOrders.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Aucun ordre en attente.</div> : p.openOrders.map((o) => (
          <div key={o.id} data-testid={`open-${o.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid rgba(148,163,184,0.12)', fontSize: 13, color: '#e2e8f0' }}>
            <span style={{ flex: '1 1 240px' }}><b>{o.side === 'buy' ? 'Achat' : 'Vente'}</b> {o.quantity} {o.symbol} · {TYPE_LABEL[o.type]} à {usd(o.price)}</span>
            <button style={btn(false)} onClick={() => cancel(o.id)}>Annuler</button>
          </div>
        ))}
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: 16 }}>Historique des exécutions</h3>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0', fontSize: 12, minWidth: 560 }}>
          <thead><tr style={{ color: '#94a3b8', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: 6 }}>Date simulée</th><th style={{ padding: 6, textAlign: 'left' }}>Ordre</th><th style={{ padding: 6 }}>Prix</th><th style={{ padding: 6 }}>Montant</th><th style={{ padding: 6 }}>Frais</th><th style={{ padding: 6 }}>Impôt</th><th style={{ padding: 6 }}>Gain</th></tr></thead>
          <tbody>{history.map((o) => (
            <tr key={o.id} style={{ borderTop: '1px solid rgba(148,163,184,0.12)', textAlign: 'right' }}>
              <td style={{ textAlign: 'left', padding: 6 }}>{dateFr(o.fill.simAt)}</td><td style={{ textAlign: 'left', padding: 6 }}>{o.side === 'buy' ? 'Achat' : 'Vente'} {o.fill.quantity} {o.symbol}</td>
              <td style={{ padding: 6 }}>{usd(o.fill.price)}</td><td style={{ padding: 6 }}>{coins(o.fill.notionalCoins)}</td><td style={{ padding: 6 }}>{coins(o.fill.feeCoins)}</td><td style={{ padding: 6 }}>{coins(o.fill.taxCoins)}</td>
              <td style={{ padding: 6, color: o.fill.gainCoins == null ? '#64748b' : tone(o.fill.gainCoins) }}>{o.fill.gainCoins == null ? '—' : coins(o.fill.gainCoins)}</td>
            </tr>))}
            {!history.length && <tr><td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#94a3b8' }}>Aucune exécution pour l&apos;instant.</td></tr>}
          </tbody></table></div>
      </div>
    </div>
  );
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

function AssetView({ symbol, state, simulatedAt, refreshKey, allAssets, onBack, onTraded }) {
  const [info, setInfo] = useState(null);
  const [mine, setMine] = useState({ orders: [], position: null });
  const reloadMine = useCallback(() => {
    Promise.all([call('/orders?status=filled'), call('/portfolio')]).then(([o, p]) => setMine({ orders: o.orders.filter((x) => x.symbol === symbol), position: p.positions.find((x) => x.symbol === symbol) || null, open: p.openOrders.filter((x) => x.symbol === symbol) })).catch(() => {});
  }, [symbol]);
  useEffect(() => { reloadMine(); }, [reloadMine, simulatedAt]);
  const markers = useMemo(() => mine.orders.map((o) => ({ ts: o.fill.simAt - 1, side: o.side, text: `${o.side === 'buy' ? 'A' : 'V'} ${o.fill.quantity}` })), [mine.orders]);
  const levels = useMemo(() => [
    ...(mine.position ? [{ price: mine.position.avgCost, color: '#60a5fa', title: 'prix moyen' }] : []),
    ...((mine.open || []).map((o) => ({ price: o.price, color: o.side === 'buy' ? '#22c55e' : '#ef4444', title: TYPE_LABEL[o.type] }))),
  ], [mine]);
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
        <PriceChart key={symbol} symbol={symbol} tf={tf} candleLoader={loader} refreshKey={refreshKey} markers={markers} levels={levels} />
      </div>

      <OrderTicket symbol={symbol} asset={a} onDone={() => { reloadMine(); onTraded(); }} />

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
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState('market');

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
    setBusy(true); setMsg(''); setInfo('');
    try { const r = await call('/time/advance', 'POST', { step }); await loadState(); setRefreshKey((k) => k + 1); const f = (r.events || []).filter((e) => e.status === 'filled').length; const c = (r.events || []).filter((e) => e.status === 'cancelled').length; if (f || c) setInfo(`Ordres en attente : ${f} exécuté(s)${c ? `, ${c} annulé(s)` : ''} pendant cette période (détails dans l'historique et les notifications).`); } catch (e) { setMsg(e.message); }
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
      {info && <div role="status" style={{ ...card, borderColor: 'rgba(96,165,250,0.6)', color: '#bfdbfe', marginBottom: 12 }}>{info}</div>}
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[['market', 'Marché'], ['portfolio', 'Mon portefeuille']].map(([id, l]) => <button key={id} data-testid={`tab-${id}`} onClick={() => { setTab(id); setSelected(null); }} style={{ ...btn(tab === id), background: tab === id ? '#2563eb' : 'rgba(59,130,246,0.15)' }}>{l}</button>)}
          </div>
          {tab === 'portfolio'
            ? <PortfolioView simulatedAt={simulatedAt} refreshKey={refreshKey} onOpen={(sym) => { setTab('market'); setSelected(sym); }} />
            : selected
              ? <AssetView symbol={selected} state={state} simulatedAt={simulatedAt} refreshKey={refreshKey} allAssets={allAssets} onBack={() => setSelected(null)} onTraded={() => setRefreshKey((k) => k + 1)} />
              : <AssetList assets={allAssets} onOpen={setSelected} filters={filters} setFilters={setFilters} categories={state.categories} />}
        </>
      )}
      <p style={{ color: '#64748b', fontSize: 11, marginTop: 24 }}>{state.attribution}</p>
    </div>
    </main>
  );
}
