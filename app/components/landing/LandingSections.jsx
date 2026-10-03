'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Button, Card, Coin, Segmented } from '@/app/components/ui/primitives';
import { AnimatedNumber, Reveal } from '@/app/components/ui/motion';
import { Donut, SegmentedBar } from '@/app/components/ui/charts';
import { BILLING_OPEN, PLANS, PRICES, formatEuro, yearlySavingPct } from '@/app/lib/plans';
import { GLOSSARY } from '@/app/lib/glossaire';
import { SITE_INFO } from '@/app/lib/siteInfo';
import { AVAILABLE_DOMAINS as AVAILABLE, CRYPTO_ASSET_COUNT, countWord } from '@/app/lib/siteFacts';
import useVisitor from './useVisitor';

// Les chiffres affichés sont des comptes réels (glossaire, catalogue) ; aucun nombre d'utilisateurs ni témoignage.

export function InviteNote() {
  const { inviteOnly, loggedIn } = useVisitor();
  if (!inviteOnly || loggedIn) return null;
  return <p className="lp-hero__note"><Icon name="info" size={16} />Inscription sur invitation pendant la phase de test.</p>;
}

export function HeroActions() {
  const { loggedIn, ctaLabel } = useVisitor();
  return (
    <div className="lp-hero__cta">
      {loggedIn ? (
        <Button variant="primary" size="lg" href="/dashboard">Reprendre là où j&apos;en étais</Button>
      ) : (
        <Button variant="primary" size="lg" href="/signup">{ctaLabel}</Button>
      )}
      <Button size="lg" href="#comment">Voir comment ça marche</Button>
    </div>
  );
}

// Pastilles sous l'accroche : on voit tout de suite qu'il y a plusieurs domaines, et que d'autres arrivent.
export function HeroDomains() {
  return (
    <div className="lp-pills" aria-label="Domaines disponibles">
      {AVAILABLE.map((d) => (
        <a key={d.name} href="#domaines" className="lp-pill"><Icon name={d.icon} size={16} />{d.name}<i className="lp-live" aria-label="disponible" /></a>
      ))}
      <a href="#domaines" className="lp-pill lp-pill--soon" aria-label="D'autres domaines bientôt"><Icon name="plus" size={16} />Bientôt</a>
    </div>
  );
}

