'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Button, Card, Modal, Skeleton } from '@/app/components/ui/primitives';
import HelpTip from '@/app/components/HelpTip';
import ListingArt, { viewsFor } from './art';
import { Dpe, Heart, Pill, Portal, Row, useImmoMode } from './bits';
import { CONDITION_LABEL, DPE_COLORS, TYPE_LABEL, call, coins, describeListing, eur, eur2, listingAlt, pct, eurText } from './api';
import Coin from '@/app/components/ui/Coin';
import Link from 'next/link';

// Signature chez le notaire : un stylo trace la signature, un tampon « Acte signé » tombe, puis les clés sont remises.
function Signature({ phase, onClose, error }) {
  return (
    <div className="rp-sign" role="dialog" aria-modal="true" aria-label="Signature chez le notaire">
      <div className="rp-sign__card">
        {phase !== 'error' ? (
          <>
            <h2>{phase === 'keys' ? 'Clés remises !' : 'Signature chez le notaire…'}</h2>
            <svg viewBox="0 0 320 200" className="rp-sign__svg" aria-hidden="true" focusable="false">
              <rect x="40" y="10" width="240" height="180" rx="8" className="rp-sign__paper" />
              {[40, 60, 80, 100].map((y) => <line key={y} x1="64" y1={y} x2="256" y2={y} className="rp-sign__line" />)}
              <path d="M70 160 C 90 120, 100 170, 120 140 S 150 120, 160 150 S 190 170, 215 130 S 240 150, 250 140" className="rp-sign__ink" />
              <g className="rp-sign__stamp"><circle cx="230" cy="70" r="30" /><text x="230" y="68" textAnchor="middle">ACTE</text><text x="230" y="82" textAnchor="middle">SIGNÉ</text></g>
            </svg>
            {phase === 'keys' && <div className="rp-sign__keys" aria-hidden="true"><svg viewBox="0 0 64 64" width="56" height="56" focusable="false"><circle cx="20" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="5" /><path d="M32 32h26M48 32v10M56 32v8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" /></svg></div>}
            <p>{phase === 'keys' ? 'Félicitations, le bien est à toi. Pense à le mettre en location.' : 'Le notaire prépare l’acte de vente et le prêt est débloqué.'}</p>
            {phase === 'keys' && <Button variant="primary" onClick={onClose}>Voir mes biens</Button>}
          </>
        ) : (
          <><h2>Achat impossible</h2><p role="alert">{error}</p><Button onClick={onClose}>Fermer</Button></>
        )}
      </div>
    </div>
  );
}

function Gallery({ listing, city, children }) {
  const [view, setView] = useState('facade');
  const VIEWS = viewsFor(listing);
  const idx = Math.max(0, VIEWS.findIndex((v) => v.id === view));
  const move = (d) => setView(VIEWS[(idx + d + VIEWS.length) % VIEWS.length].id);
  return (
    <div className="rp-gallery" onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } }}>
      <div className="rp-gallery__main" key={view}><ListingArt listing={listing} view={view} alt={`${listingAlt(listing, city)} Vue : ${VIEWS[idx].label}.`} />{children}</div>
      <div className="rp-gallery__thumbs" role="tablist" aria-label="Vues du bien">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={view === v.id ? 'is-on' : ''} onClick={() => setView(v.id)}>
            <ListingArt listing={listing} view={v.id} alt="" badge={false} /><span>{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DpeScale({ cls }) {
  return (
    <div className="rp-dpescale" role="img" aria-label={`Classe énergie ${cls} sur une échelle de A (économe) à G (énergivore)`}>
      {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => <span key={c} className={c === cls ? 'is-on' : ''} style={{ background: DPE_COLORS[c] }}>{c}</span>)}
    </div>
  );
}

function Tension({ value }) {
  const label = value >= 0.7 ? 'Très forte' : value >= 0.4 ? 'Moyenne' : 'Faible';
  return (
    <div className="rp-tension"><div className="rp-tension__bar" role="img" aria-label={`Tension locative : ${label.toLowerCase()}`}><i style={{ width: `${Math.round(value * 100)}%` }} /></div><span>{label}</span></div>
  );
}

