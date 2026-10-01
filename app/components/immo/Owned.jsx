'use client';

import { useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Button, EmptyState } from '@/app/components/ui/primitives';
import HelpTip from '@/app/components/HelpTip';
import ListingArt, { LazyListingArt } from './art';
import { Dpe, Pill, Row, useImmoMode } from './bits';
import { GliPanel, RenovationPanel, SalePanel, Statements } from './Panels';
import { MONTHS, STATUS_LABEL, TYPE_LABEL, call, coins, eur, eur2 } from './api';

const artOf = (p) => ({ id: p.listing_id, cityId: p.city_id, type: p.property_type, condition: p.condition, energyClass: p.energy_class, surfaceSqm: Number(p.surface_sqm), rooms: 2 });
const nextMonth = (game) => MONTHS[game.month % 12];

// Alertes du bien : discrètes, lisibles, et toujours accompagnées de la prochaine action possible.
function alertsOf(p, data, game) {
  const out = [];
  if (Number(p.pending_works_eur) > 0) out.push({ tone: 'warn', icon: 'alert', text: `Travaux à payer : ${eur(p.pending_works_eur)}` });
  if (p.status === 'vacant' && !p.searching && Number(p.pending_works_eur) === 0) out.push({ tone: 'info', icon: 'info', text: 'Bien vide : mets-le en location pour toucher un loyer.' });
  if (p.searching && p.search) out.push({ tone: 'info', icon: 'clock', text: `Recherche de locataire : mois ${p.search.vacantMonthsSoFar}, ${p.search.monthlyLetProbabilityPct} % de chance de louer chaque mois.` });
  if (p.status === 'notice') out.push({ tone: 'warn', icon: 'alert', text: 'Préavis donné : le locataire va partir.' });
  if (p.saleSearch) out.push({ tone: 'info', icon: 'building', text: `En vente à ${eur(p.saleSearch.askingPrice)} depuis ${p.saleSearch.monthsSoFar} mois.` });
  if (data.missedMonths > 0) out.push({ tone: 'bad', icon: 'alert', text: `Impayés de crédit : ${data.missedMonths} mois (${eur(data.arrearsEur)}).` });
  if (p.gli?.active && p.gli.inCarence) out.push({ tone: 'info', icon: 'shield', text: 'Assurance loyers : délai de carence en cours.' });
  return out;
}

export function PropertyCard({ p, data, game, onOpen, act, busy }) {
  const alerts = alertsOf(p, data, game);
  const next = p.l_payment && p.l_status === 'active' ? `mensualité ${eur2(p.l_payment)}` : null;
  return (
    <article className={`rp-own ${alerts.some((a) => a.tone === 'bad') ? 'has-bad' : ''}`}>
      <div className="rp-own__media" onClick={() => onOpen(p.id)}><LazyListingArt listing={artOf(p)} alt={`Illustration fictive de ${p.title}`} badge={false} /><div className="rp-card__dpe"><Dpe cls={p.energy_class} /></div></div>
      <div className="rp-own__body">
        <div className="rp-own__head"><h3><button type="button" onClick={() => onOpen(p.id)}>{p.title}</button></h3><Pill tone={p.status === 'let' ? 'ok' : p.status === 'notice' ? 'warn' : 'neutral'}>{STATUS_LABEL[p.status] ?? p.status}</Pill></div>
        <p className="rp-own__nums">Valeur {eur(p.value)} · Dette {eur(p.remainingLoan)} · Fonds propres <strong>{eur(p.equity)}</strong></p>
        <p className="rp-own__nums ik-muted">{p.status === 'let' ? <>Loyer {eur2(p.current_rent)}/mois<HelpTip term="loyer" /> · </> : null}{next ? <>Prochaine échéance : {next} le 1<sup>er</sup> {nextMonth(game)}</> : 'Aucun crédit en cours'}</p>
        {alerts.length > 0 && <ul className="rp-alerts">{alerts.map((a, i) => <li key={i} className={`rp-alert rp-alert--${a.tone}`}><Icon name={a.icon} size={16} />{a.text}</li>)}</ul>}
        <div className="rp-own__actions">
          {Number(p.pending_works_eur) > 0 && <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/pay-works`, 'POST'), 'Travaux payés')}>Payer les travaux ({eur(p.pending_works_eur)})</Button>}
          {p.status === 'vacant' && !p.searching && Number(p.pending_works_eur) === 0 && <Button size="sm" variant="primary" disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/list`, 'POST', { askingRentRatio: 1 }), 'Bien mis en location au loyer du marché')}>Mettre en location</Button>}
          <Button size="sm" onClick={() => onOpen(p.id)}>Gérer le bien</Button>
        </div>
      </div>
    </article>
  );
}

