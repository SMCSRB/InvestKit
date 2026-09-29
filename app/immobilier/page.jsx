'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpTip from '../components/HelpTip';

const API = `${process.env.NEXT_PUBLIC_API_URL}/realestate`;
const clean = (n) => (Math.abs(Number(n ?? 0)) < 0.005 ? 0 : Number(n ?? 0));
const eur = (n) => `${clean(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
const eur2 = (n) => `${clean(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const TYPE_LABEL = { studio: 'Studio', apartment: 'Appartement', house: 'Maison' };
const CONDITION_LABEL = { good: 'Bon état', to_refresh: 'À rafraîchir', to_renovate: 'À rénover' };
const STATUS_LABEL = { let: 'Loué', vacant: 'Vide', notice: 'Préavis donné' };
const card = { background: 'rgba(15,23,42,0.65)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 14, padding: 16 };
const btn = (primary) => ({ padding: '10px 16px', borderRadius: 10, border: primary ? 'none' : '1px solid rgba(96,165,250,0.6)', background: primary ? '#2563eb' : 'rgba(59,130,246,0.15)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' });
const input = { padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.8)', color: '#fff', fontSize: 14 };

async function call(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.details = data.details; throw e; }
  return data;
}

function Stat({ label, value, tip, tone, sub }) {
  return (
    <div style={{ ...card, flex: '1 1 200px' }}>
      <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}{tip && <HelpTip term={tip} />}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: tone || '#fff', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Choix du profil de départ
function StartScreen({ profiles, onStart, busy }) {
  return (
    <div>
      <h2 style={{ color: '#fff' }}>Commence ta partie Immobilier</h2>
      <p style={{ color: '#94a3b8' }}>Choisis ta situation de départ : elle décide de tes revenus, et donc de ce que la banque acceptera de te prêter. Tu joues en mode accéléré, sur des villes fictives.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {profiles.map((p) => (
          <div key={p.id} style={{ ...card, flex: '1 1 220px' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>{p.label}</h3>
            <p style={{ color: '#cbd5e1', fontSize: 14 }}>Revenus : {eur(p.netMonthlyIncome)}/mois<br />Dépenses courantes : {eur(p.livingCharges)}/mois</p>
            <button style={btn(true)} disabled={busy} onClick={() => onStart(p.id)}>Choisir ce profil</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Annonces, simulation et achat
function Listings({ game, refresh, notify }) {
  const [listings, setListings] = useState([]);
  const [cities, setCities] = useState([]);
  const [filters, setFilters] = useState({ cityId: '', type: '', maxPrice: '' });
  const [selected, setSelected] = useState(null);
  const [plan, setPlan] = useState({ downPaymentCoins: '', months: 300 });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    try { const r = await call(`/listings?${qs}`); setListings(r.listings); setCities(r.cities || []); } catch (e) { notify(e.message, true); }
  }, [filters, notify, game.year]);
  useEffect(() => { load(); }, [load]);

  const cityById = useMemo(() => Object.fromEntries(cities.map((c) => [c.id, c])), [cities]);
  const cityFiche = cityById[filters.cityId];
  const lowYield = (id) => ['metropolis', 'large'].includes(cityById[id]?.tier);

  const simulate = async (listing, p = plan) => {
    setBusy(true);
    try {
      setPreview(await call('/purchase/preview', 'POST', { listingId: listing.id, downPaymentCoins: Number(p.downPaymentCoins), months: Number(p.months) }));
    } catch (e) { setPreview({ error: e.message, details: e.details }); }
    setBusy(false);
  };
  const open = (l) => {
    const suggested = Math.ceil((l.price * 0.3) / 20);
    const p = { downPaymentCoins: String(suggested), months: 300 };
    setSelected(l); setPlan(p); setPreview(null); simulate(l, p);
  };
  const expertise = async () => {
    setBusy(true);
    try { const r = await call(`/listings/${selected.id}/expertise`, 'POST'); notify(r.message || 'Expertise réalisée'); await simulate(selected); await refresh(); await load(); }
    catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const buy = async () => {
    setBusy(true);
    try {
      await call('/purchase', 'POST', { listingId: selected.id, downPaymentCoins: Number(plan.downPaymentCoins), months: Number(plan.months) });
      notify('Achat réalisé ! Le bien est dans ton portefeuille : pense à le mettre en location.');
      setSelected(null); setPreview(null); await refresh(); await load();
    } catch (e) { notify(e.message, true); }
    setBusy(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select style={input} value={filters.cityId} onChange={(e) => setFilters({ ...filters, cityId: e.target.value })} aria-label="Ville">
          <option value="">Toutes les villes</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={input} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} aria-label="Type de bien">
          <option value="">Tous les types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input style={input} type="number" min="0" placeholder="Prix max (€)" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} aria-label="Prix maximum" />
      </div>
      {cityFiche && (
        <div style={{ ...card, marginBottom: 14 }}>
          <strong style={{ color: '#fff' }}>{cityFiche.name}</strong> <span style={{ color: '#94a3b8' }}>· {cityFiche.region}{cityFiche.tenseZone ? ' · zone tendue' : ''}</span><HelpTip term="zone-tendue" />
          <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 4 }}>{cityFiche.description}</div>
          {lowYield(cityFiche.id) && <div style={{ fontSize: 14, color: '#93c5fd', marginTop: 6 }}>Les métropoles et grandes villes chères ont des rendements plus faibles.<HelpTip term="rendement-metropole" /></div>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {listings.map((l) => (
          <button key={l.id} onClick={() => open(l)} style={{ ...card, textAlign: 'left', cursor: 'pointer', color: '#e2e8f0', outline: selected?.id === l.id ? '2px solid #3b82f6' : 'none' }}>
            <strong style={{ color: '#fff' }}>{l.title}</strong>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{l.neighborhoodName} · {l.surfaceSqm} m² · DPE {l.energyClass} · {CONDITION_LABEL[l.condition]}</div>
            <div style={{ fontSize: 20, fontWeight: 800, margin: '6px 0' }}>{eur(l.price)}</div>
            <div style={{ fontSize: 13 }}>Loyer estimé : {eur(l.marketRentMonthly)}/mois</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Rendement brut : {(((l.marketRentMonthly * 12) / l.price) * 100).toFixed(1)} %</div>
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ ...card, marginTop: 18 }}>
          <h3 style={{ marginTop: 0, color: '#fff' }}>{selected.title} — simulation d&apos;achat</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13 }}>Apport (🪙, 1 🪙 = 20 €)<HelpTip term="apport" />
              <input style={{ ...input, display: 'block', width: 130 }} type="number" min="0" value={plan.downPaymentCoins} onChange={(e) => setPlan({ ...plan, downPaymentCoins: e.target.value })} />
            </label>
            <label style={{ fontSize: 13 }}>Durée du prêt
              <select style={{ ...input, display: 'block' }} value={plan.months} onChange={(e) => setPlan({ ...plan, months: e.target.value })}>
                {[120, 180, 240, 300, 360].map((m) => <option key={m} value={m}>{m / 12} ans</option>)}
              </select>
            </label>
            <button style={btn(false)} disabled={busy} onClick={() => simulate(selected)}>Simuler</button>
            <span><button style={btn(false)} disabled={busy} onClick={expertise}>Faire expertiser</button><HelpTip term="expertise" /></span>
          </div>
          {preview?.error && <p style={{ color: '#fca5a5' }}>{preview.error}</p>}
          {preview?.costs && (
            <div style={{ marginTop: 14, display: 'grid', gap: 6, fontSize: 14 }}>
              <div>Prix : {eur(preview.costs.price)} · Frais de notaire<HelpTip term="frais-notaire" /> : {eur(preview.costs.notaryFees)} · Travaux : {eur(preview.costs.works)}</div>
              <div>Emprunt : <strong>{eur(preview.costs.loanPrincipal)}</strong> à {preview.loan.annualRatePct} % (TAEG<HelpTip term="taeg" /> {preview.loan.taegPct.toFixed(2)} %)</div>
              <div>Mensualité<HelpTip term="mensualite" /> : <strong>{eur2(preview.loan.monthlyPaymentWithInsurance)}</strong> (assurance comprise)</div>
              <div style={{ color: preview.bank.approved ? '#86efac' : '#fca5a5' }}>
                Banque : {preview.bank.approved ? 'accord' : 'refus'} — taux d&apos;endettement<HelpTip term="endettement" /> {preview.bank.debtRatioPct} %, reste à vivre<HelpTip term="reste-a-vivre" /> {eur(preview.bank.livingRemaining)}
                {preview.bank.reasons?.map((r) => <div key={r.code} style={{ fontSize: 13 }}>• {r.message}</div>)}
              </div>
              <div>Coût en InvestCoins : <strong>{preview.coins.total} 🪙</strong>{!preview.coins.affordable && <span style={{ color: '#fca5a5' }}> — solde insuffisant</span>}</div>
              <div><button style={btn(true)} disabled={busy || !preview.bank.approved || !preview.coins.affordable} onClick={buy}>Acheter</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Portefeuille
function Portfolio({ data, summary, refresh, notify }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn, okMsg) => {
    setBusy(true);
    try { const r = await fn(); notify(r?.message || okMsg); await refresh(); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const t = summary?.totals;
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label="Patrimoine net" tip="patrimoine-net" value={eur(data.totals.equity)} sub={`Valeur ${eur(data.totals.value)} − dette ${eur(data.totals.debt)}`} />
        <Stat label="Effort d'épargne mensuel" tip="effort-epargne" value={t ? eur(t.savingsEffort) : '—'} tone={t && t.savingsEffort > 0 ? '#fbbf24' : '#86efac'} sub={t ? (t.savingsEffort > 0 ? 'À ajouter de ta poche, un mois normal' : 'Le bien s\'autofinance ce mois-ci') : 'Disponible après le premier mois'} />
        <Stat label="Capital remboursé ce mois" tip="capital-rembourse" value={t ? eur(t.principalRepaid) : '—'} tone="#86efac" sub="Ta dette baisse : cet argent t'enrichit" />
      </div>
      {data.missedMonths > 0 && (
        <div style={{ ...card, borderColor: '#f87171', marginBottom: 14 }}>
          ⚠️ <strong>Impayés de crédit : {data.missedMonths} mois ({eur(data.arrearsEur)}).</strong> Après 3 mois, tu peux vendre à l&apos;amiable avec une décote de 12 %. Si tu ne fais rien, la banque lance une vente forcée (−25 % + frais)<HelpTip term="vente-forcee" />. Dans la réalité, cette procédure est bien plus longue ; elle est raccourcie ici.
        </div>
      )}
      {data.properties.length === 0 && <p style={{ color: '#94a3b8' }}>Tu n&apos;as pas encore de bien. Va dans « Annonces ».</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {data.properties.map((p) => (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong style={{ color: '#fff' }}>{p.title}</strong>
              <span style={{ color: p.status === 'let' ? '#86efac' : '#fbbf24' }}>{STATUS_LABEL[p.status] || p.status}</span>
            </div>
            <div style={{ fontSize: 14, color: '#cbd5e1', margin: '6px 0' }}>
              Valeur {eur(p.value)} · Dette {eur(p.remainingLoan)} · Fonds propres {eur(p.equity)}<br />
              {p.status === 'let' && <>Loyer : {eur2(p.current_rent)}/mois<HelpTip term="loyer" /> · </>}DPE {p.energy_class}
              {p.search && <> · Recherche de locataire : mois {p.search.vacantMonthsSoFar}, chance de louer {p.search.monthlyLetProbabilityPct} %/mois</>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Number(p.pending_works_eur) > 0 && <button style={btn(true)} disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/pay-works`, 'POST'), 'Travaux payés')}>Payer les travaux ({eur(p.pending_works_eur)})</button>}
              {p.status === 'vacant' && !p.searching && Number(p.pending_works_eur) === 0 && <button style={btn(true)} disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/list`, 'POST', { askingRentRatio: 1 }), 'Bien mis en location au loyer du marché')}>Mettre en location</button>}
              {p.searching && <>
                <button style={btn(false)} disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/reprice`, 'POST', { askingRentRatio: Math.max(0.7, p.search.askingRatio - 0.05) }), 'Loyer baissé de 5 %')}>Baisser le loyer de 5 %</button>
              </>}
              {!p.sale_planned && p.status !== 'sold' && <button style={btn(false)} disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/sell`, 'POST', { askingRatio: 1 }), 'Bien mis en vente au prix du marché')}>Mettre en vente</button>}
              {data.missedMonths >= 3 && <button style={btn(false)} disabled={busy} onClick={() => act(() => call('/distress/sell', 'POST', { propertyId: p.id }), 'Vente à l\'amiable réalisée')}>Vendre à l&apos;amiable (−12 %)</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bilan du mois
function Summary({ summary, events }) {
  if (!summary || !summary.totals) return <p style={{ color: '#94a3b8' }}>Aucun mois réglé pour l&apos;instant. Fais avancer le temps.</p>;
  const t = summary.totals;
  const row = (label, v, tip) => <tr key={label}><td style={{ padding: '4px 8px' }}>{label}{tip && <HelpTip term={tip} />}</td><td style={{ padding: '4px 8px', textAlign: 'right' }}>{eur2(v)}</td></tr>;
  return (
    <div>
      <h3 style={{ color: '#fff' }}>Bilan de {MONTHS[summary.month - 1]} {summary.year}</h3>
      <table style={{ width: '100%', maxWidth: 480, fontSize: 14, borderCollapse: 'collapse', ...card }}>
        <tbody>
          {row('Loyers encaissés', t.rentCollected, 'loyer')}
          {row('Charges non récupérables', -t.nonRecoverableCharges, 'charges-non-recuperables')}
          {row('Intérêts du crédit', -t.loanInterest, 'interets')}
          {row('Assurance emprunteur', -t.loanInsurance, 'assurance-emprunteur')}
          {row('Capital remboursé (t\'enrichit)', -t.loanPrincipal, 'capital-rembourse')}
          {row('Impôt sur les loyers', -t.rentTax, 'impot-loyers')}
          <tr style={{ borderTop: '1px solid rgba(148,163,184,0.3)', fontWeight: 800 }}><td style={{ padding: '6px 8px' }}>Résultat du mois<HelpTip term="cash-flow" /></td><td style={{ padding: '6px 8px', textAlign: 'right' }}>{eur2(t.netCashFlow)}</td></tr>
        </tbody>
      </table>
      {summary.properties.map((p) => p.explanations.length > 0 && (
        <div key={p.propertyId} style={{ marginTop: 12 }}>
          <strong style={{ color: '#fff' }}>{p.title}</strong>
          {p.explanations.map((e, i) => <div key={i} style={{ fontSize: 14, color: '#cbd5e1', margin: '4px 0' }}>• {e.message}{e.cashFlowImpact ? ` (${e.cashFlowImpact > 0 ? '+' : ''}${eur2(e.cashFlowImpact)})` : ''}</div>)}
        </div>
      ))}
      {events?.length > 0 && <details style={{ marginTop: 16 }}><summary style={{ cursor: 'pointer', color: '#60a5fa' }}>Journal des événements</summary>
        {events.slice(0, 30).map((e) => <div key={`${e.year}-${e.month}-${e.kind}-${e.propertyId}-${e.message.length}`} style={{ fontSize: 13, color: '#cbd5e1', margin: '4px 0' }}>{e.month}/{e.year} — {e.message}</div>)}
      </details>}
    </div>
  );
}

export default function ImmobilierPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(null);
  const [needStart, setNeedStart] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('listings');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, isError) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 7000); }, []);

  const refresh = useCallback(async () => {
    try {
      const s = await call('/state');
      setState(s);
      if (!s.game) { setNeedStart(true); return; }
      setNeedStart(false);
      const [pf, sm, ev] = await Promise.all([call('/properties'), call('/summary'), call('/events?limit=30')]);
      setPortfolio(pf); setSummary(sm); setEvents(ev.events || []);
    } catch (e) { notify(e.message, true); }
  }, [notify]);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    setReady(true); refresh();
  }, [router, refresh]);

  const start = async (profile) => {
    setBusy(true);
    try { await call('/start', 'POST', { profile }); await refresh(); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const advance = async (months) => {
    setBusy(true);
    try {
      const r = await call('/time/advance', 'POST', { months });
      const warnings = (r.settled || []).flatMap((s) => s.warnings || []);
      if (warnings.length) notify(warnings[warnings.length - 1].message, true);
      await refresh();
    } catch (e) { notify(e.message, true); }
    setBusy(false);
  };

  if (!ready) return null;
  const game = state?.game;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', padding: 'clamp(16px, 4vw, 28px)', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link href="/dashboard" style={{ color: '#60a5fa', fontSize: 14 }}>← Tableau de bord</Link>
            <h1 style={{ margin: '6px 0 0', color: '#fff', fontSize: 'clamp(24px, 5vw, 32px)' }}>🏠 Immobilier</h1>
          </div>
          {game && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>{MONTHS[game.month - 1]} {game.year}<HelpTip term="mode-accelere" /></div>
              <div style={{ fontSize: 14, color: '#fbbf24' }}>{Number(state.balance).toLocaleString('fr-FR')} 🪙<HelpTip term="investcoin" /></div>
            </div>
          )}
        </div>

        {toast && <div role="status" style={{ ...card, marginTop: 14, borderColor: toast.isError ? '#f87171' : '#4ade80' }}>{toast.msg}</div>}

        {state && !state.access?.canBuy && <div style={{ ...card, marginTop: 14, borderColor: '#fbbf24' }}>🔒 Tu peux consulter le domaine Immobilier, mais l&apos;achat demande de l&apos;avoir choisi comme domaine gratuit ou d&apos;avoir l&apos;abonnement Pro.</div>}

        {needStart && state?.profiles && <StartScreen profiles={state.profiles} onStart={start} busy={busy} />}

        {game && portfolio && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' }}>
              <button style={btn(true)} disabled={busy} onClick={() => advance(1)}>Avancer d&apos;un mois</button>
              <button style={btn(false)} disabled={busy} onClick={() => advance(12)}>Avancer d&apos;un an</button>
              <span style={{ flex: 1 }} />
              {[['listings', 'Annonces'], ['portfolio', `Mon portefeuille (${portfolio.properties.length})`], ['summary', 'Bilan du mois']].map(([k, label]) => (
                <button key={k} style={{ ...btn(tab === k), opacity: tab === k ? 1 : 0.8 }} onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>
            {tab === 'listings' && <Listings game={game} refresh={refresh} notify={notify} />}
            {tab === 'portfolio' && <Portfolio data={portfolio} summary={summary} refresh={refresh} notify={notify} />}
            {tab === 'summary' && <Summary summary={summary} events={events} />}
          </>
        )}
      </div>
    </main>
  );
}