// Liens discrets vers les explications (glossaire) : pour comprendre un mot sans quitter la fiche pour longtemps.
const LESSONS = {
  mensualite: 'Comprendre la mensualité', dpe: 'Comprendre le DPE', 'rendement-brut': 'Rendement brut, c’est quoi ?', 'frais-notaire': 'Les frais de notaire', endettement: 'Le taux d’endettement',
  apport: 'À quoi sert l’apport', loyer: 'Comment fonctionne le loyer', vacance: 'La vacance locative', 'zone-tendue': 'Zone tendue : ce que ça change', taeg: 'Le TAEG',
};
function LessonLinks({ ids }) {
  return (
    <nav className="rp-lessons" aria-label="Pour aller plus loin">
      <span><Icon name="bookOpen" size={16} />Pour aller plus loin</span>
      {ids.map((id) => <Link key={id} href={`/glossaire#${id}`}>{LESSONS[id]}</Link>)}
      <Link href="/education">Parcours d’éducation</Link>
    </nav>
  );
}

// Louer ou acheter ? Mêmes chiffres que ceux du serveur (loyer estimé, mensualité du prêt, charges du bien) : on les met côte à côte.
function RentVsBuy({ l, pv, rentMode, down }) {
  if (!pv?.loan) return null;
  const yearly = l.annualCharges.condoFees + l.annualCharges.propertyTax + l.annualCharges.insurance + l.annualCharges.maintenance;
  const owner = pv.loan.monthlyPaymentWithInsurance + yearly / 12;
  const tenant = l.marketRentMonthly;
  const diff = owner - tenant;
  return (
    <div className="rp-vs" data-testid="rent-vs-buy">
      <h3>{rentMode ? 'Louer ou acheter ?' : 'Et si je louais ?'}</h3>
      <div className="rp-vs__cols">
        <div className="rp-vs__col"><span><Icon name="keyRound" size={16} />Locataire</span><strong>{eur(tenant)}<small>/mois</small></strong><p>Le loyer, et rien ne t’appartient à la fin.</p></div>
        <div className="rp-vs__col is-own"><span><Icon name="house" size={16} />Propriétaire</span><strong>{eur(owner)}<small>/mois</small></strong><p>Mensualité {eur(pv.loan.monthlyPaymentWithInsurance)} + charges et taxes {eur(yearly / 12)}.</p></div>
      </div>
      <p className="rp-vs__note">{diff > 0 ? `Acheter coûte ${eurText(diff)} de plus par mois que louer ce bien` : `Acheter coûte ${eurText(-diff)} de moins par mois que louer ce bien`} : une partie de la mensualité rembourse le prêt, donc te constitue un patrimoine. Calcul avec un apport de {coins(down)}.</p>
    </div>
  );
}