export function OwnedList({ data, summary, game, onOpen, act, busy, goSearch }) {
  const { advanced } = useImmoMode();
  const t = summary?.totals;
  return (
    <div className="rp-owned">
      <h2 className="ik-sr-only">Mes biens</h2>
      <div className="rp-kpis rp-kpis--big">
        <div><span>Patrimoine net<HelpTip term="patrimoine-net" /></span><strong>{eur(data.totals.equity)}</strong><small>Valeur {eur(data.totals.value)} − dette {eur(data.totals.debt)}</small></div>
        <div><span>Effort d’épargne mensuel<HelpTip term="effort-epargne" /></span><strong className={t && t.savingsEffort > 0 ? 'ik-warn' : 'ik-up'}>{t ? eur(t.savingsEffort) : '—'}</strong><small>{t ? (t.savingsEffort > 0 ? 'À ajouter de ta poche, un mois normal' : 'Le bien s’autofinance ce mois-ci') : 'Disponible après le premier mois'}</small></div>
        <div><span>Capital remboursé ce mois<HelpTip term="capital-rembourse" /></span><strong className="ik-up">{t ? eur(t.principalRepaid) : '—'}</strong><small>Ta dette baisse : cet argent t’enrichit</small></div>
        {advanced && <div><span>Loyers / mensualités</span><strong>{eur(data.totals.monthlyRent)} / {eur(data.totals.monthlyLoanPayments)}</strong><small>par mois, tous biens</small></div>}
      </div>
      {data.missedMonths > 0 && (
        <div className="rp-banner rp-banner--bad" role="alert"><Icon name="alert" size={20} /><p><strong>Impayés de crédit : {data.missedMonths} mois ({eur(data.arrearsEur)}).</strong> Après 3 mois, tu peux vendre à l’amiable avec une décote de 12 %. Sinon la banque lance une vente forcée (−25 % + frais)<HelpTip term="vente-forcee" />. Dans la réalité, cette procédure est bien plus longue ; elle est raccourcie ici.</p></div>
      )}
      {data.properties.length === 0 ? (
        <EmptyState icon="building" title="Tu n’as pas encore de bien" action={<Button variant="primary" onClick={goSearch}>Chercher un bien</Button>}>Trouve une annonce, simule ton financement, puis achète : ton bien apparaîtra ici, comme dans un tableau de gestion locative.</EmptyState>
      ) : (
        <div className="rp-own__grid">{data.properties.map((p) => <PropertyCard key={p.id} p={p} data={data} game={game} onOpen={onOpen} act={act} busy={busy} />)}</div>
      )}
    </div>
  );
}

