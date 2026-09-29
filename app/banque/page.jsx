'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpTip from '../components/HelpTip';

const API = `${process.env.NEXT_PUBLIC_API_URL}/bank`;
const num = (n, d = 2) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const DOMAIN_LABEL = { real_estate: 'Immobilier', stocks: 'Bourse', crypto: 'Crypto', bonds: 'Obligations' };
const PRODUCT_LABEL = { personal: 'Prêt personnel', portfolio: 'Prêt sur portefeuille', mortgage: 'Prêt immobilier' };
const STATUS_LABEL = { active: 'En cours', repaid: 'Soldé', defaulted: 'En défaut', liquidated: 'Liquidé' };
const card = { background: 'rgba(15,23,42,0.65)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 14, padding: 16 };
const btn = (primary) => ({ padding: '10px 16px', borderRadius: 10, border: primary ? 'none' : '1px solid rgba(96,165,250,0.6)', background: primary ? '#2563eb' : 'rgba(59,130,246,0.15)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' });
const input = { padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.8)', color: '#fff', fontSize: 14 };

async function call(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur'); e.code = data.code; e.details = data.details; throw e; }
  return data;
}

function PersonalLoan({ onDone, notify }) {
  const [amount, setAmount] = useState(100);
  const [months, setMonths] = useState(24);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);

  const simulate = useCallback(async () => {
    setBusy(true);
    try { setQuote(await call('/personal/quote', 'POST', { amountCoins: Number(amount), months: Number(months) })); }
    catch (e) { setQuote({ error: e.message }); }
    setBusy(false);
  }, [amount, months]);

  const borrow = async () => {
    setBusy(true);
    try { const r = await call('/personal/borrow', 'POST', { amountCoins: Number(amount), months: Number(months) }); notify(r.message); setQuote(null); await onDone(); }
    catch (e) { notify(e.message, true); }
    setBusy(false);
  };

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 6px', color: '#fff' }}>Prêt personnel<HelpTip term="pret-personnel" /></h3>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#94a3b8' }}>Pour l&apos;Immobilier uniquement : apport, travaux, rénovation, découvert. Les pièces empruntées sont <strong>fléchées</strong><HelpTip term="credit-fleche" /> : elles ne se dépensent pas en Bourse ni en crypto.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 13 }}>Montant (🪙)
          <input style={{ ...input, display: 'block', width: 120 }} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label style={{ fontSize: 13 }}>Durée
          <select style={{ ...input, display: 'block' }} value={months} onChange={(e) => setMonths(e.target.value)}>
            {[6, 12, 24, 36, 48, 60].map((m) => <option key={m} value={m}>{m} mois</option>)}
          </select>
        </label>
        <button style={btn(false)} disabled={busy} onClick={simulate}>Simuler</button>
      </div>
      {quote?.error && <p style={{ color: '#fca5a5' }}>{quote.error}</p>}
      {quote?.loan && (
        <div style={{ marginTop: 12, fontSize: 14, display: 'grid', gap: 5 }}>
          <div>Taux : <strong>{num(quote.loan.annualRatePct)} %</strong><HelpTip term="taux-base" /> (un prêt immobilier de la même année : {num(quote.mortgageRatePct)} %, car le prêt personnel n&apos;a aucune garantie)</div>
          <div>Mensualité : <strong>{num(quote.loan.instalmentCoins)} 🪙</strong> (≈ {num(quote.loan.instalmentCoins * 20, 0)} €) pendant {quote.loan.months} mois</div>
          <div>Coût total : {num(quote.loan.totalRepaidCoins)} 🪙 rendus pour {num(quote.loan.amountCoins)} 🪙 empruntés, soit {num(quote.loan.totalInterestCoins)} 🪙 d&apos;intérêts <span style={{ color: '#94a3b8' }}>(ces pièces sont détruites, pas reversées à quelqu&apos;un)</span></div>
          <div>Plafond pour ton profil : {num(quote.limits.capCoins, 0)} 🪙 ({quote.limits.incomeMonthsCap} mois de revenus)</div>
          <div style={{ color: quote.approved ? '#86efac' : '#fca5a5' }}>
            Banque : {quote.approved ? 'accord' : 'refus'} — endettement {num(quote.bank.debtRatioPct)} % (max {quote.bank.maxDebtRatioPct} %), reste à vivre {num(quote.bank.livingRemaining, 0)} € (min {num(quote.bank.minLivingRemaining, 0)} €)
            {quote.reasons.map((r) => <div key={r.code} style={{ fontSize: 13 }}>• {r.message}</div>)}
          </div>
          <div><button style={btn(true)} disabled={busy || !quote.approved} onClick={borrow}>Emprunter</button></div>
        </div>
      )}
    </div>
  );
}

