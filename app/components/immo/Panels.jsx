'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/primitives';
import HelpTip from '@/app/components/HelpTip';
import { call, coins, eur, eur2, eurText } from './api';
import Coin from '@/app/components/ui/Coin';

// Fonctions avancées d'un bien : elles apparaissent dans la fiche du bien, au bon moment (pas dans une liste de boutons).
// Aucun calcul ici : tout vient du serveur (aperçus et confirmations).
export function SalePanel({ property, onDone, notify }) {
  const [options, setOptions] = useState(null);
  const [ratio, setRatio] = useState(1);
  const [busy, setBusy] = useState(false);
  const sale = property.saleSearch;
  useEffect(() => {
    let alive = true;
    call(`/properties/${property.id}/sell/options`).then((o) => { if (alive) { setOptions(o); setRatio(sale ? Math.round(sale.askingRatio * 20) / 20 : 1); } }).catch((e) => notify(e.message, true));
    return () => { alive = false; };
  }, [property.id, sale?.askingPrice]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = options?.options.find((o) => Math.abs(o.ratio - ratio) < 0.001);
  const submit = async () => {
    setBusy(true);
    try { const r = await call(sale ? `/properties/${property.id}/sell/reprice` : `/properties/${property.id}/sell`, 'POST', { askingRatio: ratio }); notify(r.message); await onDone(); }
    catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  if (!options) return <p className="ik-muted">Calcul des prix possibles…</p>;
  return (
    <div className="rp-panel">
      <h3>{sale ? 'Modifier le prix de vente' : 'Vendre ce bien'}</h3>
      <p className="ik-muted">Valeur estimée : {eur(options.estimatedValue)}. Plus le prix demandé est élevé, plus l’acquéreur est long à trouver.{options.occupied && ` Le bien est occupé : le prix final est réduit de ${options.occupiedDiscountPct} %.`}</p>
      <div className="rp-chips" role="group" aria-label="Prix demandé, en pourcentage de la valeur estimée">
        {options.options.map((o) => <button key={o.ratio} type="button" className={`rp-chip ${Math.abs(o.ratio - ratio) < 0.001 ? 'is-on' : ''}`} aria-pressed={Math.abs(o.ratio - ratio) < 0.001} onClick={() => setRatio(o.ratio)}>{Math.round(o.ratio * 100)} %</button>)}
      </div>
      {chosen && <p>Prix demandé : <strong>{eur(chosen.askingPrice)}</strong> · chance de vendre chaque mois : {chosen.monthlyBuyerProbabilityPct} % · délai moyen : environ {Number(chosen.expectedMonthsToSell).toFixed(1)} mois (au plus {chosen.maxMonthsToSell}).</p>}
      {sale && <p className="rp-note">En vente depuis {sale.monthsSoFar} mois, au prix de {eur(sale.askingPrice)}. Le nouveau prix s’applique dès le mois prochain.</p>}
      <Button variant="primary" loading={busy} disabled={busy || (sale && chosen && Math.abs(chosen.askingPrice - sale.askingPrice) < 1)} onClick={submit}>{sale ? 'Appliquer le nouveau prix' : 'Mettre en vente'}</Button>
    </div>
  );
}

export function RenovationPanel({ property, onDone, notify }) {
  const [pv, setPv] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    call(`/properties/${property.id}/renovate/preview`).then((o) => { if (alive) setPv(o); }).catch((e) => notify(e.message, true));
    return () => { alive = false; };
  }, [property.id, property.energy_class]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    setBusy(true);
    try { const r = await call(`/properties/${property.id}/renovate`, 'POST'); notify(`Rénovation terminée : classe ${r.previousClass} → ${r.newClass} pour ${eurText(r.costEuros)} (${r.coinsCharged} InvestCoins).`); await onDone(); }
    catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  if (!pv) return <p className="ik-muted">Calcul du devis…</p>;
  return (
    <div className="rp-panel">
      <h3>Rénovation énergétique<HelpTip term="dpe" /></h3>
      {pv.canRenovate ? (
        <>
          <p>Classe <strong>{pv.currentClass}</strong> → <strong>{pv.newClass}</strong> · devis <strong>{eur(pv.costEuros)}</strong>.</p>
          <dl className="rp-facts rp-facts--tight">
            <div className="rp-row"><dt>Loyer de marché</dt><dd>{eur2(pv.rentBefore)} → {eur2(pv.rentAfter)} ({pv.rentGainMonthly > 0 ? '+' : ''}{eur2(pv.rentGainMonthly)}/mois, {eur(pv.rentGainYearly)}/an)</dd></div>
            <div className="rp-row"><dt>Valeur du bien<HelpTip term="valeur-verte" /></dt><dd>{eur(pv.valueBefore)} → {eur(pv.valueBefore + pv.valueGain)} ({pv.valueGain > 0 ? '+' : ''}{eur(pv.valueGain)})</dd></div>
            <div className="rp-row"><dt>Amorti en</dt><dd>{pv.paybackYears === 0 ? 'tout de suite : la valeur gagnée couvre les travaux' : pv.paybackYears ? `${pv.paybackYears} ans de loyers en plus` : 'jamais par les loyers'}</dd></div>
          </dl>
          <p className={`rp-verdict rp-verdict--${pv.verdict}`}>
            {pv.verdict === 'profitable' && 'Opération rentable : la valeur gagnée et le loyer en plus remboursent les travaux en moins de 15 ans.'}
            {pv.verdict === 'partly_recovered' && `La valeur du bien récupère ${Math.round((pv.valueGain / pv.costEuros) * 100)} % du coût des travaux, mais le loyer n’augmente pas : surtout utile pour éviter l’interdiction de louer.`}
            {pv.verdict === 'profitable_slowly' && 'Rentable, mais lentement : plus de 15 ans de loyers en plus pour rembourser ce que la valeur gagnée ne couvre pas.'}
            {pv.verdict === 'no_direct_gain' && 'Aucun gain direct de loyer ni de valeur : cette rénovation ne se justifie que pour éviter l’interdiction de louer.'}
          </p>
          <p className="ik-muted">Le nouveau loyer s’applique à la prochaine mise en location. Seuil de 15 ans : repère du jeu.</p>
          {pv.currentClassBannedFromYear && <p className="rp-note">Classe {pv.currentClass} : location interdite {pv.bannedNow ? 'depuis' : 'à partir de'} {pv.currentClassBannedFromYear}.{!pv.bannedAfter && pv.newClassBannedFromYear ? ` Classe ${pv.newClass} : interdite à partir de ${pv.newClassBannedFromYear}.` : ''}{!pv.bannedAfter && !pv.newClassBannedFromYear ? ` Classe ${pv.newClass} : aucune interdiction prévue.` : ''}</p>}
          {!pv.affordable && <p className="ik-error">Solde InvestCoins insuffisant.</p>}
          <Button variant="primary" loading={busy} disabled={busy || !pv.affordable} onClick={go}>Lancer les travaux</Button>
        </>
      ) : <p className="ik-muted">{pv.reason}</p>}
    </div>
  );
}

export function GliPanel({ property, onDone, notify }) {
  const g = property.gli;
  const [busy, setBusy] = useState(false);
  if (!g) return null;
  const toggle = async () => {
    setBusy(true);
    try { const r = await call(`/properties/${property.id}/gli`, 'POST', { active: !g.active }); notify(r.message); await onDone(); }
    catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  return (
    <div className="rp-panel">
      <h3>Assurance loyers impayés<HelpTip term="gli" /></h3>
      {g.active ? (
        <p>Assuré. Prime : environ <strong>{eur2(g.premiumMonthly)}</strong>/mois quand le bien est loué ({g.premiumPct} % du loyer charges comprises, déductible de tes impôts).{' '}
          {g.inCarence ? <>Délai de carence en cours<HelpTip term="carence" /> : un impayé qui commence avant sa fin ne sera pas remboursé.</> : 'Le délai de carence est passé : tu es couvert.'}{' '}
          Remboursement dès le {g.triggerAfterUnpaidMonths}<sup>e</sup> mois d’impayé, plafond {eur(g.maxCoverageEur)} (déjà remboursé : {eur(g.reimbursedEur)}).
          {g.tenantRefused && <> Le locataire actuel est refusé par l’assureur : pas de prime et pas de couverture pour lui.<HelpTip term="gli-etudiants" /></>}</p>
      ) : (
        <p className="ik-muted">Prime estimée : <strong>{eur2(g.premiumMonthly)}</strong>/mois ({g.premiumPct} % du loyer + charges), seulement les mois où le bien est loué. Délai de carence : {g.carenceMonths} mois<HelpTip term="carence" />.{g.reason && <span className="rp-note"> {g.reason}<HelpTip term="gli-etudiants" /></span>}</p>
      )}
      <Button variant={g.active ? 'secondary' : 'primary'} loading={busy} disabled={busy || (!g.active && !g.canSubscribe)} onClick={toggle}>{g.active ? 'Résilier l’assurance' : 'Souscrire l’assurance'}</Button>
    </div>
  );
}

export function Statements({ propertyId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { call(`/properties/${propertyId}/statements?limit=6`).then((r) => setRows(r.statements)).catch(() => setRows([])); }, [propertyId]);
  if (!rows) return <p className="ik-muted">Chargement des relevés…</p>;
  if (!rows.length) return <p className="ik-muted">Aucun relevé mensuel pour l’instant : fais avancer le temps.</p>;
  return (
    <table className="rp-table"><caption className="ik-sr-only">Résultat net des derniers mois</caption>
      <thead><tr><th scope="col">Mois</th><th scope="col">Statut</th><th scope="col" className="ik-num">Résultat net</th><th scope="col" className="ik-num">Pièces</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={`${r.year}-${r.month}`}><td>{r.month}/{r.year}</td><td>{r.status}</td><td className="ik-num">{eur2(r.netCashFlow)}</td><td className="ik-num">{coins(r.coinsDelta)}</td></tr>)}</tbody>
    </table>
  );
}