// Fiche d'un bien possédé : les actions avancées apparaissent ici, quand elles ont du sens pour CE bien.
export function PropertySheet({ p, data, game, onBack, refresh, notify, act, busy }) {
  const { advanced } = useImmoMode();
  const [open, setOpen] = useState(null);
  if (!p) return <div className="rp-detail"><Button variant="ghost" icon="chevronLeft" onClick={onBack}>Mes biens</Button><EmptyState icon="info" title="Bien introuvable">Il a peut-être été vendu.</EmptyState></div>;
  const alerts = alertsOf(p, data, game);
  const tiles = [
    p.status === 'vacant' && !p.searching && Number(p.pending_works_eur) === 0 && { id: 'rent', label: 'Mettre en location', hint: 'au loyer du marché' },
    p.searching && { id: 'reprice', label: 'Baisser le loyer de 5 %', hint: 'pour louer plus vite' },
    p.status !== 'sold' && { id: 'sale', label: p.saleSearch ? 'Modifier le prix de vente' : 'Vendre', hint: 'choisir le prix demandé' },
    p.status !== 'sold' && { id: 'reno', label: 'Rénover (énergie)', hint: 'devis et rentabilité' },
    p.status !== 'sold' && p.gli && { id: 'gli', label: p.gli.active ? 'Assurance loyers : active' : 'Assurance loyers', hint: 'se protéger des impayés' },
    data.missedMonths >= 3 && { id: 'distress', label: 'Vendre à l’amiable (−12 %)', hint: 'éviter la vente forcée' },
  ].filter(Boolean);
  const run = (id) => {
    if (id === 'rent') return act(() => call(`/properties/${p.id}/list`, 'POST', { askingRentRatio: 1 }), 'Bien mis en location au loyer du marché');
    if (id === 'reprice') return act(() => call(`/properties/${p.id}/reprice`, 'POST', { askingRentRatio: Math.max(0.7, p.search.askingRatio - 0.05) }), 'Loyer baissé de 5 %');
    if (id === 'distress') return act(() => call('/distress/sell', 'POST', { propertyId: p.id }), 'Vente à l’amiable réalisée');
    return setOpen(open === id ? null : id);
  };
  return (
    <div className="rp-detail rp-enter">
      <div className="rp-detail__top"><Button variant="ghost" icon="chevronLeft" onClick={onBack}>Mes biens</Button></div>
      <div className="rp-sheet__hero"><ListingArt listing={artOf(p)} alt={`Illustration fictive de ${p.title}`} /><div><h2>{p.title}</h2><p className="ik-muted">{TYPE_LABEL[p.property_type]} {Number(p.surface_sqm)} m² · <Pill tone={p.status === 'let' ? 'ok' : 'neutral'}>{STATUS_LABEL[p.status] ?? p.status}</Pill> · <Dpe cls={p.energy_class} size="sm" /></p></div></div>
      <div className="rp-kpis rp-kpis--big">
        <div><span>Valeur</span><strong>{eur(p.value)}</strong></div>
        <div><span>Dette restante</span><strong>{eur(p.remainingLoan)}</strong></div>
        <div><span>Fonds propres</span><strong>{eur(p.equity)}</strong></div>
        {p.status === 'let' && <div><span>Loyer<HelpTip term="loyer" /></span><strong>{eur2(p.current_rent)}/mois</strong></div>}
      </div>
      {alerts.length > 0 && <ul className="rp-alerts rp-alerts--sheet">{alerts.map((a, i) => <li key={i} className={`rp-alert rp-alert--${a.tone}`}><Icon name={a.icon} size={16} />{a.text}</li>)}</ul>}
      {Number(p.pending_works_eur) > 0 && <div className="rp-actionbar"><Button variant="primary" disabled={busy} onClick={() => act(() => call(`/properties/${p.id}/pay-works`, 'POST'), 'Travaux payés')}>Payer les travaux ({eur(p.pending_works_eur)})</Button></div>}
      <section className="rp-section"><h2>Que veux-tu faire ?</h2>
        <div className="rp-tiles">{tiles.map((t) => <button key={t.id} type="button" className={`rp-tile ${open === t.id ? 'is-on' : ''}`} onClick={() => run(t.id)} disabled={busy} aria-expanded={['sale', 'reno', 'gli'].includes(t.id) ? open === t.id : undefined}><strong>{t.label}</strong><span>{t.hint}</span></button>)}</div>
        {open === 'sale' && <SalePanel property={p} onDone={refresh} notify={notify} />}
        {open === 'reno' && <RenovationPanel property={p} onDone={refresh} notify={notify} />}
        {open === 'gli' && <GliPanel property={p} onDone={refresh} notify={notify} />}
      </section>
      {advanced && <section className="rp-section"><h2>Relevés mensuels</h2><Statements propertyId={p.id} /></section>}
    </div>
  );
}