export default function Detail({ listingId, game, balance, access, onBack, refresh, notify, onBought, eurosPerCoin, rentMode = false, onSwitchToBuy }) {
  const { advanced } = useImmoMode();
  const [d, setD] = useState(null);
  const [fav, setFav] = useState(false);
  const [plan, setPlan] = useState({ down: '', months: 300 });
  const [pv, setPv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sign, setSign] = useState(null);       // { phase, error }
  const seq = useRef(0);

  // notify / onBack changent à chaque affichage du parent : on les lit par référence pour ne PAS recharger la fiche à chaque fois.
  const cb = useRef({ notify, onBack });
  cb.current = { notify, onBack };
  const load = useCallback(async () => {
    try { setD(await call(`/listings/${encodeURIComponent(listingId)}`)); } catch (e) { cb.current.notify(e.message, true); cb.current.onBack(); }
  }, [listingId]);
  useEffect(() => { load(); call('/favorites').then((f) => setFav(f.ids.includes(listingId))).catch(() => {}); }, [load, listingId]);

  const simulate = useCallback(async (p) => {
    const id = ++seq.current;
    if (p.down === '' || Number.isNaN(Number(p.down))) return;
    try { const r = await call('/purchase/preview', 'POST', { listingId, downPaymentCoins: Number(p.down), months: Number(p.months) }); if (id === seq.current) setPv(r); }
    catch (e) { if (id === seq.current) setPv({ error: e.message }); }
  }, [listingId]);

  useEffect(() => {
    if (!d) return;
    const p = { down: String(d.suggestedDownPaymentCoins), months: 300 };   // apport proposé par le serveur
    setPlan(p); simulate(p);
  }, [d?.listing.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!d) return undefined; const t = setTimeout(() => simulate(plan), 350); return () => clearTimeout(t); }, [plan.down, plan.months]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <div className="rp-detail"><Skeleton height={360} /><Skeleton height={200} style={{ marginTop: 16 }} /></div>;
  const { listing: l, city, neighborhood, economics: ec } = d;
  const isParking = l.type === 'parking';
  const toggleFav = async () => { const had = fav; setFav(!had); try { await call(`/favorites/${encodeURIComponent(l.id)}`, had ? 'DELETE' : 'PUT'); } catch (e) { setFav(had); notify(e.message, true); } };

  const expertise = async () => {
    setBusy(true);
    try { const r = await call(`/listings/${l.id}/expertise`, 'POST'); notify(r.message || (r.hiddenDefects?.length ? 'Expertise : des défauts cachés ont été trouvés.' : 'Expertise : aucun défaut caché.')); await load(); await simulate(plan); await refresh(); }
    catch (e) { notify(e.message, true); }
    setBusy(false);
  };

  const buy = async () => {
    setConfirm(false); setSign({ phase: 'signing' });
    const started = Date.now();
    try {
      await call('/purchase', 'POST', { listingId: l.id, downPaymentCoins: Number(plan.down), months: Number(plan.months) });
      await new Promise((r) => setTimeout(r, Math.max(0, 2300 - (Date.now() - started)))); // laisse le temps de voir la signature
      setSign({ phase: 'keys' }); await refresh();
    } catch (e) { setSign({ phase: 'error', error: e.message }); }
  };

  const canBuy = pv?.bank?.approved && pv?.coins?.affordable && access?.canBuy;
  const bankTone = pv?.bank ? (pv.bank.approved ? (pv.coins?.affordable === false ? 'warn' : 'ok') : 'ko') : 'neutral';
  const description = describeListing(l, city, neighborhood);

  return (
    <div className="rp-detail rp-enter">
      <div className="rp-detail__grid">
        <div className="rp-detail__main">
          <Gallery listing={l} city={city}>
            <div className="rp-hero__shade" aria-hidden="true" />
            <div className="rp-hero__top"><Button variant="ghost" icon="chevronLeft" onClick={onBack}>Retour aux résultats</Button><Heart on={fav} onClick={toggleFav} label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} /></div>
            <header className="rp-hero__info">
              <div className="rp-detail__pills">{rentMode && <Pill>À louer</Pill>}{l.urgentSale && !rentMode && <Pill tone="hot">Vente pressée</Pill>}{l.needsWorks && <Pill tone="warn">Travaux à prévoir</Pill>}<Pill>{CONDITION_LABEL[l.condition]}</Pill><Pill>{l.age === 'new' ? 'Neuf' : 'Ancien'}</Pill></div>
              <h2 className="rp-title">{TYPE_LABEL[l.type]} {l.surfaceSqm} m² · {l.neighborhoodName}</h2>
              <p className="rp-hero__where">{city?.name} · {city?.region}{city?.tenseZone && <> · zone tendue<HelpTip term="zone-tendue" /></>}</p>
              <div className="rp-hero__price">
                {rentMode ? <strong>{eur(l.marketRentMonthly)}<small>/mois</small></strong> : <strong>{eur(l.price)}</strong>}
                {rentMode ? <span>à l’achat : {eur(l.price)}</span> : <span>{eur(l.pricePerSqm)}/m²</span>}
              </div>
            </header>
          </Gallery>

          <ul className="rp-keyfacts" aria-label="Chiffres clés">
            <li><Icon name="ruler" size={20} /><strong>{l.surfaceSqm} m²</strong><span>surface</span></li>
            {!isParking && <li><Icon name="doorOpen" size={20} /><strong>{l.rooms}</strong><span>pièce{l.rooms > 1 ? 's' : ''}</span></li>}
            {!isParking && <li><Dpe cls={l.energyClass} /><strong>DPE {l.energyClass}</strong><span>énergie</span></li>}
            <li><Icon name="trendingUp" size={20} /><strong>{pct(l.grossYieldPct)}</strong><span>rendement brut</span></li>
            <li><Icon name="keyRound" size={20} /><strong>{eur(l.marketRentMonthly)}</strong><span>loyer estimé /mois</span></li>
          </ul>

          <section className="rp-section"><h2>Description</h2><p className="rp-desc">{description}</p></section>

          <section className="rp-section">
            <h2>Le bien en bref</h2>
            <dl className="rp-facts">
              <Row label="Type">{TYPE_LABEL[l.type]}</Row><Row label="Surface">{l.surfaceSqm} m²</Row>{!isParking && <Row label="Pièces">{l.rooms}</Row>}
              <Row label="État">{CONDITION_LABEL[l.condition]}</Row>
              <Row label="Travaux annoncés" help={<HelpTip term="travaux" />}>{l.advertisedWorks > 0 ? eur(l.advertisedWorks) : 'Aucun'}</Row>
              <Row label="Construction">{l.age === 'new' ? 'Neuf' : 'Ancien'}</Row>
            </dl>
          </section>

          <section className="rp-section">
            <h2>{isParking ? 'Expertise' : <>Diagnostics<HelpTip term="dpe" /></>}</h2>
            {isParking ? <p className="ik-muted">Un parking n’a pas de diagnostic énergétique (DPE) : seule l’expertise avant achat te dit s’il y a un défaut caché.</p> : <div className="rp-diag"><Dpe cls={l.energyClass} size="lg" /><div><DpeScale cls={l.energyClass} /><p className="ik-muted">Classe {l.energyClass}. {['E', 'F', 'G'].includes(l.energyClass) ? 'Un logement énergivore perd de la valeur et peut devenir interdit à la location : une rénovation énergétique est possible après l’achat.' : 'Bonne performance : peu de risque de restriction de location.'}</p></div></div>}
            <div className="rp-expert">
              {d.expertise ? (
                <div className={`rp-expert__result ${d.expertise.hiddenDefects.length ? 'is-bad' : 'is-ok'}`} role="status">
                  <strong>{d.expertise.hiddenDefects.length ? 'Défauts cachés trouvés' : 'Expertise : rien à signaler'}</strong>
                  {d.expertise.hiddenDefects.length > 0 && <ul>{d.expertise.hiddenDefects.map((x, i) => <li key={i}>{String(x)}</li>)}</ul>}
                  <p>Travaux réels : {eur(d.expertise.realWorks)} (annoncés : {eur(l.advertisedWorks)}).</p>
                </div>
              ) : (
                <div className="rp-expert__cta"><div><strong>Un défaut caché ?</strong><p className="ik-muted">Un expert vérifie le bien avant l’achat (travaux réels, défauts non annoncés).<HelpTip term="expertise" /></p></div>
                  <Button onClick={expertise} loading={busy} disabled={busy || !access?.canBuy}>Faire expertiser · {coins(d.expertiseCostCoins)}</Button></div>
              )}
            </div>
          </section>

          <section className="rp-section">
            <h2>Charges et taxes</h2>
            <dl className="rp-facts">
              <Row label="Copropriété (non récupérable)" help={<HelpTip term="charges-non-recuperables" />}>{eur(l.annualCharges.condoFees)}/an</Row>
              <Row label="Taxe foncière" help={<HelpTip term="taxe-fonciere" />}>{eur(l.annualCharges.propertyTax)}/an</Row>
              <Row label="Assurance propriétaire">{eur(l.annualCharges.insurance)}/an</Row>
              <Row label="Entretien courant">{eur(l.annualCharges.maintenance)}/an</Row>
              <Row label="Charges récupérables (avancées)">{eur(l.recoverableChargesMonthly)}/mois</Row>
            </dl>
          </section>

          <section className="rp-section">
            <h2>Quartier {l.neighborhoodName} · marché locatif</h2>
            <p className="ik-muted">{city?.description}</p>
            <dl className="rp-facts">
              <Row label="Tension locative"><Tension value={l.rentalTension} /></Row>
              <Row label="Loyer de référence">{eur2(l.rentPerSqm)}/m²/mois</Row>
              <Row label="Vacance attendue" help={<HelpTip term="vacance" />}>{pct(l.vacancyPct)} du temps</Row>
              <Row label="Durée moyenne d’un bail">{l.tenancyMonths} mois</Row>
            </dl>
          </section>

          <section className="rp-section">
            <h2>Loyer et rentabilité</h2>
            <div className="rp-kpis">
              <div><span>Loyer estimé</span><strong>{eur(l.marketRentMonthly)}/mois</strong></div>
              <div><span>Rendement brut<HelpTip term="rendement-brut" /></span><strong>{pct(l.grossYieldPct)}</strong><small>loyer × 12 ÷ prix</small></div>
              <div><span>Rendement net estimé</span><strong>{ec.netYieldPct === null ? '—' : pct(ec.netYieldPct)}</strong><small>après vacance, charges et frais de notaire</small></div>
            </div>
            {advanced && (
              <dl className="rp-facts rp-facts--adv">
                <Row label="Coût total (prix + notaire + travaux annoncés)">{eur(ec.totalInvestment)}</Row>
                <Row label="Frais de notaire" help={<HelpTip term="frais-notaire" />}>{eur(ec.notaryFees)}</Row>
                <Row label="Loyers encaissés par an (vacance déduite)">{eur(ec.collectedAnnualRent)}</Row>
                <Row label="Charges par an">{eur(ec.annualCharges)}</Row>
                <Row label="Rendement brut sur coût total">{ec.grossYieldPct === null ? '—' : pct(ec.grossYieldPct)}</Row>
                <Row label="Résultat annuel avant crédit">{eur(ec.annualCashFlow)}</Row>
                <Row label="Occupation minimale pour ne pas perdre d’argent (hors crédit)">{ec.breakevenOccupancyPct === null ? '—' : pct(ec.breakevenOccupancyPct)}</Row>
              </dl>
            )}
          </section>
          <LessonLinks ids={rentMode ? ['loyer', 'vacance', 'zone-tendue', 'rendement-brut'] : ['mensualite', 'apport', 'endettement', 'frais-notaire', 'dpe', 'rendement-brut']} />
        </div>

        <aside className="rp-detail__side">
          <Card className="rp-finance" flat id="rp-finance">
            <h2>{rentMode ? 'Et si j’achetais ce bien ?' : 'Simuler mon financement'}</h2>
            <div className="rp-finance__fields">
              <label className="rp-field"><span>Apport<HelpTip term="apport" /></span>
                <span className="rp-field__box"><input className="ik-input" type="number" min="0" inputMode="numeric" value={plan.down} onChange={(e) => setPlan({ ...plan, down: e.target.value })} /><em><Coin /></em></span></label>
              <label className="rp-field"><span>Durée du prêt</span>
                <select className="ik-select" value={plan.months} onChange={(e) => setPlan({ ...plan, months: e.target.value })}>{[120, 180, 240, 300, 360].map((m) => <option key={m} value={m}>{m / 12} ans</option>)}</select></label>
            </div>
            <div className="rp-sliders">
              <label className="rp-slider"><span>Apport : <strong>{coins(Number(plan.down) || 0)}</strong></span>
                <input type="range" min="0" max={Math.max(1, Math.ceil(l.priceCoins))} step={Math.max(1, Math.round(l.priceCoins / 200))} value={Math.min(Number(plan.down) || 0, Math.ceil(l.priceCoins))} onChange={(e) => setPlan({ ...plan, down: e.target.value })} aria-label="Apport en InvestCoins (curseur)" />
              </label>
              <label className="rp-slider"><span>Durée : <strong>{plan.months / 12} ans</strong></span>
                <input type="range" min="120" max="360" step="60" value={plan.months} onChange={(e) => setPlan({ ...plan, months: Number(e.target.value) })} aria-label="Durée du prêt en années (curseur)" />
              </label>
            </div>
            {pv?.error && <p className="ik-error" role="alert">{pv.error}</p>}
            {pv?.loan && (
              <>
                <div className="rp-monthly"><span>Mensualité<HelpTip term="mensualite" /></span><strong>{eur2(pv.loan.monthlyPaymentWithInsurance)}</strong><small>assurance comprise · taux {pct(pv.loan.annualRatePct, 2)}</small></div>
                <div className={`rp-bank rp-bank--${bankTone}`} role="status">
                  <strong>{pv.bank.approved ? (pv.coins.affordable ? 'La banque accepte' : 'La banque accepte ton dossier, mais il te manque des pièces') : 'La banque refuse'}</strong>
                  <p>Endettement<HelpTip term="endettement" /> : {pct(pv.bank.debtRatioPct)} (maximum accepté : {eur(pv.bank.maxMonthlyPayment)}/mois) · reste à vivre<HelpTip term="reste-a-vivre" /> : {eur(pv.bank.livingRemaining)}</p>
                  {pv.bank.approved && !pv.coins.affordable && <p className="rp-bank__reason" data-testid="missing-coins">• Il te faut {coins(pv.coins.total)} (apport et frais), tu as {coins(pv.coins.balance)} : il en manque {coins(pv.coins.total - pv.coins.balance)}. Baisse l&apos;apport si la banque le permet, ou attends d&apos;avoir plus de pièces.</p>}
                  {!pv.bank.approved && pv.bank.reasons?.map((r) => <p key={r.code} className="rp-bank__reason">• {r.message}</p>)}
                  {pv.bank.warnings?.map((w) => <p key={w.code} className="rp-bank__warning" data-testid="bank-warning" role="note"><Icon name="alert" size={16} /> <strong>Attention :</strong> {w.message} Tu peux acheter quand même.<HelpTip term="epargne-restante" /></p>)}
                </div>
                <dl className="rp-facts rp-facts--tight">
                  <Row label="Tu empruntes">{eur(pv.costs.loanPrincipal)}</Row>
                  <Row label="Coût en InvestCoins"><strong>{coins(pv.coins.total)}</strong></Row>
                  <Row label="Ton solde">{coins(pv.coins.balance)}</Row>
                </dl>
                {advanced && (
                  <dl className="rp-facts rp-facts--tight rp-facts--adv">
                    <Row label="TAEG" help={<HelpTip term="taeg" />}>{pct(pv.loan.taegPct, 2)}</Row>
                    <Row label="Intérêts sur la durée" help={<HelpTip term="interets" />}>{eur(pv.loan.totalInterest)}</Row>
                    <Row label="Assurance sur la durée" help={<HelpTip term="assurance-emprunteur" />}>{eur(pv.loan.totalInsurance)}</Row>
                    <Row label="Frais de notaire" help={<HelpTip term="frais-notaire" />}>{eur(pv.costs.notaryFees)}</Row>
                    <Row label="Frais de dossier">{eur(pv.costs.loanApplicationFee)}</Row>
                    <Row label="Travaux compris dans le prêt">{eur(pv.costs.works)}</Row>
                  </dl>
                )}
              </>
            )}
            {!rentMode && !access?.canBuy && <p className="rp-lock">L’achat demande d’avoir choisi Immobilier comme domaine gratuit, ou l’abonnement Pro.</p>}
            <RentVsBuy l={l} pv={pv} rentMode={rentMode} down={Number(plan.down) || 0} />
            {rentMode ? (
              <Button variant="primary" size="lg" block onClick={onSwitchToBuy}>Voir ce bien à l’achat</Button>
            ) : (
              <>
                <Button variant="primary" size="lg" block disabled={!canBuy || busy} onClick={() => setConfirm(true)}>Acheter ce bien</Button>
                <Button block onClick={expertise} disabled={busy || !!d.expertise || !access?.canBuy}>{d.expertise ? 'Expertise réalisée' : <>Faire expertiser · {coins(d.expertiseCostCoins)}</>}</Button>
              </>
            )}
          </Card>
        </aside>
      </div>

      <Portal>
      <div className="rp-stickycta">
        <div><strong>{rentMode ? `${eurText(l.marketRentMonthly)}/mois` : eur(l.price)}</strong><span>{rentMode ? `à l’achat : ${eurText(l.price)}` : `${eurText(l.pricePerSqm)}/m²`}</span></div>
        <Button variant="primary" onClick={() => document.getElementById('rp-finance')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{rentMode ? 'Louer ou acheter ?' : 'Simuler et acheter'}</Button>
      </div>

      </Portal>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirmer l’achat" footer={<><Button onClick={() => setConfirm(false)}>Annuler</Button><Button variant="primary" onClick={buy}>Signer chez le notaire</Button></>}>
        {pv?.costs && <dl className="rp-facts"><Row label="Bien">{l.title}</Row><Row label="Prix">{eur(l.price)}</Row><Row label="Emprunt">{eur(pv.costs.loanPrincipal)} sur {plan.months / 12} ans</Row><Row label="Mensualité">{eur2(pv.loan.monthlyPaymentWithInsurance)}</Row><Row label="Coût en InvestCoins"><strong>{coins(pv.coins.total)}</strong></Row></dl>}
      </Modal>
      {sign && <Portal><Signature phase={sign.phase} error={sign.error} onClose={() => { setSign(null); if (sign.phase === 'keys') onBought(); }} /></Portal>}
    </div>
  );
}
