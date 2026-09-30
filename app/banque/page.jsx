'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HelpTip from '../components/HelpTip';

const API = `${process.env.NEXT_PUBLIC_API_URL}/bank`;
const TRADING_API = `${process.env.NEXT_PUBLIC_API_URL}/trading`;
const num = (n, d = 2) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const DOMAIN_LABEL = { real_estate: 'Immobilier', stocks: 'Bourse', crypto: 'Crypto', crypto_market: 'Marché Crypto', bonds: 'Obligations' };
const LOMBARD_DOMAINS = [['stocks', 'Bourse'], ['crypto', 'Crypto']];
const PRODUCT_LABEL = { personal: 'Prêt personnel', portfolio: 'Prêt sur portefeuille', mortgage: 'Prêt immobilier' };
const STATUS_LABEL = { active: 'En cours', repaid: 'Soldé', defaulted: 'En défaut', liquidated: 'Liquidé', written_off: 'Dette effacée' };
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

// ── Procédure de rétablissement après un défaut (dette effacée, mais le domaine repart de zéro)
function Recovery({ domains, onDone, notify }) {
  const [domain, setDomain] = useState(domains[0]);
  const [pv, setPv] = useState(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = async () => {
    setBusy(true);
    try { setPv(await call('/recovery/preview', 'POST', { domain })); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const start = async () => {
    setBusy(true);
    try { const r = await call('/recovery/start', 'POST', { domain, confirm }); notify(r.message); setPv(null); setConfirm(''); await onDone(); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  return (
    <div style={{ ...card, borderColor: '#f87171', marginBottom: 14 }}>
      <h3 style={{ margin: '0 0 6px', color: '#fff' }}>Procédure de rétablissement<HelpTip term="retablissement" /></h3>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#cbd5e1' }}>Si tu ne peux pas rembourser un prêt en défaut, cette procédure efface la dette de ce domaine, <strong>mais le domaine repart de zéro</strong> (titres ou biens perdus, rang perdu). Ce n&apos;est pas gratuit, et elle est limitée : à utiliser en dernier recours.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={input} value={domain} onChange={(e) => { setDomain(e.target.value); setPv(null); }} aria-label="Domaine">
          {domains.map((d) => <option key={d} value={d}>{DOMAIN_LABEL[d] || d}</option>)}
        </select>
        <button style={btn(false)} disabled={busy} onClick={preview}>Voir ce qui se passerait</button>
      </div>
      {pv && (
        <div style={{ marginTop: 12, fontSize: 14, display: 'grid', gap: 5 }}>
          {!pv.eligible && pv.reasons.map((r) => <div key={r} style={{ color: '#fca5a5' }}>• {r}</div>)}
          {pv.eligible && (
            <>
              <div><strong>Tu perds :</strong> {pv.willLose.assets}{pv.willLose.rank ? ', ainsi que ton rang' : ''}.</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{pv.willLose.badges}</div>
              <div><strong>Effacé :</strong> {num(pv.willHappen.debtWrittenOffCoins)} 🪙 de dette.{pv.willHappen.borrowedCoinsSeized > 0 && <> Les {num(pv.willHappen.borrowedCoinsSeized, 0)} 🪙 empruntés non dépensés te sont repris.</>}</div>
              <div>Capital de base : {pv.willHappen.baseCapitalTopUpCoins > 0 ? `complété de ${num(pv.willHappen.baseCapitalTopUpCoins, 0)} 🪙 (pour atteindre ${pv.willHappen.baseCapitalCoins} 🪙)` : `tu as déjà plus de ${pv.willHappen.baseCapitalCoins} 🪙 : rien ne t'est ajouté`}.</div>
              <div style={{ color: '#fbbf24' }}>Aucun nouveau crédit pendant {pv.willHappen.creditBanDays} jours. Procédure {pv.limits.usedProcedures + 1} sur {pv.limits.maxProcedures} possibles, espacées de {pv.limits.cooldownDays} jours.</div>
              <label style={{ fontSize: 13 }}>Pour confirmer, écris <strong>{pv.confirmPhrase}</strong> :
                <input style={{ ...input, display: 'block', marginTop: 4 }} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </label>
              <div><button style={{ ...btn(true), background: '#dc2626' }} disabled={busy || confirm !== pv.confirmPhrase} onClick={start}>Lancer la procédure</button></div>
            </>
          )}
        </div>
      )}
    </div>
  );
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

function PortfolioLoan({ onDone, notify }) {
  const [domain, setDomain] = useState('stocks');
  const [amount, setAmount] = useState(100);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const simulate = async () => {
    setBusy(true);
    try { setQuote(await call('/portfolio/quote', 'POST', { domain, amountCoins: Number(amount) })); } catch (e) { setQuote({ error: e.message }); }
    setBusy(false);
  };
  const borrow = async () => {
    setBusy(true);
    try { const r = await call('/portfolio/borrow', 'POST', { domain, amountCoins: Number(amount) }); notify(r.message); setQuote(null); await onDone(); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  return (
    <div style={{ ...card, marginTop: 14 }}>
      <h3 style={{ margin: '0 0 6px', color: '#fff' }}>Prêt sur portefeuille<HelpTip term="pret-portefeuille" /></h3>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#94a3b8' }}>Tes titres (Bourse ou Crypto) servent de garantie. Taux variable, intérêts payés à chaque passage d&apos;année, remboursable à tout moment sans indemnité. Les pièces empruntées ne servent que dans le domaine choisi.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 13 }}>Domaine
          <select style={{ ...input, display: 'block' }} value={domain} onChange={(e) => { setDomain(e.target.value); setQuote(null); }}>{LOMBARD_DOMAINS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        </label>
        <label style={{ fontSize: 13 }}>Montant (🪙)
          <input style={{ ...input, display: 'block', width: 120 }} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button style={btn(false)} disabled={busy} onClick={simulate}>Simuler</button>
      </div>
      {quote?.error && <p style={{ color: '#fca5a5' }}>{quote.error}</p>}
      {quote?.loan && (
        <div style={{ marginTop: 12, fontSize: 14, display: 'grid', gap: 5 }}>
          <div>Garantie : {num(quote.collateral.valueCoins, 0)} 🪙 de titres · tu peux emprunter au plus <strong>{num(quote.collateral.capacityCoins, 0)} 🪙</strong> (actions 50 %, crypto 30 %)</div>
          <div>Taux : <strong>{num(quote.loan.annualRatePct)} %</strong> variable → environ {num(quote.loan.yearlyInterestCoins)} 🪙 d&apos;intérêts par an</div>
          {quote.afterPurchase.leverage && <div>Si tu achètes des titres avec ces pièces : levier <strong>×{num(quote.afterPurchase.leverage)}</strong><HelpTip term="levier" /></div>}
          <div style={{ color: '#fbbf24' }}>⚠️ {quote.margin}<HelpTip term="appel-de-marge" /></div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{quote.simplification}</div>
          <div style={{ color: quote.approved ? '#86efac' : '#fca5a5' }}>{quote.approved ? 'Banque : accord' : 'Banque : refus'}{quote.reasons.map((r) => <div key={r.code} style={{ fontSize: 13 }}>• {r.message}</div>)}</div>
          <div><button style={btn(true)} disabled={busy || !quote.approved} onClick={borrow}>Emprunter</button></div>
        </div>
      )}
    </div>
  );
}

// Carte d'un prêt sur portefeuille : rapport prêt/valeur, seuils, appel de marge, remboursement partiel ou total.
function PortfolioLoanCard({ loan, view, onDone, notify }) {
  const [coins, setCoins] = useState(10);
  const [busy, setBusy] = useState(false);
  const v = view?.bank?.loan;
  const lim = view?.bank?.limits;
  const pay = async (amount) => {
    setBusy(true);
    try { const r = await call(`/portfolio/loans/${loan.id}/repay`, 'POST', { coins: amount }); notify(r.message); await onDone(); } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const stateColor = v?.state === 'call' ? '#fbbf24' : v?.state === 'liquidation' ? '#f87171' : '#86efac';
  return (
    <div style={{ marginTop: 8 }}>
      {v && lim && (
        <div style={{ fontSize: 14, color: '#cbd5e1' }}>
          Valeur des titres en garantie : <strong>{num(lim.value, 0)} 🪙</strong> · dette {num(v.debtCoins)} 🪙 · rapport prêt/valeur <strong style={{ color: stateColor }}>{num(v.ltvPct)} %</strong><HelpTip term="appel-de-marge" />
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Appel de marge au-delà de {num(lim.callLimit, 0)} 🪙 de dette, vente forcée au-delà de {num(lim.liquidationLimit, 0)} 🪙 (aux cours de clôture de l&apos;année).</div>
          {v.state === 'call' || v.marginCall ? <div style={{ ...card, borderColor: '#fbbf24', marginTop: 6 }}>⚠️ <strong>Appel de marge.</strong> Rembourse une partie du prêt ou achète des titres avant le prochain passage d&apos;année, sinon tes titres seront vendus de force.</div> : null}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        <input style={{ ...input, width: 100 }} type="number" min="1" value={coins} onChange={(e) => setCoins(e.target.value)} aria-label="Pièces à rembourser" />
        <button style={btn(false)} disabled={busy} onClick={() => pay(Number(coins))}>Rembourser une partie</button>
        <button style={btn(false)} disabled={busy} onClick={() => pay(Math.ceil(loan.balanceCoins + loan.overdueCoins))}>Solder (sans indemnité)</button>
      </div>
    </div>
  );
}

export default function BanquePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [views, setViews] = useState({});
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, isError) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 8000); }, []);

  const refresh = useCallback(async () => {
    try {
      const [o, e] = await Promise.all([call('/overview'), call('/events?limit=30')]); setData(o); setEvents(e.events || []);
      // Rapport prêt/valeur des prêts sur portefeuille : calculé par le serveur (vue du portefeuille du domaine).
      const doms = [...new Set(o.loans.filter((l) => l.product === 'portfolio' && (l.status === 'active' || l.status === 'defaulted')).map((l) => l.domain))];
      const out = {};
      for (const d of doms) {
        const res = await fetch(`${TRADING_API}/portfolio?domain=${d}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (res.ok) out[d] = await res.json();
      }
      setViews(out);
    }
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
            {data.account.creditBlocked && <div style={{ ...card, borderColor: '#f87171', marginBottom: 14 }}>⛔ <strong>Crédit bloqué :</strong> {data.account.blockedReason === 'recovery' ? `suite à une procédure de rétablissement, aucun nouveau crédit avant le ${new Date(data.account.blockedUntil).toLocaleDateString('fr-FR')}.` : 'un de tes prêts est en défaut. Tu ne peux plus emprunter tant qu\'il n\'est pas soldé.'}<HelpTip term="defaut-paiement" /></div>}
            {(() => { const ds = [...new Set(data.loans.filter((l) => l.status === 'defaulted').map((l) => l.domain))]; return ds.length > 0 ? <Recovery domains={ds} onDone={refresh} notify={notify} /> : null; })()}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ ...card, flex: '1 1 200px' }}><div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Dette en cours</div><div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{num(data.totals.outstandingCoins)} 🪙</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{data.totals.activeLoans} prêt(s) sur {data.totals.maxActiveLoans} possibles</div></div>
              <div style={{ ...card, flex: '1 1 200px' }}><div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' }}>Crédit fléché non dépensé<HelpTip term="credit-fleche" /></div>
                {data.reservedCredit.length === 0 ? <div style={{ fontSize: 18, color: '#cbd5e1', marginTop: 4 }}>—</div> : data.reservedCredit.map((r) => <div key={r.domain} style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>{num(r.coins, 0)} 🪙 <span style={{ fontSize: 13, color: '#94a3b8' }}>utilisables en {DOMAIN_LABEL[r.domain] || r.domain} seulement</span></div>)}</div>
            </div>
            <PersonalLoan onDone={refresh} notify={notify} />
            <PortfolioLoan onDone={refresh} notify={notify} />
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
                    Emprunté {num(l.principalCoins, 0)} 🪙 à {num(l.annualRatePct)} %{l.repaymentType === 'interest_only' ? ' variable, durée indéterminée (intérêts à chaque passage d\'année)' : ` sur ${l.months} mois`} · reste à rembourser <strong>{num(l.balanceCoins)} 🪙</strong>{l.repaymentType === 'annuity' && <> · mois écoulés {l.monthsElapsed}/{l.months}</>}
                    {l.nextInstalmentCoins !== null && <> · prochaine mensualité ≈ {num(l.nextInstalmentCoins)} 🪙</>}
                    {l.overdueCoins > 0 && <span style={{ color: '#fca5a5' }}> · impayé : {num(l.overdueCoins)} 🪙 ({l.missedInstalments} échéance(s))</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Déjà rendu : capital {num(l.principalPaidCoins)} 🪙 + intérêts {num(l.interestPaidCoins)} 🪙</div>
                  {(l.status === 'active' || l.status === 'defaulted') && l.repaymentType === 'annuity' && <div style={{ marginTop: 8 }}><button style={btn(false)} onClick={() => repay(l)}>Solder ce prêt<HelpTip term="remboursement-anticipe" /></button></div>}
                  {(l.status === 'active' || l.status === 'defaulted') && l.repaymentType === 'interest_only' && <PortfolioLoanCard loan={l} view={views[l.domain]} onDone={refresh} notify={notify} />}
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