export default function BanquePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, isError) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 8000); }, []);

  const refresh = useCallback(async () => {
    try { const [o, e] = await Promise.all([call('/overview'), call('/events?limit=30')]); setData(o); setEvents(e.events || []); }
    catch (e) { notify(e.message, true); }
  }, [notify]);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    setReady(true); refresh();
  }, [router, refresh]);

  const repay = async (loan) => {
    if (!window.confirm('Solder ce prêt maintenant ? Il faut rendre le capital restant et payer une indemnité de remboursement anticipé (1 % du capital si plus d\'un an reste, 0,5 % sinon).')) return;
    try { const r = await call(`/loans/${loan.id}/repay`, 'POST'); notify(r.message); await refresh(); } catch (e) { notify(e.message, true); }
  };

  if (!ready) return null;
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c75 100%)', padding: 'clamp(16px, 4vw, 28px)', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Link href="/immobilier" style={{ color: '#60a5fa', fontSize: 14 }}>← Immobilier</Link>
        <h1 style={{ margin: '6px 0 4px', color: '#fff', fontSize: 'clamp(24px, 5vw, 32px)' }}>🏦 Ma banque</h1>
        <p style={{ color: '#94a3b8', marginTop: 0, fontSize: 14 }}>Les pièces ne servent que dans le jeu : elles ne s&apos;échangent pas entre joueurs et ne s&apos;achètent pas avec de l&apos;argent réel. Les taux sont fictifs, calés sur l&apos;histoire (à titre pédagogique).</p>
        {toast && <div role="status" style={{ ...card, marginBottom: 14, borderColor: toast.isError ? '#f87171' : '#4ade80' }}>{toast.msg}</div>}

        {data && (
          <>
            {data.account.creditBlocked && <div style={{ ...card, borderColor: '#f87171', marginBottom: 14 }}>⛔ <strong>Crédit bloqué :</strong> un de tes prêts est en défaut. Tu ne peux plus emprunter tant qu&apos;il n&apos;est pas soldé.<HelpTip term="defaut-paiement" /></div>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ ...card, flex: '1 1 200px' }}><div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Dette en cours</div><div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{num(data.totals.outstandingCoins)} 🪙</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{data.totals.activeLoans} prêt(s) sur {data.totals.maxActiveLoans} possibles</div></div>
              <div style={{ ...card, flex: '1 1 200px' }}><div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Crédit fléché non dépensé<HelpTip term="credit-fleche" /></div>
                {data.reservedCredit.length === 0 ? <div style={{ fontSize: 18, color: '#cbd5e1', marginTop: 4 }}>—</div> : data.reservedCredit.map((r) => <div key={r.domain} style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>{num(r.coins, 0)} 🪙 <span style={{ fontSize: 13, color: '#94a3b8' }}>utilisables en {DOMAIN_LABEL[r.domain] || r.domain} seulement</span></div>)}</div>
            </div>
            <PersonalLoan onDone={refresh} notify={notify} />
            <h3 style={{ color: '#fff', margin: '20px 0 8px' }}>Mes prêts</h3>
            {data.loans.length === 0 && <p style={{ color: '#94a3b8' }}>Aucun prêt pour l&apos;instant.</p>}
            <div style={{ display: 'grid', gap: 10 }}>
              {data.loans.map((l) => (
                <div key={l.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <strong style={{ color: '#fff' }}>{PRODUCT_LABEL[l.product] || l.product} · {DOMAIN_LABEL[l.domain] || l.domain}</strong>
                    <span style={{ color: l.status === 'active' ? '#86efac' : l.status === 'defaulted' ? '#fca5a5' : '#94a3b8' }}>{STATUS_LABEL[l.status] || l.status}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#cbd5e1', margin: '6px 0' }}>
                    Emprunté {num(l.principalCoins, 0)} 🪙 à {num(l.annualRatePct)} % sur {l.months} mois · reste à rembourser <strong>{num(l.balanceCoins)} 🪙</strong> · mois écoulés {l.monthsElapsed}/{l.months}
                    {l.nextInstalmentCoins !== null && <> · prochaine mensualité ≈ {num(l.nextInstalmentCoins)} 🪙</>}
                    {l.overdueCoins > 0 && <span style={{ color: '#fca5a5' }}> · impayé : {num(l.overdueCoins)} 🪙 ({l.missedInstalments} échéance(s))</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Déjà rendu : capital {num(l.principalPaidCoins)} 🪙 + intérêts {num(l.interestPaidCoins)} 🪙</div>
                  {(l.status === 'active' || l.status === 'defaulted') && <div style={{ marginTop: 8 }}><button style={btn(false)} onClick={() => repay(l)}>Solder ce prêt<HelpTip term="remboursement-anticipe" /></button></div>}
                </div>
              ))}
            </div>
            {events.length > 0 && <details style={{ marginTop: 16 }}><summary style={{ cursor: 'pointer', color: '#60a5fa' }}>Journal de la banque</summary>
              {events.map((e) => <div key={e.id} style={{ fontSize: 13, color: '#cbd5e1', margin: '4px 0' }}>{e.message}</div>)}
            </details>}
          </>
        )}
      </div>
    </main>
  );
}
