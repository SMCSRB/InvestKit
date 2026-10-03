'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import { Button, Card, CardHead, Delta, EmptyState, Skeleton, StatCard, Tabs } from '@/app/components/ui/primitives';
import Coin from '@/app/components/ui/Coin';
import { Medal } from '@/app/components/ui/Icon';
import HelpTip from '@/app/components/HelpTip';
import HistoryChart from '@/app/components/HistoryChart';
import PortfolioRisk from '@/app/components/PortfolioRisk';
import RankingProgress from '@/app/components/ui/RankingProgress';

// Bourse et PEA : page dédiée (comme Crypto et Immobilier). Tout vient du serveur : prix de l'année simulée, frais, impôts, accès.
// Le navigateur n'invente rien : aperçu d'un achat ou d'une vente = calcul du serveur, exécuté seulement après confirmation.
const API = process.env.NEXT_PUBLIC_API_URL;
const DOMAIN = 'stocks';
const fr = (n, d = 2) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const qtyFr = (n) => fr(n, 6);
const TYPE = { stock: 'Action', etf: 'ETF' };

async function call(path, method = 'GET', body) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API}/trading${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.status = res.status; e.code = data.code; throw e; }
  return data;
}

const Money = ({ v, d = 0 }) => <>{fr(v, d)} <Coin size={16} /></>;

function Header({ p, busy, onAdvance }) {
  const atEnd = p.simulatedYear >= p.maxYear;
  return (
    <PageHeader
      title="Bourse et PEA"
      subtitle="Actions et ETF français et mondiaux, rejoués année par année. Les frais et les impôts sont expliqués avant chaque ordre."
      actions={(
        <>
          <Button href="/education/stocks" variant="ghost" icon="book">Apprendre : cours et quiz</Button>
          <Button variant="primary" onClick={onAdvance} loading={busy} disabled={busy || atEnd} icon="calendar" data-testid="advance-year">
            {atEnd ? `Déjà en ${p.maxYear}` : `Avancer d'un an (${p.simulatedYear + 1})`}
          </Button>
        </>
      )}
    />
  );
}

function Stats({ p }) {
  const gain = p.marketValue - p.costBasis;
  return (
    <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
      <StatCard icon="calendar" label="Année simulée" value={p.simulatedYear} format={(v) => String(v)} help={<HelpTip term="annee-simulee" />} />
      <StatCard icon="coins" label="Solde" value={p.cashBalance} unit={<Coin size={20} />} deltaLabel="à dépenser" />
      <StatCard icon="chart" label="Valeur des positions" value={p.marketValue} unit={<Coin size={20} />} help={<HelpTip term="valeur-positions" />}
        delta={p.costBasis > 0 ? p.performancePct : undefined} deltaLabel={p.costBasis > 0 ? `${gain >= 0 ? '+' : ''}${fr(gain, 0)} depuis l'achat` : 'rien d\'acheté pour l\'instant'} />
      <StatCard icon="wallet" label="Total" value={p.totalValue} unit={<Coin size={20} />} deltaLabel="solde + positions" />
    </div>
  );
}

function AccessBanner({ p, onChoose, busy }) {
  const reason = p.access?.reason;
  if (reason === 'FREE_DOMAIN_NOT_CHOSEN') {
    return (
      <Card>
        <CardHead title="Choisis ton domaine gratuit" icon="target" />
        <p className="ik-muted">Le plan gratuit débloque l&apos;achat dans <strong>un seul</strong> domaine ; ce choix est définitif (le plan Pro les ouvre tous). Tu peux déjà tout consulter ici.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" disabled={busy} onClick={() => onChoose('stocks')}>Bourse et PEA</Button>
          <Button disabled={busy} onClick={() => onChoose('crypto')}>Crypto</Button>
          <Button disabled={busy} onClick={() => onChoose('real_estate')}>Immobilier</Button>
        </div>
      </Card>
    );
  }
  if (reason === 'DOMAIN_LOCKED') {
    return (
      <Card>
        <CardHead title="La Bourse est verrouillée sur ton plan gratuit" icon="lock" />
        <p className="ik-muted">Ton domaine gratuit est un autre domaine : tu peux consulter la Bourse, mais pas acheter. Le plan Pro ouvre tous les domaines.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button href="/dashboard?tab=settings" variant="primary">Voir l&apos;offre Pro</Button>
          {p.canChangeFreeDomain && <Button disabled={busy} onClick={() => onChoose('stocks')}>Passer ma Bourse en domaine gratuit (dernier changement)</Button>}
        </div>
      </Card>
    );
  }
  return null;
}

