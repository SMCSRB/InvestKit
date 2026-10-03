'use client';

import { useEffect, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { EmptyState, Skeleton } from '@/app/components/ui/primitives';
import HelpTip from '@/app/components/HelpTip';
import { MONTHS, call, coins, eur, eur2, eurText2 } from './api';
import Coin from '@/app/components/ui/Coin';
import RankingProgress from '@/app/components/ui/RankingProgress';
import { Medal } from '@/app/components/ui/Icon';

const kindTone = (k = '') => (/late|unpaid|default|forced/.test(k) ? 'bad' : /works|notice|vacan|truce/.test(k) ? 'warn' : /gli|sold|let|reimb/.test(k) ? 'ok' : 'info');
const kindIcon = { bad: 'alert', warn: 'alert', ok: 'check', info: 'info' };

export function Summary({ summary, events }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [summary?.year, summary?.month]);
  if (!summary || !summary.totals) {
    return <EmptyState icon="calendar" title="Aucun mois réglé pour l’instant">Fais avancer le temps : à chaque mois, ton bilan et ton courrier apparaissent ici.</EmptyState>;
  }
  const t = summary.totals;
  const lines = summary.properties.flatMap((p) => p.explanations.map((e) => ({ title: p.title, ...e })));
  const row = (label, v, tip, strong) => <tr key={label} className={strong ? 'rp-table__total' : ''}><th scope="row">{label}{tip && <HelpTip term={tip} />}</th><td className="ik-num">{eur2(v)}</td></tr>;
  return (
    <div className="rp-bilan">
      <h2>Bilan de {MONTHS[summary.month - 1]} {summary.year}</h2>
      <div className="rp-bilan__grid">
        <div>
          <button type="button" className={`rp-mail ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="rp-letter">
            <span className="rp-mail__env" aria-hidden="true"><i className="rp-mail__flap" /><i className="rp-mail__body" /><i className="rp-mail__paper" /></span>
            <span><strong>Courrier du mois</strong><small>{open ? 'Refermer' : `Ouvrir le courrier de ${MONTHS[summary.month - 1]}`}{lines.length ? ` · ${lines.length} nouvelle${lines.length > 1 ? 's' : ''}` : ''}</small></span>
          </button>
          <div id="rp-letter" className={`rp-letter ${open ? 'is-open' : ''}`} hidden={!open}>
            {lines.length === 0 ? <p>Rien de particulier ce mois-ci : tout s’est déroulé normalement.</p> : lines.map((e, i) => (
              <p key={i}><strong>{e.title}.</strong> {e.message}{e.cashFlowImpact ? ` (${e.cashFlowImpact > 0 ? '+' : ''}${eurText2(e.cashFlowImpact)})` : ''}</p>
            ))}
          </div>
        </div>
        <table className="rp-table rp-table--bilan"><caption className="ik-sr-only">Détail du mois</caption>
          <tbody>
            {row('Loyers encaissés', t.rentCollected, 'loyer')}
            {row('Charges non récupérables', -t.nonRecoverableCharges, 'charges-non-recuperables')}
            {row('Intérêts du crédit', -t.loanInterest, 'interets')}
            {row('Assurance emprunteur', -t.loanInsurance, 'assurance-emprunteur')}
            {row('Capital remboursé (t’enrichit)', -t.loanPrincipal, 'capital-rembourse')}
            {t.gliPremium > 0 && row('Prime d’assurance loyers impayés', -t.gliPremium, 'gli')}
            {t.gliReimbursed > 0 && row('Remboursement de l’assurance', t.gliReimbursed, 'gli')}
            {row('Impôt sur les loyers', -t.rentTax, 'impot-loyers')}
            {row('Résultat du mois', t.netCashFlow, 'cash-flow', true)}
          </tbody>
        </table>
      </div>
      <h3>Journal des événements</h3>
      {events?.length ? (
        <ol className="rp-timeline">
          {events.slice(0, 30).map((e, i) => { const tone = kindTone(e.kind); return (
            <li key={`${e.year}-${e.month}-${e.kind}-${e.propertyId}-${i}`} className={`rp-tl rp-tl--${tone}`}><span className="rp-tl__dot"><Icon name={kindIcon[tone]} size={14} /></span><time>{e.month}/{e.year}</time><p>{e.message}</p></li>
          ); })}
        </ol>
      ) : <p className="ik-muted">Aucun événement pour l’instant.</p>}
    </div>
  );
}

export function Leaderboard({ game, notify }) {
  const [year, setYear] = useState(game.year);
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    call(`/leaderboard?year=${year}`).then((d) => { if (alive) setData(d); }).catch((e) => notify(e.message, true));
    return () => { alive = false; };
  }, [year, game.month, notify]);
  const years = []; for (let y = 2010; y <= game.year; y += 1) years.push(y);
  if (!data) return <Skeleton height={240} />;
  const p = (n) => `${n > 0 ? '+' : ''}${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
  return (
    <div className="rp-board">
      <h2>Classement Immobilier<HelpTip term="performance" /></h2>
      <p className="ik-muted">Il compare la performance de chaque joueur à la même année de jeu : Le gain compté est celui que tu aurais net de revente : prix de vente moins l’agence, les diagnostics, les frais de remboursement anticipé, l’impôt sur la plus-value et, pour un bien loué, la décote de 10 % des biens occupés. Il est rapporté au capital de départ de ton compte (10 000 en gratuit, 20 000 avec Pro). Les intérêts d’un prêt personnel sont déduits et le levier utilisé est affiché. Pour être classé, il faut avoir investi au moins {data.mine?.minCapitalCoins ?? data.minCapital} <Coin /> et avoir joué au moins 5 jours différents.</p>
      <label className="rp-field rp-field--inline"><span>Année de comparaison</span><select className="ik-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
      <RankingProgress progress={data.progress} />
      {data.mine && (
        <div className={`rp-banner ${data.mine.ranked ? 'rp-banner--ok' : 'rp-banner--warn'}`}>
          <div><strong>Ma performance : {p(data.mine.performancePct)}</strong>
            <p>Investi {eur(data.mine.investedEuros)} · valeur nette de revente {eur(data.mine.liquidationValueEuros)} · flux encaissés {eur(data.mine.cumulativeCashFlow + data.mine.saleNetProceeds)}{data.mine.bankDebtEuros > 0 && <> · dette bancaire {eur(data.mine.bankDebtEuros)} (intérêts payés {eur(data.mine.bankInterestPaidEuros)}) · <strong>levier ×{data.mine.leverage}</strong></>}</p>
            {data.me && <p>Ton rang en {year} : n°{data.me.rank} sur {data.totalRanked}.</p>}</div>
        </div>
      )}
      {data.entries.length === 0 ? <p className="ik-muted">Personne n’est encore classé pour {year}.</p> : (
        <table className="rp-table"><caption className="ik-sr-only">Classement {year}</caption>
          <thead><tr><th scope="col">Rang</th><th scope="col">Joueur</th><th scope="col" className="ik-num">Levier<HelpTip term="levier" /></th><th scope="col" className="ik-num">Performance</th></tr></thead>
          <tbody>{data.entries.map((e) => <tr key={e.rank + e.username} className={e.isMe ? 'is-me' : ''}><td><Medal rank={e.rank} /></td><td>{e.username}{e.isMe ? ' (toi)' : ''}</td><td className="ik-num">{e.leverage && e.leverage > 1 ? `×${Number(e.leverage).toLocaleString('fr-FR')}` : '×1'}</td><td className="ik-num">{p(e.performancePct)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