// Bande sous l'accroche : les domaines ouverts aujourd'hui et les emplacements des prochains.
export function DomainStrip() {
  return (
    <div className="lp-strip">
      <p className="lp-strip__title"><span className="lp-live" aria-hidden="true" /> {AVAILABLE.length} domaines disponibles aujourd&apos;hui · d&apos;autres arrivent</p>
      <div className="lp-strip__row">
        {AVAILABLE.map((d, i) => (
          <Reveal key={d.name} index={i} className="lp-strip__tile" data-tilt>
            <a href="#domaines">
              <span className="lp-domain__icon"><Icon name={d.icon} size={24} /></span>
              <span className="lp-strip__text"><strong>{d.name}</strong><small>{d.sub}</small></span>
              <span className="lp-status lp-status--on"><i className="lp-live" aria-hidden="true" />Disponible</span>
            </a>
          </Reveal>
        ))}
        {[0, 1].map((i) => (
          <Reveal key={i} index={3 + i} className="lp-strip__tile lp-strip__tile--soon">
            <div>
              <span className="lp-domain__icon"><Icon name="lock" size={22} /></span>
              <span className="lp-strip__text"><strong>Nouveau domaine</strong><small>Bientôt, sans date promise</small></span>
              <span className="lp-status">Bientôt</span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export function Facts() {
  const facts = [
    { v: AVAILABLE.length, label: 'domaines' },
    { v: CRYPTO_ASSET_COUNT, label: 'actifs crypto', plus: true },
    { v: GLOSSARY.length, label: 'termes expliqués au glossaire' },
    { v: 0, label: 'euro réel en jeu', unit: '€' },
  ];
  return (
    <div className="lp-facts">
      {facts.map((f, i) => (
        <Reveal key={f.label} index={i} className="lp-fact">
          <strong>
            <AnimatedNumber value={f.v} />
            {f.plus ? '+' : ''}
            {f.unit ? ` ${f.unit}` : ''}
          </strong>
          <span>{f.label}</span>
        </Reveal>
      ))}
    </div>
  );
}

const STEPS = [
  { t: 'Je m\'inscris', d: 'Avec un code d\'invitation pendant la phase de test. Je choisis mon domaine de départ.' },
  { t: 'Je reçois des InvestCoins', d: 'Une monnaie virtuelle pour jouer. Elle n\'a aucune valeur réelle et ne se retire pas.' },
  { t: 'Je simule comme dans la vraie vie', d: 'Crédit, loyers, impôts, frais, krachs, impayés : les règles ressemblent à la réalité, pas les pertes.' },
  { t: 'J\'apprends et je monte en niveau', d: 'Cours, vocabulaire, quiz, badges et classement m\'aident à comprendre ce que je fais.' },
];

export function HowItWorks() {
  return (
    <>
      <div className="lp-steps">
        {STEPS.map((s, i) => (
          <Reveal key={s.t} index={i} data-tilt>
            <Card className="lp-step" glow>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal className="lp-disclaimer" role="note">
        <Icon name="alert" size={22} />
        <p style={{ margin: 0 }}>
          <strong>C&apos;est une simulation à but éducatif.</strong> Aucun argent réel n&apos;est en jeu, et rien sur ce site n&apos;est un conseil en investissement.
        </p>
      </Reveal>
    </>
  );
}

const DOMAINS = [
  {
    icon: 'building', title: 'Immobilier',
    text: 'Achète un bien avec un prêt, loue-le, gère les travaux et revends-le.',
    points: ['Achat à crédit avec un vrai plan de remboursement', 'Loyers, charges, taxe foncière et impôts', 'Impayés, vacance, rénovation énergétique', 'Revente : prix demandé, délai, plus-value'],
  },
  {
    icon: 'candles', title: 'Crypto',
    text: 'Trade sur un marché historique avec un graphique professionnel.',
    points: ['Ordres au marché, limite, stop et objectif', 'Échanges crypto contre crypto, frais et écarts réalistes', 'Prêt sur portefeuille, appel de marge, liquidation', 'Événements de marché historiques'],
  },
  {
    icon: 'chart', title: 'Bourse et PEA',
    text: 'Découvre les actions, les ETF et l\'enveloppe fiscale du PEA.',
    points: ['Achat et vente avec frais de courtage', 'Fiscalité du PEA et flat tax (PFU)', 'Avance dans le temps année par année', 'Classement entre joueurs'],
  },
];

export function Domains() {
  return (
    <div className="lp-domains">
      {DOMAINS.map((d, i) => (
        <Reveal key={d.title} index={i} className="ik-card ik-card--glow lp-domain" data-tilt>
          <span className="lp-domain__icon"><Icon name={d.icon} size={26} /></span>
          <span className="lp-status lp-status--on" style={{ alignSelf: 'flex-start', marginBottom: 10 }}><i className="lp-live" aria-hidden="true" />Disponible</span>
          <h3>{d.title}</h3>
          <p>{d.text}</p>
          <ul>{d.points.map((p) => <li key={p}><Icon name="check" size={16} />{p}</li>)}</ul>
          <Button size="sm" href="/signup">Essayer {d.title}</Button>
        </Reveal>
      ))}
      <Reveal index={3} className="ik-card lp-domain lp-domain--soon">
        <span className="lp-domain__icon"><Icon name="sparkles" size={26} /></span>
        <span className="lp-status" style={{ alignSelf: 'flex-start', marginBottom: 10 }}>Bientôt</span>
        <h3>D&apos;autres domaines à venir</h3>
        <p>De nouveaux domaines arriveront au fil du temps, avec la même économie d&apos;InvestCoins et le même parcours d&apos;éducation. Aucune date n&apos;est promise.</p>
        <div className="lp-slots" aria-hidden="true"><span /><span /><span /></div>
      </Reveal>
    </div>
  );
}

function FeatureVisual({ kind }) {
  if (kind === 'sim') {
    return (
      <div style={{ display: 'grid', gap: 10, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ik-fs-xs)', fontWeight: 700, color: 'var(--ik-text-3)' }}><span>Mensualité d&apos;un prêt (exemple)</span><span>capital · intérêts</span></div>
        <SegmentedBar segments={[{ label: 'Capital', value: 62, color: 'var(--ik-series-1)' }, { label: 'Intérêts', value: 28, color: 'var(--ik-series-3)' }, { label: 'Assurance', value: 10, color: 'var(--ik-series-2)' }]} />
        <div className="ik-muted">Les intérêts pèsent plus au début du prêt.</div>
      </div>
    );
  }
  if (kind === 'risk') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Donut size={96} thickness={12} segments={[{ label: 'Risque', value: 62, color: 'var(--ik-series-3)' }, { label: 'Marge', value: 38, color: 'var(--ik-surface-3)' }]} ariaLabel="Score de risque d'exemple : 62 sur 100">
          <strong className="ik-num" style={{ fontSize: 22 }}>62</strong>
        </Donut>
        <div style={{ fontSize: 'var(--ik-fs-sm)', color: 'var(--ik-text-2)' }}>Score de risque<br /><span className="ik-muted">exemple, décomposé par cause</span></div>
      </div>
    );
  }
  if (kind === 'time') {
    return (
      <div className="lp-timeline" style={{ width: '100%' }}>
        <div className="lp-timeline__labels"><span>Début</span><span>Aujourd&apos;hui dans le jeu</span><span>Fin</span></div>
        <div className="ik-progress"><div className="ik-progress__bar" style={{ width: '64%' }} /></div>
        <div className="ik-muted">Fais défiler les mois et les années en quelques clics.</div>
      </div>
    );
  }
  if (kind === 'chart') {
    const h = [38, 52, 44, 66, 58, 80, 70, 92];
    return <div className="lp-bars" style={{ width: '100%' }} aria-hidden="true">{h.map((v, i) => <span key={i} style={{ height: `${v}%`, animationDelay: `${i * 70}ms`, opacity: 0.55 + i * 0.06 }} />)}</div>;
  }
  if (kind === 'rank') {
    return (
      <div className="lp-rank">
        {[['Joueur A', 92], ['Joueur B', 74], ['Joueur C', 61]].map(([n, v], i) => (
          <div key={n}><span className="ik-chip" style={{ padding: '2px 8px' }}>{i + 1}</span><div className="ik-progress"><div className="ik-progress__bar" style={{ width: `${v}%`, animationDelay: `${i * 120}ms` }} /></div><span className="ik-muted">{n}</span></div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}><Coin size={26} /> Récompense du jour</div>
      <div className="lp-streak" aria-label="Jusqu'à 3 jours payés par semaine">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <i key={i} className={[0, 2, 4].includes(i) ? 'is-on' : ''}>{d}</i>)}
      </div>
      <span className="ik-muted">Jusqu'à 3 jours payés par semaine, sans série à tenir.</span>
    </div>
  );
}

const FEATURES = [
  { kind: 'sim', t: 'Des simulations réalistes', d: 'Prêts bancaires, taux historiques, fiscalité, événements de marché, et les vrais risques : impayés, krachs, liquidation.' },
  { kind: 'risk', t: 'Analyse de risque et conseils', d: 'Un score de risque décomposé par cause, des crises passées rejouées sur ton portefeuille et des pistes pour l\'optimiser.' },
  { kind: 'time', t: 'Le temps en accéléré', d: 'Avance mois par mois ou année par année sur un historique de marché simulé. Le mode temps réel n\'est pas encore disponible.' },
  { kind: 'chart', t: 'Des graphiques professionnels', d: 'Bougies, volumes, indicateurs, outils de dessin, comparaison d\'actifs et plein écran, comme sur une vraie plateforme.' },
  { kind: 'rank', t: 'Un classement entre joueurs', d: 'Compare ta performance à celle des autres, par domaine, avec un capital minimum pour que le classement reste équitable.' },
  { kind: 'coins', t: 'Une économie d\'InvestCoins', d: 'Une petite récompense du jour (jusqu\'à 3 par semaine, sans série à tenir) et des badges. Les InvestCoins restent virtuels : pas de boutique, pas de retrait, pas d\'échange entre joueurs.' },
];

export function Features() {
  return (
    <div className="lp-features">
      {FEATURES.map((f, i) => (
        <Reveal key={f.t} index={i % 3} className="ik-card ik-card--glow lp-feature" data-tilt>
          <div className="lp-feature__visual"><FeatureVisual kind={f.kind} /></div>
          <h3>{f.t}</h3>
          <p>{f.d}</p>
        </Reveal>
      ))}
    </div>
  );
}

const QUIZ = {
  q: 'Sur un prêt immobilier à taux fixe, que devient la mensualité au fil des années ?',
  options: ['Elle baisse chaque année', 'Elle reste la même', 'Elle augmente avec l\'inflation'],
  right: 1,
  why: 'À taux fixe, la mensualité ne change pas. Ce qui change, c\'est sa composition : au début elle paie surtout des intérêts, à la fin surtout du capital.',
};

export function Education() {
  const [picked, setPicked] = useState(null);
  return (
    <div className="lp-edu">
      <div>
        <span className="lp-eyebrow">Éducation gamifiée</span>
        <h2 className="lp-h2">Comprends ce que tu fais, pas seulement comment le faire.</h2>
        <p className="lp-lead" style={{ marginBottom: 20 }}>Chaque domaine a son parcours, du débutant à l&apos;expert. Tu apprends, puis tu testes tout de suite dans le simulateur.</p>
        <div className="lp-levels">
          {['Débutant', 'Intermédiaire', 'Avancé', 'Expert'].map((l, i) => <span key={l} className={`ik-chip ${i === 0 ? '' : 'ik-chip--soon'}`}>{l}</span>)}
        </div>
        <ul>
          {[
            ['book', 'Cours et chapitres', 'Des leçons courtes, rédigées pour un débutant complet.'],
            ['bookOpen', `${GLOSSARY.length} termes au glossaire`, 'Chaque mot technique a une explication simple et un lien vers le quiz.'],
            ['help', 'Aide « ? » partout', 'Une icône d\'aide à côté des notions difficiles, sans quitter la page.'],
            ['trophy', 'Quiz, niveaux et badges', 'Valide chaque chapitre, gagne des InvestCoins et monte en niveau.'],
          ].map(([ic, t, d]) => (
            <li key={t}><span className="lp-domain__icon"><Icon name={ic} size={20} /></span><span><strong>{t}</strong>{d}</span></li>
          ))}
        </ul>
        <div style={{ marginTop: 26 }}><Button href="/education">Voir le parcours d&apos;éducation</Button></div>
      </div>
      <Reveal className="ik-card ik-card--glow" style={{ padding: 28 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 'var(--ik-fs-md)', lineHeight: 1.4 }}>{QUIZ.q}</h3>
        <div role="group" aria-label="Réponses possibles">
          {QUIZ.options.map((o, i) => {
            const shown = picked !== null;
            return (
              <button key={o} type="button" disabled={shown} onClick={() => setPicked(i)}
                className={`lp-quiz__opt ${shown && i === QUIZ.right ? 'is-right' : ''} ${shown && picked === i && i !== QUIZ.right ? 'is-wrong' : ''}`}>
                <Icon name={shown && i === QUIZ.right ? 'check' : shown && picked === i ? 'x' : 'target'} size={18} />{o}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <p className="lp-quiz__explain" role="status">
            <strong>{picked === QUIZ.right ? 'Bravo ! ' : 'Pas tout à fait. '}</strong>{QUIZ.why}
            <button type="button" className="ik-link" style={{ display: 'block', marginTop: 8, background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => setPicked(null)}>Recommencer</button>
          </p>
        )}
      </Reveal>
    </div>
  );
}

const TRUST = [
  { icon: 'shield', t: 'Comptes protégés', d: 'Double authentification (2FA) disponible, limites de tentatives de connexion et sessions sécurisées.' },
  { icon: 'lock', t: 'Données chiffrées', d: 'Les champs sensibles sont chiffrés (AES-256). Tu peux exporter ou supprimer tes données à tout moment.' },
  { icon: 'info', t: 'Transparence sur la simulation', d: 'InvestCoins virtuels, valeurs de jeu signalées, exemples toujours étiquetés : ici, rien n\'est présenté comme réel quand ça ne l\'est pas.' },
];

export function Trust() {
  return (
    <div className="lp-trusts">
      {TRUST.map((t, i) => (
        <Reveal key={t.t} index={i} className="ik-card lp-trust" data-tilt>
          <span className="lp-domain__icon"><Icon name={t.icon} size={26} /></span>
          <h3>{t.t}</h3>
          <p>{t.d}</p>
        </Reveal>
      ))}
    </div>
  );
}

export function Pricing() {
  const [cycle, setCycle] = useState('monthly');
  const { ctaLabel } = useVisitor();
  const pro = cycle === 'monthly' ? { price: formatEuro(PRICES.monthly), unit: '/ mois' } : { price: formatEuro(PRICES.yearly), unit: '/ an' };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <Segmented ariaLabel="Durée d'abonnement" value={cycle} onChange={setCycle} options={[{ value: 'monthly', label: 'Mensuel' }, { value: 'yearly', label: 'Annuel' }]} />
        <span className="ik-chip">Annuel : environ {yearlySavingPct()} % d&apos;économie</span>
      </div>
      <div className="lp-plans">
        {PLANS.map((p, i) => (
          <Reveal key={p.id} index={i} className={`ik-card ik-card--glow lp-plan ${p.highlight ? 'lp-plan--pro' : ''}`} data-tilt>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>{p.name}</h3>
              {p.highlight && <span className="ik-chip"><Icon name="crown" size={14} />Complet</span>}
            </div>
            <div className="lp-price">{p.highlight ? <>{pro.price}<small>{pro.unit}</small></> : <>0 €<small>pour toujours</small></>}</div>
            <p className="ik-muted" style={{ margin: 0 }}>{p.tagline}</p>
            <ul>{p.features.map((f) => <li key={f}><Icon name="check" size={18} />{f}</li>)}</ul>
            {p.highlight ? (
              BILLING_OPEN ? <Button variant="primary" href="/signup">Choisir Pro</Button> : <Button disabled aria-disabled="true">Bientôt disponible</Button>
            ) : (
              <Button variant="primary" href="/signup">{ctaLabel}</Button>
            )}
          </Reveal>
        ))}
      </div>
      {!BILLING_OPEN && <p className="ik-muted lp-center" style={{ marginTop: 18 }}>Le paiement n&apos;est pas encore ouvert : le plan Pro sera activable depuis ton compte dès qu&apos;il le sera.</p>}
    </>
  );
}

const FAQ = [
  ['Est-ce que j\'investis de l\'argent réel ?', 'Non. InvestKit est un simulateur : tout se joue avec des InvestCoins, une monnaie virtuelle sans valeur réelle. Tu ne peux ni les acheter avec de l\'argent, ni les retirer, ni les échanger avec d\'autres joueurs.'],
  ['Comment fonctionnent les InvestCoins ?', 'Tu reçois un capital de départ à l\'activation de ton compte, puis des récompenses quotidiennes. Tu les dépenses pour simuler tes achats. Un prêt te fait créer des pièces que tu devras rembourser, comme une vraie dette.'],
  ['D\'où viennent les données de marché ?', 'Ce sont des données de simulation. Pour la Bourse, ce sont des séries simplifiées à visée pédagogique, pas des cours réels. Pour la Crypto, le marché est rejoué sur un historique quand il est importé ; sinon, un jeu d\'exemple clairement signalé est utilisé. Les valeurs de jeu non sourcées sont marquées comme telles.'],
  ['Est-ce un conseil en investissement ?', 'Non. Les analyses et pistes d\'optimisation sont des outils d\'apprentissage. Elles ne tiennent pas compte de ta situation réelle et ne remplacent pas un professionnel.'],
  ['Mes données sont-elles en sécurité ?', 'Les mots de passe sont protégés, la double authentification est disponible et les champs sensibles sont chiffrés. Tu peux exporter ou supprimer ton compte depuis « Mes données ». Détails dans la politique de confidentialité.'],
  ['Pourquoi faut-il un code d\'invitation ?', 'InvestKit est en phase de test, réservé à un cercle restreint de testeurs. Les inscriptions ouvriront plus tard. Si tu n\'as pas de code, demande-le via la page de contact.'],
  ['Que change le plan Pro ?', 'Le plan gratuit te donne accès à tout l\'apprentissage et à un domaine de simulation. Le plan Pro ouvre tous les domaines, le portefeuille global et les exports complets. Le paiement n\'est pas encore ouvert.'],
];

export function Faq() {
  return (
    <div className="lp-faq">
      {FAQ.map(([q, a]) => (
        <details key={q}>
          <summary>{q}<Icon name="chevronDown" size={20} /></summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}

export function FinalCta() {
  const { loggedIn, ctaLabel } = useVisitor();
  return (
    <Reveal className="lp-final">
      <h2>Prêt à t&apos;entraîner sans risque ?</h2>
      <p>Rejoins InvestKit, reçois tes premiers InvestCoins et fais ta première simulation en quelques minutes.</p>
      <Button size="lg" href={loggedIn ? '/dashboard' : '/signup'}>{loggedIn ? 'Aller à mon tableau de bord' : ctaLabel}</Button>
      {SITE_INFO.discordUrl && (
        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 'var(--ik-fs-sm)' }}>
          Une question ? <a href={SITE_INFO.discordUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 800 }}>Rejoins-nous sur Discord</a> ou consulte l&apos;<Link href="/support" style={{ color: '#fff', fontWeight: 800 }}>aide</Link>.
        </p>
      )}
    </Reveal>
  );
}