// ── Marché : liste des titres + fiche + ordre ──
function Market({ assets, p, onTraded, setError }) {
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [account, setAccount] = useState('pea');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => assets.filter((a) => (`${a.name} ${a.symbol}`).toLowerCase().includes(q.trim().toLowerCase())), [assets, q]);
  const sel = assets.find((a) => a.symbol === selected) ?? null;
  const price = sel ? p.prices?.[sel.symbol] : null;
  const owned = sel ? p.positions.filter((x) => x.symbol === sel.symbol).reduce((t, x) => t + x.quantity, 0) : 0;
  useEffect(() => { setQuote(null); }, [selected, quantity, account]);
  useEffect(() => { if (!selected && assets.length) setSelected((assets.find((a) => p.prices?.[a.symbol] != null) ?? assets[0]).symbol); }, [assets, selected, p.prices]);

  const nQty = Number(quantity);
  const validQty = Number.isInteger(nQty) && nQty >= 1;
  const preview = async () => {
    setError(''); setBusy(true);
    try { setQuote(await call('/quote', 'POST', { domain: DOMAIN, side: 'buy', symbol: sel.symbol, quantity: nQty, account })); }
    catch (e) { setError(e.message); setQuote(null); }
    setBusy(false);
  };
  const buy = async () => {
    setError(''); setBusy(true);
    try { await call('/buy', 'POST', { domain: DOMAIN, symbol: sel.symbol, quantity: nQty, account }); setQuote(null); await onTraded(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
      <Card>
        <CardHead title="Titres" icon="chart" />
        <input className="ik-input" aria-label="Rechercher un titre" placeholder="Rechercher (nom ou code)" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
        <div role="listbox" aria-label="Titres de la Bourse" style={{ display: 'grid', gap: 6, maxHeight: 520, overflowY: 'auto' }}>
          {list.map((a) => {
            const pr = p.prices?.[a.symbol];
            const mine = p.positions.some((x) => x.symbol === a.symbol);
            return (
              <button key={a.symbol} type="button" role="option" aria-selected={a.symbol === selected} data-testid={`asset-${a.symbol}`} onClick={() => setSelected(a.symbol)} disabled={pr == null && false}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', color: 'var(--ik-text)',
                  border: `1px solid ${a.symbol === selected ? 'var(--ik-primary)' : 'var(--ik-border)'}`, background: a.symbol === selected ? 'var(--ik-primary-soft, color-mix(in srgb, var(--ik-primary) 14%, transparent))' : 'var(--ik-surface-2)' }}>
                <span><strong>{a.symbol}</strong> <span className="ik-muted">{a.name}</span><br /><small className="ik-muted">{TYPE[a.type] ?? a.type}{mine ? ' · tu en possèdes' : ''}</small></span>
                <span className="ik-num">{pr == null ? <small className="ik-muted">pas encore coté</small> : <Money v={pr} d={2} />}</span>
              </button>
            );
          })}
          {list.length === 0 && <EmptyState icon="search" title="Aucun titre">Aucun titre ne correspond à « {q} ».</EmptyState>}
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
        {sel && (
          <>
            <Card>
              <CardHead title={`${sel.name} (${sel.symbol})`} icon="candles" />
              <p className="ik-muted" style={{ margin: '0 0 8px' }}>{TYPE[sel.type] ?? sel.type} · cours de clôture de {p.simulatedYear} : <strong>{price == null ? 'pas encore coté' : <Money v={price} d={2} />}</strong> · tu en possèdes <strong data-testid="owned">{qtyFr(owned)} {sel.symbol}</strong></p>
              <HistoryChart domain={DOMAIN} symbol={sel.symbol} simulatedYear={p.simulatedYear} enabled />
            </Card>
            <Card>
              <CardHead title="Acheter" icon="coins" />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="ik-field" style={{ display: 'grid', gap: 4 }}><span className="ik-muted">Quantité</span>
                  <input className="ik-input" type="number" min="1" step="1" inputMode="numeric" aria-label="Quantité" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: 110 }} /></label>
                <label className="ik-field" style={{ display: 'grid', gap: 4 }}><span className="ik-muted">Enveloppe<HelpTip term="pea" /></span>
                  <select className="ik-select" aria-label="Enveloppe" value={account} onChange={(e) => setAccount(e.target.value)}><option value="pea">PEA</option><option value="cto">Compte-titres</option></select></label>
                <Button onClick={preview} disabled={busy || price == null || !validQty || p.access?.canBuy === false} data-testid="preview-buy">Voir le coût</Button>
              </div>
              {price != null && validQty && !quote && <p className="ik-muted" style={{ margin: '10px 0 0' }}>≈ <Money v={price * nQty} d={2} /> + courtage<HelpTip term="courtage" /> (~{p.costs?.brokeragePct?.[sel.type] ?? 0} %)</p>}
              {quote && (
                <div data-testid="buy-quote" role="status" style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid var(--ik-border-strong)', background: 'var(--ik-surface-3, var(--ik-surface-2))', lineHeight: 1.7 }}>
                  <div>Tu achètes <strong>{qtyFr(nQty)} {sel.symbol}</strong> à <strong><Money v={quote.price} d={2} /></strong> l&apos;unité</div>
                  <div>Montant : <strong><Money v={quote.amount} d={2} /></strong> · courtage : <strong><Money v={quote.fee} d={2} /></strong></div>
                  <div>Total débité : <strong data-testid="buy-total"><Money v={quote.total} d={2} /></strong>{p.cashBalance < quote.total && <span style={{ color: 'var(--ik-negative)' }}> — il te manque <Money v={quote.total - p.cashBalance} d={2} /></span>}</div>
                  {quote.note && <div className="ik-muted">{quote.note}</div>}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <Button variant="primary" onClick={buy} loading={busy} disabled={busy || p.access?.canBuy === false} data-testid="confirm-buy">Confirmer l&apos;achat</Button>
                    <Button variant="ghost" onClick={() => setQuote(null)}>Annuler</Button>
                  </div>
                </div>
              )}
              {p.access?.canBuy === false && <p className="ik-muted" style={{ margin: '10px 0 0' }}>L&apos;achat est fermé sur ton plan actuel (voir plus haut).</p>}
              {p.costs?.pea && (
                <p className="ik-muted" style={{ margin: '12px 0 0', fontSize: 12 }}>
                  {account === 'pea'
                    ? (p.costs.pea.openedYear
                      ? `PEA ouvert en ${p.costs.pea.openedYear} : exonéré d'impôt sur le revenu à partir de ${p.costs.pea.exemptFromYear}. Versé : ${fr(p.costs.pea.deposits, 0)} sur ${fr(p.costs.pea.depositCeiling, 0)} de plafond.`
                      : 'Ton PEA s\'ouvre à ton premier achat : après 5 ans, plus d\'impôt sur le revenu sur les gains (il reste les prélèvements sociaux).')
                    : 'Compte-titres : flat tax sur chaque plus-value, sans condition de durée.'}
                </p>
              )}
              {p.costs && (p.costs.feesPaid > 0 || p.costs.taxPaid > 0) && <p className="ik-muted" style={{ margin: '8px 0 0', fontSize: 12 }}>Payé depuis le début : <Money v={p.costs.feesPaid} /> de courtage, <Money v={p.costs.taxPaid} /> d&apos;impôts.</p>}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ── Portefeuille ──
function Portfolio({ p, onTraded, setError }) {
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const preview = async (pos) => {
    setError(''); setBusy(true);
    try { setQuote({ ...(await call('/quote', 'POST', { domain: DOMAIN, side: 'sell', symbol: pos.symbol, quantity: pos.quantity, account: pos.account })), symbol: pos.symbol, quantity: pos.quantity }); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const sell = async () => {
    setError(''); setBusy(true);
    try { await call('/sell', 'POST', { domain: DOMAIN, symbol: quote.symbol, quantity: quote.quantity, account: quote.account }); setQuote(null); await onTraded(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {p.bank?.loan && (
        <Card><CardHead title="Prêt sur portefeuille en cours" icon="bank" />
          <p className="ik-muted" style={{ margin: 0 }}>
            {p.bank.loan.state !== 'ok' && <strong style={{ color: 'var(--ik-warning)' }}>Appel de marge : rembourse ou ajoute des titres avant le prochain passage d&apos;année, sinon vente forcée. </strong>}
            <Link href="/banque">Ouvrir la Banque</Link>
          </p>
        </Card>
      )}
      <Card>
        <CardHead title="Mes positions" icon="wallet" />
        {p.positions.length === 0 ? <EmptyState icon="chart" title="Aucune position">Achète ton premier titre dans l&apos;onglet Marché : le coût complet est affiché avant de valider.</EmptyState> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="rp-table" style={{ width: '100%', minWidth: 560 }}>
              <caption className="ik-sr-only">Positions de la Bourse</caption>
              <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Titre</th><th scope="col" className="ik-num">Quantité</th><th scope="col" className="ik-num">Prix moyen</th><th scope="col" className="ik-num">Valeur</th><th scope="col" className="ik-num">Gain latent</th><th scope="col"><span className="ik-sr-only">Action</span></th></tr></thead>
              <tbody>
                {p.positions.map((pos) => {
                  const price = p.prices?.[pos.symbol];
                  const value = price == null ? null : price * pos.quantity;
                  const gain = value == null ? null : value - pos.avgBuyPrice * pos.quantity;
                  return (
                    <tr key={`${pos.symbol}-${pos.account}`} data-testid={`pos-${pos.symbol}`}>
                      <td style={{ textAlign: 'left' }}><strong>{pos.symbol}</strong> <small className="ik-muted">{pos.account === 'cto' ? 'compte-titres' : pos.account === 'pea' ? 'PEA' : ''}</small></td>
                      <td className="ik-num">{qtyFr(pos.quantity)}</td>
                      <td className="ik-num"><Money v={pos.avgBuyPrice} d={2} /></td>
                      <td className="ik-num">{value == null ? '—' : <Money v={value} d={2} />}</td>
                      <td className="ik-num" style={{ color: gain == null ? undefined : gain >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{gain == null ? '—' : <>{gain >= 0 ? '+' : ''}{fr(gain, 2)} <Coin size={14} /></>}</td>
                      <td><Button size="sm" variant="ghost" onClick={() => preview(pos)} disabled={busy}>Vendre tout…</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {quote && (
          <div data-testid="sell-quote" role="status" style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid var(--ik-border-strong)', lineHeight: 1.7 }}>
            <strong>Vente de {qtyFr(quote.quantity)} {quote.symbol}</strong> : produit <Money v={quote.amount} d={2} />, courtage <Money v={quote.fee} d={2} />, impôt sur la plus-value <Money v={quote.tax} d={2} /> → <strong>tu reçois <Money v={quote.net} d={2} /></strong>.
            {quote.note && <div className="ik-muted">{quote.note}</div>}
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={sell} loading={busy} disabled={busy} data-testid="confirm-sell">Confirmer la vente</Button>
              <Button variant="ghost" onClick={() => setQuote(null)}>Annuler</Button>
            </div>
          </div>
        )}
      </Card>
      <PortfolioRisk domain={DOMAIN} refreshKey={`${p.simulatedYear}-${p.positions.length}-${p.cashBalance}-${p.marketValue}`} />
    </div>
  );
}

// ── Mes ordres : journal lu sur le registre du serveur ──
const KIND = { buy: 'Achat', sell: 'Vente', fee: 'Frais de courtage', tax: 'Impôt sur la plus-value' };
function Orders({ refreshKey }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    call(`/orders?domain=${DOMAIN}`).then((r) => { if (!off) setRows(r.orders); }).catch((e) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [refreshKey]);
  if (err) return <EmptyState icon="info" title="Journal indisponible">{err}</EmptyState>;
  if (!rows) return <Skeleton height={160} />;
  if (!rows.length) return <EmptyState icon="list" title="Aucun ordre pour l'instant">Tes achats et tes ventes apparaîtront ici, avec les frais et l&apos;impôt prélevés.</EmptyState>;
  return (
    <Card>
      <CardHead title="Mes ordres" icon="list" />
      <p className="ik-muted" style={{ margin: '0 0 10px' }}>Les frais de courtage et l'impôt sont de vraies lignes : ils sont retirés de ton solde et ne reviennent pas.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="ik-table" data-testid="orders-table">
          <thead><tr><th>Type</th><th>Titre</th><th>Année</th><th>Quantité</th><th>Prix</th><th>Enveloppe</th><th>Montant</th></tr></thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={i}>
                <td>{KIND[o.kind] ?? o.kind}</td>
                <td>{o.symbol ?? '—'}</td>
                <td className="ik-num">{o.year ?? '—'}</td>
                <td className="ik-num">{o.quantity ?? '—'}</td>
                <td className="ik-num">{o.price != null ? <>{fr(o.price, 2)} <Coin size={14} /></> : '—'}</td>
                <td>{o.account ? o.account.toUpperCase() : '—'}</td>
                <td className="ik-num" style={{ color: o.amount >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{o.amount >= 0 ? '+' : ''}{fr(o.amount, 2)} <Coin size={14} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Classement ──
function Board({ p }) {
  const [year, setYear] = useState(null);
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    setErr('');
    call(`/leaderboard?domain=${DOMAIN}${year ? `&year=${year}` : ''}`).then((b) => { if (!off) setBoard(b); }).catch((e) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [year, p.simulatedYear]);
  const years = Array.from({ length: p.maxYear - p.minYear + 1 }, (_, i) => p.minYear + i);
  return (
    <Card>
      <CardHead title="Classement Bourse" icon="trophy" help={<HelpTip term="performance" />} />
      <p className="ik-muted" style={{ margin: '0 0 10px' }}>Les joueurs sont comparés à la même année simulée. Pour être classé : au moins {board?.minCapital ?? 2500} <Coin size={14} /> actuellement investis et 5 jours de jeu différents.</p>
      <RankingProgress progress={board?.progress} />
      <label className="ik-field" style={{ display: 'inline-grid', gap: 4, margin: '4px 0 12px' }}><span className="ik-muted">Année de comparaison</span>
        <select className="ik-select" value={board?.year ?? ''} onChange={(e) => setYear(e.target.value)}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
      {err && <p style={{ color: 'var(--ik-negative)' }}>{err}</p>}
      {!board ? <Skeleton height={120} /> : board.entries.length === 0 ? <EmptyState icon="trophy" title="Personne n'est encore classé">Pour cette année, personne n&apos;a atteint les deux seuils.</EmptyState> : (
        <table className="rp-table" style={{ width: '100%' }}>
          <caption className="ik-sr-only">Classement de la Bourse</caption>
          <thead><tr><th scope="col">Rang</th><th scope="col" style={{ textAlign: 'left' }}>Joueur</th><th scope="col" className="ik-num">Performance</th></tr></thead>
          <tbody>{board.entries.map((e, i) => (
            <tr key={`${e.rank}-${e.username}-${i}`} style={e.isMe ? { background: 'var(--ik-primary-soft, color-mix(in srgb, var(--ik-primary) 14%, transparent))' } : undefined}>
              <td><span aria-label={`Rang ${e.rank}`}><Medal rank={e.rank} /></span></td>
              <td style={{ textAlign: 'left' }}>{e.username}{e.isMe ? ' (toi)' : ''}</td>
              <td className="ik-num"><Delta value={e.performancePct} /></td>
            </tr>))}</tbody>
        </table>
      )}
      {board && !board.entries.some((e) => e.isMe) && <p className="ik-muted" style={{ marginTop: 10 }}>{board.me ? `Ton rang : n°${board.me.rank} sur ${board.totalRanked}.` : 'Tu n\'es pas encore classé pour cette année : voir les deux barres de progression plus haut.'}</p>}
    </Card>
  );
}

function BourseInner() {
  const router = useRouter();
  const [p, setP] = useState(null);
  const [assets, setAssets] = useState([]);
  const [tab, setTab] = useState('market');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, pf] = await Promise.all([call(`/assets?domain=${DOMAIN}`), call(`/portfolio?domain=${DOMAIN}`)]);
      setAssets(a.assets); setP(pf);
    } catch (e) { if (e.status === 401) router.push('/login'); else setError(e.message); }
  }, [router]);
  useEffect(() => { if (!localStorage.getItem('token')) { router.push('/login'); return; } load(); }, [load, router]);

  const advance = async () => {
    setBusy(true); setError('');
    try { const r = await call('/advance-year', 'POST', { domain: DOMAIN }); await load(); if (r.bankEvents?.length) setError(r.bankEvents.map((e) => e.message).join(' ')); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const choose = async (domain) => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`${API}/auth/set-free-domain`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, credentials: 'include', body: JSON.stringify({ domain }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await load();
      if (domain === 'real_estate') router.push('/immobilier');
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  if (!p) return <AppShell><PageHeader title="Bourse et PEA" /><Skeleton height={240} />{error && <p role="alert" style={{ color: 'var(--ik-negative)' }}>{error}</p>}</AppShell>;
  return (
    <AppShell>
      <Header p={p} busy={busy} onAdvance={advance} />
      {error && <div role="alert" data-testid="bourse-error" style={{ padding: 12, borderRadius: 10, border: '1px solid var(--ik-negative)', color: 'var(--ik-negative)', margin: '0 0 12px' }}>{error}</div>}
      <div style={{ display: 'grid', gap: 16 }}>
        <Stats p={p} />
        <AccessBanner p={p} onChoose={choose} busy={busy} />
        <Tabs ariaLabel="Sections de la Bourse" value={tab} onChange={setTab} tabs={[{ value: 'market', label: 'Marché' }, { value: 'portfolio', label: 'Mon portefeuille' }, { value: 'orders', label: 'Mes ordres' }, { value: 'board', label: 'Classement' }]} />
        {tab === 'market' && <Market assets={assets} p={p} onTraded={load} setError={setError} />}
        {tab === 'portfolio' && <Portfolio p={p} onTraded={load} setError={setError} />}
        {tab === 'orders' && <Orders refreshKey={p.cashBalance} />}
        {tab === 'board' && <Board p={p} />}
        <p className="ik-muted" style={{ fontSize: 11 }}>Cours de clôture annuels d&apos;un jeu de données simplifié, rejoués à ta date de jeu : ils ne sont pas en direct. Frais et impôts : barème du jeu (valeurs de jeu à reconfirmer).</p>
      </div>
    </AppShell>
  );
}

export default function BoursePage() {
  return <Suspense fallback={null}><BourseInner /></Suspense>;
}
