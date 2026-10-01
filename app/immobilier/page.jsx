'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import HelpTip from '@/app/components/HelpTip';
import { Button, Card, Segmented, Tabs } from '@/app/components/ui/primitives';
import Search, { DEFAULT_SEARCH } from '@/app/components/immo/Search';
import Detail from '@/app/components/immo/Detail';
import { OwnedList, PropertySheet } from '@/app/components/immo/Owned';
import { Leaderboard, Summary } from '@/app/components/immo/Bilan';
import { ImmoModeProvider, useImmoMode } from '@/app/components/immo/bits';
import { MONTHS, call, eur } from '@/app/components/immo/api';

// Immobilier façon portail d'annonces : Chercher → fiche → simuler → acheter, puis Mes biens (gestion locative), Bilan du mois, Classement.
// Toute la logique et tous les calculs restent côté serveur (aucune règle du jeu n'est dans ce fichier).
const TABS = ['chercher', 'biens', 'bilan', 'classement'];

function StartScreen({ profiles, onStart, busy }) {
  return (
    <div className="rp-start rp-enter">
      <h2>Commence ta partie Immobilier</h2>
      <p className="ik-muted">Choisis ta situation de départ : elle décide de tes revenus, et donc de ce que la banque acceptera de te prêter. Tu joues en mode accéléré.</p>
      <div className="rp-start__grid">
        {profiles.map((p) => (
          <Card key={p.id} className="rp-start__card">
            <h3>{p.label}</h3>
            <p>Revenus : <strong>{eur(p.netMonthlyIncome)}</strong>/mois<br />Dépenses courantes : {eur(p.livingCharges)}/mois</p>
            <Button variant="primary" loading={busy} disabled={busy} onClick={() => onStart(p.id)}>Choisir ce profil</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ImmoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { advanced, setAdvanced } = useImmoMode();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(null);
  const [needStart, setNeedStart] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState(DEFAULT_SEARCH);
  const notify = useCallback((msg, isError) => { setToast({ msg, isError, k: Date.now() }); setTimeout(() => setToast((t) => (t && Date.now() - t.k > 6500 ? null : t)), 7000); }, []);

  const tab = TABS.includes(params.get('onglet')) ? params.get('onglet') : 'chercher';
  const listingId = params.get('bien');
  const propertyId = params.get('propriete');
  const go = useCallback((q) => { const u = new URLSearchParams(q); router.push(`/immobilier${u.toString() ? `?${u}` : ''}`, { scroll: false }); }, [router]);
  const goTab = (t) => go(t === 'chercher' ? {} : { onglet: t });

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

  const start = async (profile) => { setBusy(true); try { await call('/start', 'POST', { profile }); await refresh(); } catch (e) { notify(e.message, true); } setBusy(false); };
  const advance = async (months) => {
    setBusy(true);
    try {
      const r = await call('/time/advance', 'POST', { months });
      const warnings = (r.settled || []).flatMap((s) => s.warnings || []);
      await refresh();
      if (warnings.length) notify(warnings[warnings.length - 1].message, true); else notify(months === 1 ? 'Un mois passe : ton bilan est à jour.' : 'Un an passe : de nouvelles annonces sont disponibles.');
    } catch (e) { notify(e.message, true); }
    setBusy(false);
  };
  const act = useCallback(async (fn, okMsg) => { setBusy(true); try { const r = await fn(); notify(r?.message || okMsg); await refresh(); } catch (e) { notify(e.message, true); } setBusy(false); }, [notify, refresh]);

  const game = state?.game;
  const ownedCount = portfolio?.properties.length ?? 0;
  const tabDefs = useMemo(() => [
    { value: 'chercher', label: 'Chercher' },
    { value: 'biens', label: `Mes biens${ownedCount ? ` (${ownedCount})` : ''}` },
    { value: 'bilan', label: 'Bilan du mois' },
    { value: 'classement', label: 'Classement' },
  ], [ownedCount]);

  if (!ready) return null;
  const ownedProperty = propertyId ? portfolio?.properties.find((p) => p.id === propertyId) : null;

  let content = null;
  if (needStart && state?.profiles) content = <StartScreen profiles={state.profiles} onStart={start} busy={busy} />;
  else if (game && portfolio) {
    if (listingId) content = <Detail key={listingId} listingId={listingId} game={game} balance={state.balance} access={state.access} eurosPerCoin={state.eurosPerCoin} refresh={refresh} notify={notify} onBack={() => go({})} onBought={() => go({ onglet: 'biens' })} />;
    else if (propertyId) content = <PropertySheet p={ownedProperty} data={portfolio} game={game} onBack={() => go({ onglet: 'biens' })} refresh={refresh} notify={notify} act={act} busy={busy} />;
    else if (tab === 'chercher') content = <Search state={search} setState={setSearch} onOpen={(id) => go({ bien: id })} notify={notify} game={game} />;
    else if (tab === 'biens') content = <OwnedList data={portfolio} summary={summary} game={game} onOpen={(id) => go({ propriete: id })} act={act} busy={busy} goSearch={() => go({})} />;
    else if (tab === 'bilan') content = <Summary summary={summary} events={events} />;
    else content = <Leaderboard game={game} notify={notify} />;
  }

  return (
    <AppShell>
      <div className="rp">
        <PageHeader title="Immobilier" subtitle="Cherche un bien, simule ton financement, achète et gère-le."
          actions={game && (
            <>
              <span className="rp-date" title="Mode accéléré : un mois passe quand tu le décides"><strong>{MONTHS[game.month - 1]} {game.year}</strong><HelpTip term="mode-accelere" /></span>
              <span className="rp-balance">{Number(state.balance).toLocaleString('fr-FR')} 🪙<HelpTip term="investcoin" /></span>
              <Button variant="primary" size="sm" icon="calendar" loading={busy} disabled={busy} onClick={() => advance(1)}>Avancer d’un mois</Button>
              <Button size="sm" disabled={busy} onClick={() => advance(12)}>Avancer d’un an</Button>
            </>
          )} />

        {game && (
          <div className="rp-nav">
            <Tabs tabs={tabDefs} value={listingId ? 'chercher' : propertyId ? 'biens' : tab} onChange={goTab} ariaLabel="Sections de l’Immobilier" />
            <div className="rp-mode"><span className="ik-muted">Affichage</span><Segmented ariaLabel="Mode d’affichage" value={advanced ? 'adv' : 'simple'} onChange={(v) => setAdvanced(v === 'adv')} options={[{ value: 'simple', label: 'Simple' }, { value: 'adv', label: 'Avancé' }]} /></div>
          </div>
        )}

        {toast && <div role={toast.isError ? 'alert' : 'status'} className={`rp-toast ${toast.isError ? 'is-bad' : 'is-ok'}`} key={toast.k}>{toast.msg}</div>}
        {state && !state.access?.canBuy && game && <div className="rp-banner rp-banner--warn">🔒 Tu peux consulter le domaine Immobilier, mais l’achat demande de l’avoir choisi comme domaine gratuit ou d’avoir l’abonnement Pro.</div>}
        {content}
        <p className="rp-foot"><Link href="/banque">🏦 Ma banque</Link></p>
      </div>
    </AppShell>
  );
}

export default function ImmobilierPage() {
  return <ImmoModeProvider><Suspense fallback={null}><ImmoInner /></Suspense></ImmoModeProvider>;
}
