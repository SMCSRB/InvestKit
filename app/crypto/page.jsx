'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { unitNumber, fmtUsd } from '../lib/money';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import HelpTip from '../components/HelpTip';
import RankingProgress from '../components/ui/RankingProgress';
import AppShell from '@/app/components/shell/AppShell';
import Coin from '@/app/components/ui/Coin';
import Icon from '@/app/components/ui/Icon';

// Le graphique n'existe que dans le navigateur (canvas) : chargement dynamique, sans rendu serveur.
const PriceChart = dynamic(() => import('./PriceChart'), { ssr: false, loading: () => <div style={{ color: 'var(--ik-text-3)' }}>Chargement du graphique…</div> });
const CompareChart = dynamic(() => import('./PriceChart').then((m) => m.CompareChart), { ssr: false });

const API = `${process.env.NEXT_PUBLIC_API_URL}/crypto`;
const card = { minWidth: 0, background: 'var(--ik-surface-2)', border: '1px solid color-mix(in srgb, var(--ik-text) 12%, transparent)', borderRadius: 14, padding: 16 };
const btn = (primary) => ({ padding: '9px 14px', borderRadius: 10, border: primary ? 'none' : '1px solid color-mix(in srgb, var(--ik-primary) 60%, transparent)', background: primary ? 'var(--ik-primary)' : 'color-mix(in srgb, var(--ik-primary) 15%, transparent)', color: primary ? 'var(--ik-text-on-primary)' : 'var(--ik-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
const input = { padding: '9px 10px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ik-text) 24%, transparent)', background: 'var(--ik-surface-2)', color: 'var(--ik-text)', fontSize: 14, minWidth: 0 };
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
const Pct = ({ v }) => (v == null ? <span style={{ color: 'var(--ik-text-3)' }}>—</span> : <span style={{ color: v >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)', fontWeight: 600 }}>{v >= 0 ? '+' : ''}{v.toFixed(2)} %</span>);

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


const coinNumber = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const coins = (n) => <>{coinNumber(n)} <Coin /></>;
const coinsText = (n) => `${coinNumber(n)} InvestCoins`;
// Prix d'une unité (décimales adaptées) ; texte pour les messages, élément pour les tableaux.
const unitCoinsText = (n) => (n == null ? '—' : `${unitNumber(n)} InvestCoins`);
const unitCoins = (n) => (n == null ? '—' : <>{unitNumber(n)} <Coin /></>);
// Prix en pièces si le taux de change est connu, sinon repli sur le dollar d'origine.
const fmtPrice = (c, u) => (c != null ? unitCoins(c) : fmtUsd(u));
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `o-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const TYPE_LABEL = { market: 'Au marché', limit: 'Limite', stop_loss: 'Stop-loss', take_profit: 'Take-profit' };

function OrderTicket({ symbol, asset, owned, committed, onDone }) {
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
        ? { ok: true, text: `Exécuté : ${o.fill.quantity} ${symbol} à ${unitCoinsText(o.fill.priceCoins)} l'unité (prix de marché ${unitCoinsText(o.fill.refPriceCoins)}, écart ${o.fill.spreadPct.toFixed(2)} %, glissement ${o.fill.slippagePct.toFixed(3)} %). Frais : ${coinsText(o.fill.feeCoins)}${o.fill.taxCoins ? `, impôt : ${coinsText(o.fill.taxCoins)}` : ''}.` }
        : { ok: true, text: `Ordre ${TYPE_LABEL[o.type].toLowerCase()} enregistré : il attend que le prix atteigne ${unitCoinsText(o.triggerCoins)}. Il sera exécuté quand tu avanceras dans le temps.` });
      setQty(''); setAmount(''); setPrice('');
      onDone();
    } catch (e) { setMsg({ ok: false, text: e.message }); setOrderId(uid()); }
    setBusy(false);
  };
  const tab = (active, color) => ({ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: active ? (color === 'var(--ik-positive)' ? 'var(--ik-text-on-positive)' : 'var(--ik-text-on-negative)') : 'var(--ik-text)', background: active ? color : 'var(--ik-surface-2)', opacity: active ? 1 : 0.6 });
  return (
    <div style={card} data-testid="order-ticket">
      <h3 style={{ margin: '0 0 10px', color: 'var(--ik-text)', fontSize: 16 }}>Passer un ordre — {symbol}<HelpTip term="ordre-marche" /></h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button data-testid="side-buy" style={tab(side === 'buy', 'var(--ik-positive)')} onClick={() => setSide('buy')}>Acheter</button>
        <button data-testid="side-sell" style={tab(side === 'sell', 'var(--ik-negative)')} onClick={() => setSide('sell')}>Vendre</button>
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0,1fr)' }}>
        <select aria-label="Type d'ordre" style={input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="market">Au marché (immédiat)</option><option value="limit">Limite (à mon prix)</option>
          {side === 'sell' && <><option value="stop_loss">Stop-loss (limiter la perte)</option><option value="take_profit">Take-profit (sécuriser un gain)</option></>}
        </select>
        {isMarket && side === 'buy' && (
          <select aria-label="Saisie" style={input} value={mode} onChange={(e) => setMode(e.target.value)}><option value="qty">Saisir une quantité</option><option value="amount">Saisir un montant en InvestCoins</option></select>
        )}
        {byAmount
          ? <input aria-label="Montant en pièces" inputMode="numeric" placeholder="Montant total (frais inclus) en InvestCoins" style={input} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          : <input aria-label="Quantité" inputMode="decimal" placeholder={`Quantité de ${symbol} (8 décimales max)`} style={input} value={qty} onChange={(e) => setQty(e.target.value.replace(',', '.'))} />}
        {!isMarket && <input aria-label="Prix" inputMode="decimal" placeholder={type === 'limit' ? 'Prix limite en InvestCoins par unité' : type === 'stop_loss' ? 'Prix de déclenchement en InvestCoins (sous le prix actuel)' : 'Prix de déclenchement en InvestCoins (au-dessus du prix actuel)'} style={input} value={price} onChange={(e) => setPrice(e.target.value.replace(',', '.'))} />}
      </div>
      {quote && (
        <div data-testid="quote" style={{ marginTop: 10, fontSize: 13, color: 'var(--ik-text-2)', lineHeight: 1.6 }}>
          Prix estimé <b>{unitCoins(quote.execution.priceCoins)}</b> (marché {unitCoins(quote.refPriceCoins)}, soit {usd(quote.refPrice)}) · écart<HelpTip term="ecart-achat-vente" /> {quote.execution.spreadPct.toFixed(2)} % · glissement<HelpTip term="glissement" /> {quote.execution.slippagePct.toFixed(3)} %<br />
          Montant <b>{coins(quote.execution.notionalCoins)}</b> · frais <b>{coins(quote.execution.feeCoins)}</b> · {side === 'buy' ? 'total débité' : 'net crédité (avant impôt)'} <b>{coins(quote.execution.totalCoins)}</b>
          {side === 'buy' && quote.affordable === false && <div role="alert" data-testid="quote-unaffordable" style={{ color: 'var(--ik-negative)', marginTop: 4 }}>{quote.affordableMessage}</div>}
          {quote.stale && <div style={{ color: 'var(--ik-warning)' }}>Cet actif n&apos;est plus coté : dernier prix connu.</div>}
        </div>
      )}
      {side === 'sell' && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ik-text-3)' }}>Stop-loss<HelpTip term="stop-loss" /> · Take-profit<HelpTip term="take-profit" /> · Ordre limite<HelpTip term="ordre-limite" /><br />Une vente est imposée si tes cessions de l&apos;année dépassent le seuil de la flat tax (barème de jeu, à reconfirmer).</div>}
      <button data-testid="submit-order" style={{ ...btn(true), width: '100%', marginTop: 12, background: side === 'buy' ? 'var(--ik-positive)' : 'var(--ik-negative)', color: side === 'buy' ? 'var(--ik-text-on-positive)' : 'var(--ik-text-on-negative)' }} disabled={busy} onClick={submit}>{side === 'buy' ? 'Acheter' : 'Vendre'} {symbol}</button>
      <div data-testid="owned-qty" style={{ marginTop: 10, fontSize: 13, color: 'var(--ik-text-2)' }}>Tu possèdes <b>{owned ?? '0'} {symbol}</b>{committed > 0 && <> (dont {committed} engagés dans des ordres en attente)</>}</div>
      {msg && <div role="status" data-testid="order-msg" style={{ marginTop: 10, fontSize: 13, color: msg.ok ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{msg.text}</div>}
    </div>
  );
}

function PortfolioView({ simulatedAt, refreshKey, onOpen, assets }) {
  const [p, setP] = useState(null);
  const [history, setHistory] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    Promise.all([call('/portfolio'), call('/orders?status=filled')]).then(([a, b]) => { setP(a); setHistory(b.orders); setErr(''); }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load, simulatedAt, refreshKey]);
  const cancel = async (id) => { try { await call(`/orders/${id}`, 'DELETE'); load(); } catch (e) { setErr(e.message); } };
  if (err && !p) return <div style={card}><p style={{ color: 'var(--ik-negative)' }}>{err}</p></div>;
  if (!p) return <div style={{ color: 'var(--ik-text-3)' }}>Chargement…</div>;
  const tone = (n) => (n > 0 ? 'var(--ik-positive)' : n < 0 ? 'var(--ik-negative)' : 'var(--ik-text-2)');
  const stat = (label, value, color) => <div style={{ ...card, flex: '1 1 150px' }}><div style={{ fontSize: 11, color: 'var(--ik-text-3)', textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--ik-text)' }}>{value}</div></div>;
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0,1fr)' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {stat('Patrimoine', coins(p.wealthCoins))}{stat('Pièces disponibles', coins(p.balanceCoins))}{p.reservedElsewhereCoins > 0 && stat('Utilisables en Crypto', coins(p.spendableCoins))}{stat('Valeur des cryptos', coins(p.holdingsValueCoins))}
        {stat('Plus-value latente', coins(p.unrealizedCoins), tone(p.unrealizedCoins))}{stat('Plus-value réalisée', coins(p.realizedCoins), tone(p.realizedCoins))}{stat('Frais payés', coins(p.feesPaidCoins))}{stat('Impôts payés', coins(p.taxPaidCoins))}
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <h3 style={{ margin: 0, padding: '12px 14px', color: 'var(--ik-text)', fontSize: 16 }}>Mes positions</h3>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ik-text-2)', fontSize: 13, minWidth: 600 }}>
          <thead><tr style={{ color: 'var(--ik-text-3)', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: '8px 12px' }}>Actif</th><th style={{ padding: 8 }}>Quantité</th><th style={{ padding: 8 }}>Prix moyen</th><th style={{ padding: 8 }}>Prix</th><th style={{ padding: 8 }}>Valeur</th><th style={{ padding: 8 }}>Latent</th><th style={{ padding: 8 }}>Part</th></tr></thead>
          <tbody>
            {p.positions.map((x) => (
              <tr key={x.symbol} data-testid={`pos-${x.symbol}`} onClick={() => onOpen(x.symbol)} style={{ cursor: 'pointer', borderTop: '1px solid color-mix(in srgb, var(--ik-text) 7%, transparent)', textAlign: 'right' }}>
                <td style={{ textAlign: 'left', padding: '10px 12px' }}><b>{x.symbol}</b> <span style={{ color: 'var(--ik-text-3)' }}>{x.name}</span></td>
                <td style={{ padding: 8 }}>{x.quantity}</td><td style={{ padding: 8 }}>{unitCoins(x.avgCostCoins)}</td><td style={{ padding: 8 }}>{fmtPrice(x.priceCoins, x.priceUsd)}</td><td style={{ padding: 8 }}>{x.valueCoins == null ? '—' : coins(x.valueCoins)}</td>
                <td style={{ padding: 8, color: tone(x.unrealizedCoins) }}>{coins(x.unrealizedCoins)}{x.unrealizedPct !== null && ` (${x.unrealizedPct >= 0 ? '+' : ''}${x.unrealizedPct.toLocaleString('fr-FR')} %)`}</td><td style={{ padding: 8 }}>{x.allocationPct.toLocaleString('fr-FR')} %</td>
              </tr>
            ))}
            {!p.positions.length && <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--ik-text-3)' }}>Aucune position : ouvre un actif du marché pour acheter.</td></tr>}
          </tbody></table></div>
      </div>
      <SwapCard positions={p.positions} assets={assets} onDone={load} />
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', color: 'var(--ik-text)', fontSize: 16 }}>Ordres en attente</h3>
        {p.openOrders.length === 0 ? <div style={{ color: 'var(--ik-text-3)', fontSize: 13 }}>Aucun ordre en attente.</div> : p.openOrders.map((o) => (
          <div key={o.id} data-testid={`open-${o.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid color-mix(in srgb, var(--ik-text) 7%, transparent)', fontSize: 13, color: 'var(--ik-text-2)' }}>
            <span style={{ flex: '1 1 240px' }}><b>{o.side === 'buy' ? 'Achat' : 'Vente'}</b> {o.quantity} {o.symbol} · {TYPE_LABEL[o.type]} à {unitCoins(o.triggerCoins)}</span>
            <button style={btn(false)} onClick={() => cancel(o.id)}>Annuler</button>
          </div>
        ))}
      </div>
      <div style={card}>
        <h3 style={{ margin: '0 0 8px', color: 'var(--ik-text)', fontSize: 16 }}>Historique des exécutions</h3>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ik-text-2)', fontSize: 12, minWidth: 560 }}>
          <thead><tr style={{ color: 'var(--ik-text-3)', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: 6 }}>Date simulée</th><th style={{ padding: 6, textAlign: 'left' }}>Ordre</th><th style={{ padding: 6 }}>Prix</th><th style={{ padding: 6 }}>Montant</th><th style={{ padding: 6 }}>Frais</th><th style={{ padding: 6 }}>Impôt</th><th style={{ padding: 6 }}>Gain</th></tr></thead>
          <tbody>{history.map((o) => (
            <tr key={o.id} style={{ borderTop: '1px solid color-mix(in srgb, var(--ik-text) 7%, transparent)', textAlign: 'right' }}>
              <td style={{ textAlign: 'left', padding: 6 }}>{dateFr(o.fill.simAt)}</td><td style={{ textAlign: 'left', padding: 6 }}>{o.side === 'buy' ? 'Achat' : 'Vente'} {o.fill.quantity} {o.symbol}</td>
              <td style={{ padding: 6 }}>{unitCoins(o.fill.priceCoins)}</td><td style={{ padding: 6 }}>{coins(o.fill.notionalCoins)}</td><td style={{ padding: 6 }}>{coins(o.fill.feeCoins)}</td><td style={{ padding: 6 }}>{coins(o.fill.taxCoins)}</td>
              <td style={{ padding: 6, color: o.fill.gainCoins == null ? 'var(--ik-text-3)' : tone(o.fill.gainCoins) }}>{o.fill.gainCoins == null ? '—' : coins(o.fill.gainCoins)}</td>
            </tr>))}
            {!history.length && <tr><td colSpan={7} style={{ padding: 12, textAlign: 'center', color: 'var(--ik-text-3)' }}>Aucune exécution pour l&apos;instant.</td></tr>}
          </tbody></table></div>
      </div>
    </div>
  );
}

const KIND_COLOR = { crash: 'var(--ik-negative)', rally: 'var(--ik-positive)', platform_failure: 'var(--ik-warning)', regulation: 'var(--ik-accent)', rates: 'var(--ik-info)', milestone: 'var(--ik-text-3)', outage: 'var(--ik-warning)', volatility: 'var(--ik-warning)' };

function JournalView({ simulatedAt }) {
  const [events, setEvents] = useState(null);
  useEffect(() => { call('/events').then((r) => setEvents(r.events)).catch(() => setEvents([])); }, [simulatedAt]);
  if (!events) return <div style={{ color: 'var(--ik-text-3)' }}>Chargement…</div>;
  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0,1fr)' }}>
      <p style={{ color: 'var(--ik-text-3)', margin: 0, fontSize: 13 }}>Les événements du marché apparaissent ici au fur et à mesure que ta date simulée les franchit, avec la leçon à en tirer. Les incidents et épisodes de volatilité « aléatoires » sont tirés de façon reproductible : ils ne dépendent pas de tes choix.</p>
      {events.map((e) => (
        <div key={e.key} data-testid={`event-${e.key}`} style={{ ...card, borderLeft: `4px solid ${KIND_COLOR[e.kind] || 'var(--ik-text-3)'}` }}>
          <div style={{ fontSize: 12, color: 'var(--ik-text-3)' }}>{dateFr(Date.parse(e.date))} · <span style={{ color: KIND_COLOR[e.kind] || 'var(--ik-text-3)', fontWeight: 700 }}>{e.kindLabel}</span>{e.origin === 'random' && ' · tirage du jeu'}</div>
          <div style={{ color: 'var(--ik-text)', fontWeight: 800, margin: '2px 0 4px' }}>{e.title}</div>
          <div style={{ color: 'var(--ik-text-2)', fontSize: 14, lineHeight: 1.5 }}>{e.message}</div>
          <div style={{ color: 'var(--ik-warning)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}><Icon name="lightbulb" size={18} /> {e.lesson}</div>
        </div>
      ))}
      {!events.length && <div style={card}><span style={{ color: 'var(--ik-text-3)' }}>Aucun événement pour l&apos;instant : avance dans le temps pour découvrir l&apos;histoire du marché.</span></div>}
      <div style={{ color: 'var(--ik-text-3)', fontSize: 11 }}>Chiffres arrondis à titre pédagogique, à reconfirmer avant toute citation.</div>
    </div>
  );
}

function SwapCard({ positions, assets, onDone }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [qty, setQty] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await call('/swap', 'POST', { clientOrderId: uid(), from, to, quantity: qty });
      setMsg({ ok: true, text: `Échangé : tu reçois ${r.received.quantity} ${r.received.symbol}. Frais : ${coinsText(r.order.fill.feeCoins)}. Aucun impôt.` });
      setQty(''); onDone();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  if (!positions.length) return null;
  return (
    <div style={card} data-testid="swap-card">
      <h3 style={{ margin: '0 0 6px', color: 'var(--ik-text)', fontSize: 16 }}>Échanger une crypto contre une autre<HelpTip term="echange-crypto" /></h3>
      <p style={{ margin: '0 0 10px', color: 'var(--ik-text-3)', fontSize: 13 }}>Pas d&apos;impôt sur un échange crypto contre crypto : l&apos;impôt n&apos;intervient qu&apos;à la sortie vers l&apos;euro. Tu paies seulement les frais, et ton prix de revient est reporté sur l&apos;actif reçu.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select aria-label="Actif à donner" style={input} value={from} onChange={(e) => setFrom(e.target.value)}><option value="">Je donne…</option>{positions.map((p) => <option key={p.symbol} value={p.symbol}>{p.symbol} ({p.quantity})</option>)}</select>
        <select aria-label="Actif à recevoir" style={input} value={to} onChange={(e) => setTo(e.target.value)}><option value="">Je reçois…</option>{assets.filter((a) => a.symbol !== from && !a.collapsed).map((a) => <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>)}</select>
        <input aria-label="Quantité à échanger" inputMode="decimal" placeholder="Quantité" style={{ ...input, width: 130 }} value={qty} onChange={(e) => setQty(e.target.value.replace(',', '.'))} />
        <button data-testid="swap-submit" style={btn(true)} disabled={busy || !from || !to || !qty} onClick={submit}>Échanger</button>
      </div>
      {msg && <div role="status" style={{ marginTop: 8, fontSize: 13, color: msg.ok ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{msg.text}</div>}
    </div>
  );
}

function LoanView({ simulatedAt, refreshKey, onChanged }) {
  const [v, setV] = useState(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [repay, setRepay] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { call('/loan').then(setV).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  useEffect(() => { load(); }, [load, simulatedAt, refreshKey]);
  const doQuote = async () => { setMsg(null); try { setQuote(await call('/loan/quote', 'POST', { amountCoins: Number(amount) })); } catch (e) { setQuote(null); setMsg({ ok: false, text: e.message }); } };
  const act = async (fn, okText) => { if (busy) return; setBusy(true); setMsg(null); try { const r = await fn(); setMsg({ ok: true, text: r.message || okText }); setQuote(null); setAmount(''); setRepay(''); load(); onChanged(); } catch (e) { setMsg({ ok: false, text: e.message }); } setBusy(false); };
  if (!v) return <div style={{ color: 'var(--ik-text-3)' }}>{msg ? msg.text : 'Chargement…'}</div>;
  const stateLabel = { ok: 'Garantie suffisante', call: 'APPEL DE MARGE', liquidation: 'VENTE FORCÉE imminente' };
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0,1fr)' }} data-testid="loan-view">
      <div style={card}>
        <h3 style={{ margin: '0 0 6px', color: 'var(--ik-text)', fontSize: 16 }}>Prêt sur mon portefeuille Crypto<HelpTip term="ltv" /></h3>
        <p style={{ margin: 0, color: 'var(--ik-text-3)', fontSize: 13, lineHeight: 1.5 }}>La banque te prête jusqu&apos;à <b>{v.ltv.max} %</b> de la valeur de tes cryptos. Si ta dette dépasse <b>{v.ltv.call} %</b> de cette valeur : appel de marge<HelpTip term="appel-de-marge" />. Au-delà de <b>{v.ltv.liquidation} %</b> : tes cryptos sont vendues de force (liquidation<HelpTip term="liquidation" />). Les pièces empruntées ne servent que dans le domaine Crypto. <b>Emprunter amplifie les gains… et les pertes.</b></p>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ik-text-2)' }}>Valeur de ta garantie : <b>{coins(v.limits.value)}</b> · capacité d&apos;emprunt : <b>{coins(v.capacityCoins)}</b></div>
      </div>
      {v.loan ? (
        <div style={{ ...card, borderColor: v.loan.state === 'ok' && !v.loan.marginCall ? undefined : 'var(--ik-negative)' }} data-testid="loan-active">
          <div style={{ color: 'var(--ik-text)', fontWeight: 800 }}>Dette : {coins(v.loan.debtCoins)} <span style={{ color: 'var(--ik-text-3)', fontWeight: 400, fontSize: 13 }}>(capital {coins(v.loan.principalCoins)}, taux variable {v.loan.annualRatePct.toLocaleString('fr-FR')} %)</span></div>
          <div style={{ fontSize: 13, color: 'var(--ik-text-2)', margin: '6px 0' }}>Dette ÷ garantie : <b>{v.loan.ltvPct.toLocaleString('fr-FR')} %</b> · {stateLabel[v.loan.state]}{v.loan.marginCall && <span style={{ color: 'var(--ik-negative)' }}> — appel de marge en cours : rembourse ou achète des cryptos avant d&apos;avancer dans le temps, sinon vente forcée.</span>}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input aria-label="Montant à rembourser" inputMode="numeric" placeholder="Montant en InvestCoins" style={{ ...input, width: 150 }} value={repay} onChange={(e) => setRepay(e.target.value.replace(/[^0-9]/g, ''))} />
            <button style={btn(true)} disabled={busy || !repay} onClick={() => act(() => call('/loan/repay', 'POST', { loanId: v.loan.id, coins: Number(repay) }), 'Remboursement effectué.')}>Rembourser</button>
            <button style={btn(false)} disabled={busy} onClick={() => act(() => call('/loan/repay', 'POST', { loanId: v.loan.id, coins: Math.ceil(v.loan.debtCoins) }), 'Prêt soldé.')}>Tout rembourser</button>
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input aria-label="Montant à emprunter" inputMode="numeric" placeholder="Montant à emprunter en InvestCoins" style={{ ...input, width: 220 }} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
            <button data-testid="loan-quote" style={btn(false)} disabled={!amount} onClick={doQuote}>Simuler</button>
          </div>
          {quote && (
            <div data-testid="loan-quote-result" style={{ marginTop: 10, fontSize: 13, color: 'var(--ik-text-2)', lineHeight: 1.6 }}>
              {quote.approved ? <>Taux variable <b>{quote.loan.annualRatePct.toLocaleString('fr-FR')} %</b> · intérêts d&apos;environ <b>{coins(quote.loan.yearlyInterestCoins)}</b> par an simulé. {quote.loan.interest}<br />{quote.margin}<br />{quote.earmark}<br /><span style={{ color: 'var(--ik-warning)' }}>{quote.simplification}</span><br />
                <button data-testid="loan-borrow" style={{ ...btn(true), marginTop: 8 }} disabled={busy} onClick={() => act(() => call('/loan/borrow', 'POST', { amountCoins: Number(amount) }), 'Prêt accordé.')}>Emprunter {coins(quote.loan.amountCoins)}</button></>
                : <span style={{ color: 'var(--ik-negative)' }}>{quote.reasons.map((r) => r.message).join(' ')}</span>}
            </div>
          )}
        </div>
      )}
      {msg && <div role="status" style={{ ...card, color: msg.ok ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{msg.text}</div>}
    </div>
  );
}

function BoardView({ simulatedAt }) {
  const [b, setB] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { call('/leaderboard').then(setB).catch((e) => setErr(e.message)); }, [simulatedAt]);
  if (err) return <div style={card}><span style={{ color: 'var(--ik-negative)' }}>{err}</span></div>;
  if (!b) return <div style={{ color: 'var(--ik-text-3)' }}>Chargement…</div>;
  const pct = (n) => `${n > 0 ? '+' : ''}${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
  return (
    <div style={card} data-testid="board">
      <h3 style={{ margin: '0 0 6px', color: 'var(--ik-text)', fontSize: 16 }}>Classement Crypto — {b.period}<HelpTip term="levier" /></h3>
      <p style={{ margin: '0 0 10px', color: 'var(--ik-text-3)', fontSize: 13, lineHeight: 1.5 }}>Il compare les joueurs au <b>même mois simulé</b>, en pourcentage, <b>net de dettes</b> : les intérêts d&apos;un prêt sont déduits, le gain est rapporté à ton capital propre et le <b>levier</b> utilisé est affiché. Il faut avoir investi au moins {b.minCapital} <Coin /> pour être classé.</p>
      <RankingProgress progress={b.progress} />
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ik-text-2)', fontSize: 13, minWidth: 360 }}>
        <thead><tr style={{ color: 'var(--ik-text-3)', textAlign: 'right' }}><th style={{ textAlign: 'left', padding: 6 }}>#</th><th style={{ textAlign: 'left', padding: 6 }}>Joueur</th><th style={{ padding: 6 }}>Performance</th><th style={{ padding: 6 }}>Levier</th></tr></thead>
        <tbody>{b.entries.map((e) => (
          <tr key={e.rank + e.username} style={{ borderTop: '1px solid color-mix(in srgb, var(--ik-text) 7%, transparent)', textAlign: 'right', background: e.isMe ? 'color-mix(in srgb, var(--ik-primary) 15%, transparent)' : undefined }}>
            <td style={{ textAlign: 'left', padding: 6 }}>{e.rank}</td><td style={{ textAlign: 'left', padding: 6 }}>{e.username}{e.isMe && ' (toi)'}</td>
            <td style={{ padding: 6, color: e.performancePct >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{pct(e.performancePct)}</td><td style={{ padding: 6 }}>{e.leverage ? `×${e.leverage.toLocaleString('fr-FR')}` : '—'}</td>
          </tr>))}
          {!b.entries.length && <tr><td colSpan={4} style={{ padding: 14, textAlign: 'center', color: 'var(--ik-text-3)' }}>Personne n&apos;est encore classé ce mois-ci.</td></tr>}
        </tbody></table></div>
      {b.me && b.me.rank > b.entries.length && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ik-accent)' }}>Ton rang : {b.me.rank} sur {b.totalRanked} ({pct(b.me.performancePct)})</div>}
    </div>
  );
}

function StartScreen({ starts, onStart, busy }) {
  const [pick, setPick] = useState('y2017');
  return (
    <div>
      <h2 style={{ color: 'var(--ik-text)', marginTop: 0 }}>Commence ta partie Crypto</h2>
      <p style={{ color: 'var(--ik-text-3)' }}>Choisis la date de départ de ta simulation. Tu reverras l&apos;histoire réelle du marché, jour après jour : tu ne verras jamais ce qui se passe après ta date, et tu ne peux pas revenir en arrière.</p>
      <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
        {starts.map((s) => (
          <label key={s.id} style={{ ...card, display: 'flex', gap: 10, alignItems: 'center', cursor: s.available ? 'pointer' : 'not-allowed', opacity: s.available ? 1 : 0.5, borderColor: pick === s.id ? 'color-mix(in srgb, var(--ik-primary) 80%, transparent)' : undefined }}>
            <input type="radio" name="start" value={s.id} checked={pick === s.id} disabled={!s.available} onChange={() => setPick(s.id)} />
            <span style={{ color: 'var(--ik-text-2)' }}>{s.label}{!s.available && ' — données pas encore importées'}</span>
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
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--ik-text-2)', fontSize: 13, minWidth: 560 }}>
          <thead><tr style={{ color: 'var(--ik-text-3)', textAlign: 'right' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px' }}>Actif</th><th style={{ padding: 8 }}>Prix</th><th style={{ padding: 8 }}>24 h</th><th style={{ padding: 8 }}>7 j</th><th style={{ padding: 8 }}>30 j</th><th style={{ padding: 8 }}>Volume 24 h<HelpTip term="volume" /></th><th style={{ padding: 8 }}>Capi.<HelpTip term="capitalisation" /></th><th style={{ padding: 8 }}>Risque<HelpTip term="drawdown" /></th>
          </tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.symbol} data-testid={`row-${a.symbol}`} onClick={() => onOpen(a.symbol)} style={{ cursor: 'pointer', borderTop: '1px solid color-mix(in srgb, var(--ik-text) 7%, transparent)', textAlign: 'right', opacity: a.stale ? 0.6 : 1 }}>
                <td style={{ textAlign: 'left', padding: '10px 12px' }}><strong>{a.symbol}</strong> <span style={{ color: 'var(--ik-text-3)' }}>{a.name}</span>{a.synthetic && <span title="Données fictives" style={{ marginLeft: 6, fontSize: 10, color: 'var(--ik-warning)', border: '1px solid var(--ik-warning)', borderRadius: 4, padding: '0 4px' }}>FICTIF</span>}{a.collapsed && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ik-negative)', border: '1px solid var(--ik-negative)', borderRadius: 4, padding: '0 4px' }}>EFFONDRÉ</span>}</td>
                <td style={{ padding: 8 }}>{fmtPrice(a.priceCoins, a.price)}</td><td style={{ padding: 8 }}><Pct v={a.change1d} /></td><td style={{ padding: 8 }}><Pct v={a.change7d} /></td><td style={{ padding: 8 }}><Pct v={a.change30d} /></td>
                <td style={{ padding: 8 }}>{big(a.volume24h)}</td><td style={{ padding: 8 }}>{big(a.marketCap)}</td><td style={{ padding: 8 }}>{'●'.repeat(a.risk)}<span style={{ color: 'var(--ik-border-strong)' }}>{'●'.repeat(5 - a.risk)}</span></td>
              </tr>
            ))}
            {!assets.length && <tr><td colSpan={8} style={{ padding: 18, color: 'var(--ik-text-3)', textAlign: 'center' }}>Aucun actif ne correspond à ta recherche à cette date.</td></tr>}
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
    ...(mine.position ? [{ price: mine.position.avgCostCoins, unit: 'coins', color: 'line', title: 'prix moyen' }] : []),
    ...((mine.open || []).map((o) => ({ price: o.triggerCoins, unit: 'coins', color: o.side === 'buy' ? 'up' : 'down', title: TYPE_LABEL[o.type] }))),
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

  const loader = useCallback((sym, frame, before) => call(`/candles?symbol=${encodeURIComponent(sym)}&tf=${frame}${before != null ? `&before=${before}` : ''}&limit=300${state.fx?.available ? '&unit=coins' : ''}`).catch((e) => { if (e.code === 'FX_UNAVAILABLE') return call(`/candles?symbol=${encodeURIComponent(sym)}&tf=${frame}${before != null ? `&before=${before}` : ''}&limit=300`); throw e; }), [state.fx?.available]);
  const a = info?.asset;
  const frames = state.timeframes.filter((t) => !info || info.timeframes.includes(t.id));

  if (err && !a) return <div style={card}><p style={{ color: 'var(--ik-negative)' }}>{err}</p><button style={btn(false)} onClick={onBack}>← Retour au marché</button></div>;
  if (!a) return <div style={{ color: 'var(--ik-text-3)' }}>Chargement…</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, minWidth: 0 }}>
      <button style={{ ...btn(false), justifySelf: 'start' }} onClick={onBack}>← Retour au marché</button>
      {a.synthetic && <div role="alert" data-testid="synthetic-banner" style={{ ...card, borderColor: 'var(--ik-warning)', color: 'var(--ik-warning)' }}>DONNÉES FICTIVES — ces cours sont générés pour essayer l&apos;interface, ils ne représentent aucun marché réel.</div>}
      <div style={card}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, color: 'var(--ik-text)' }}>{a.name} <span style={{ color: 'var(--ik-text-3)', fontSize: 16 }}>{a.symbol}</span></h2>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--ik-text)' }}>{fmtPrice(a.priceCoins, a.price)}</span>{a.priceCoins != null && <span style={{ color: 'var(--ik-text-3)', fontSize: 13 }}>({usd(a.price)})</span>}<Pct v={a.change1d} />
        </div>
        <div style={{ color: 'var(--ik-text-3)', fontSize: 13, margin: '4px 0 10px' }}>{state.categories[a.category] || a.category} · coté depuis le {a.listedSince ? dateFr(Date.parse(a.listedSince)) : '—'}</div>
        <p style={{ color: 'var(--ik-text-2)', lineHeight: 1.6, margin: '0 0 10px' }}>{a.description}</p>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'var(--ik-text-2)' }}>
          <span>Capitalisation<HelpTip term="capitalisation" /> : <b>{big(a.marketCap)}</b></span><span>Volume 24 h<HelpTip term="volume" /> : <b>{big(a.volume24h)}</b></span>
          <span>Plus haut historique (à ce jour)<HelpTip term="plus-haut-historique" /> : <b>{usd(a.allTimeHigh)}</b></span><span>Plus bas : <b>{usd(a.allTimeLow)}</b></span>
          <span>Liquidité : <b>palier {a.liquidityTier}</b><HelpTip term="palier-liquidite" /></span>
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ik-text) 15%, transparent)', color: 'var(--ik-text-2)', fontSize: 13 }}>
          <b>Risque {a.risk}/5</b> — {state.riskLabels[a.risk]}
        </div>
        {a.collapse && (
          <div role="alert" style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--ik-negative)', background: 'var(--ik-negative-soft)', color: 'var(--ik-negative)', fontSize: 13 }}>
            <b>{a.collapse.title}</b> ({dateFr(Date.parse(a.collapse.date))}) — {a.collapse.explanation}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {frames.map((t) => <button key={t.id} data-testid={`tf-${t.id}`} onClick={() => setTf(t.id)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${tf === t.id ? 'color-mix(in srgb, var(--ik-primary) 80%, transparent)' : 'color-mix(in srgb, var(--ik-text) 18%, transparent)'}`, background: tf === t.id ? 'color-mix(in srgb, var(--ik-primary) 30%, transparent)' : 'var(--ik-surface-2)', color: tf === t.id ? 'var(--ik-accent)' : 'var(--ik-text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.label}</button>)}
        </div>
        <PriceChart key={symbol} symbol={symbol} tf={tf} candleLoader={loader} refreshKey={refreshKey} markers={markers} levels={levels} />
      </div>

      <OrderTicket symbol={symbol} asset={a} owned={mine.position?.quantity} committed={(mine.open || []).filter((o) => o.side === 'sell').reduce((t, o) => t + Number(o.quantity), 0)} onDone={() => { reloadMine(); onTraded(); }} />

      <div style={card}>
        <h3 style={{ margin: '0 0 8px', color: 'var(--ik-text)', fontSize: 16 }}>Comparer avec d&apos;autres actifs<HelpTip term="base-100" /></h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <select aria-label="Ajouter un actif à comparer" style={input} value="" onChange={(e) => { const v = e.target.value; if (v && cmpWith.length < 3 && !cmpWith.includes(v)) setCmpWith([...cmpWith, v]); }}>
            <option value="">+ Ajouter un actif…</option>
            {allAssets.filter((x) => x.symbol !== symbol && !cmpWith.includes(x.symbol)).map((x) => <option key={x.symbol} value={x.symbol}>{x.symbol} — {x.name}</option>)}
          </select>
          {cmpWith.map((s) => <button key={s} style={btn(false)} onClick={() => setCmpWith(cmpWith.filter((x) => x !== s))}>{s} ✕</button>)}
        </div>
        {cmpData ? <CompareChart data={cmpData} /> : <div style={{ color: 'var(--ik-text-3)', fontSize: 13 }}>Choisis jusqu&apos;à 3 actifs : les courbes sont ramenées à 100 pour comparer leur évolution.</div>}
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
    try { const r = await call('/time/advance', 'POST', { step }); await loadState(); setRefreshKey((k) => k + 1); const f = (r.events || []).filter((e) => e.status === 'filled').length; const c = (r.events || []).filter((e) => e.status === 'cancelled').length; const ev = (r.marketEvents || []).length; const le = (r.loanEvents || []).map((x) => x.message.split('.')[0]); if (le.length) setMsg(le.join(' · ')); if (f || c || ev) setInfo(`${f || c ? `Ordres en attente : ${f} exécuté(s)${c ? `, ${c} annulé(s)` : ''}. ` : ''}${ev ? `${ev} événement(s) de marché : ouvre le Journal du marché pour lire l'explication.` : ''}`); } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const allAssets = useMemo(() => assets, [assets]);
  if (!state) return <AppShell><p style={{ color: 'var(--ik-text-3)' }}>{msg || 'Chargement…'}</p></AppShell>;

  return (
    <AppShell>
    <div style={{ color: 'var(--ik-text-2)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--ik-text)', fontSize: 26 }}>₿ Marché Crypto</h1>
        <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}><Link href="/education/crypto_market" data-testid="learn-link" style={{ color: 'var(--ik-warning)', fontSize: 14 }}>Apprendre : cours et quiz</Link><Link href="/glossaire" style={{ color: 'var(--ik-accent)', fontSize: 14 }}>Glossaire</Link><Link href="/dashboard" style={{ color: 'var(--ik-accent)', fontSize: 14 }}>← Tableau de bord</Link></span>
      </div>
      {info && <div role="status" style={{ ...card, borderColor: 'color-mix(in srgb, var(--ik-primary) 60%, transparent)', color: 'var(--ik-accent)', marginBottom: 12 }}>{info}</div>}
      {msg && <div role="alert" style={{ ...card, borderColor: 'var(--ik-negative)', color: 'var(--ik-negative)', marginBottom: 12 }}>{msg}</div>}

      {!state.hasAccount ? (
        state.dataReady ? <StartScreen starts={state.starts} onStart={start} busy={busy} />
          : <div style={card}><p style={{ color: 'var(--ik-text-2)', margin: 0 }}>Les données de marché ne sont pas encore importées : ce domaine ouvrira dès que l&apos;historique sera chargé sur le serveur.</p></div>
      ) : (
        <>
          <div style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: 12, color: 'var(--ik-text-3)', textTransform: 'uppercase' }}>Date simulée</div>
              <div data-testid="sim-date" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ik-text)' }}>{dateFr(simulatedAt)}</div>
            </div>
            {[['day', '+1 jour'], ['week', '+1 semaine'], ['month', '+1 mois']].map(([id, l]) => <button key={id} data-testid={`adv-${id}`} style={btn(true)} disabled={busy || !state.account.canAdvance} onClick={() => advance(id)}>{l}</button>)}
            {!state.account.canAdvance && <span style={{ color: 'var(--ik-text-3)', fontSize: 12 }}>Fin des données disponibles.</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['market', 'Marché'], ['portfolio', 'Mon portefeuille'], ['bank', 'Banque'], ['board', 'Classement'], ['journal', 'Journal du marché']].map(([id, l]) => <button key={id} data-testid={`tab-${id}`} onClick={() => { setTab(id); setSelected(null); }} style={{ ...btn(tab === id), background: tab === id ? 'var(--ik-primary)' : 'color-mix(in srgb, var(--ik-primary) 15%, transparent)' }}>{l}</button>)}
          </div>
          {tab === 'journal' ? <JournalView simulatedAt={simulatedAt} refreshKey={refreshKey} />
            : tab === 'bank' ? <LoanView simulatedAt={simulatedAt} refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
            : tab === 'board' ? <BoardView simulatedAt={simulatedAt} />
            : tab === 'portfolio'
            ? <PortfolioView simulatedAt={simulatedAt} refreshKey={refreshKey} assets={allAssets} onOpen={(sym) => { setTab('market'); setSelected(sym); }} />
            : selected
              ? <AssetView symbol={selected} state={state} simulatedAt={simulatedAt} refreshKey={refreshKey} allAssets={allAssets} onBack={() => setSelected(null)} onTraded={() => setRefreshKey((k) => k + 1)} />
              : <AssetList assets={allAssets} onOpen={setSelected} filters={filters} setFilters={setFilters} categories={state.categories} />}
        </>
      )}
      <p style={{ color: 'var(--ik-text-3)', fontSize: 11, marginTop: 24 }}>{state.attribution}</p>
    </div>
    </AppShell>
  );
}
