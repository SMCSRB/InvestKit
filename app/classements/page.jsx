'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import { Button, Card, CardHead, EmptyState, Skeleton, Tabs } from '@/app/components/ui/primitives';
import HelpTip from '@/app/components/HelpTip';
import PlayerName from '@/app/components/social/PlayerName';

const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = ['monde', 'amis', 'guilde'];
const DOMAINES = {
  bourse: { label: 'Bourse', path: '/trading/leaderboard?domain=stocks', go: '/dashboard?tab=trading', goLabel: 'Ouvrir la Bourse' },
  crypto: { label: 'Crypto', path: '/crypto/leaderboard', go: '/crypto', goLabel: 'Ouvrir le marché Crypto' },
  immobilier: { label: 'Immobilier', path: '/realestate/leaderboard', go: '/immobilier', goLabel: 'Ouvrir l’Immobilier' },
};
const MEDALS = ['🥇', '🥈', '🥉'];
const fr = (n) => Number(n).toLocaleString('fr-FR');
const pct = (n) => `${n > 0 ? '+' : ''}${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

async function api(path) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Erreur de chargement'); e.status = res.status; throw e; }
  return data;
}

// Charge une adresse du serveur ; renvoie { data, error, loading } et se recharge si l'adresse change.
function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null, loading: true });
    api(path).then((data) => alive && setState({ data, error: null, loading: false })).catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
  }, [path]);
  return state;
}

const Rank = ({ rank }) => <span aria-label={`Rang ${rank}`}>{MEDALS[rank - 1] || rank}</span>;

function Loading() { return <Skeleton height={220} style={{ borderRadius: 16 }} />; }

// ── Monde : les meilleurs joueurs de chaque domaine (classements réels du serveur) ──
function Monde({ domaine, onDomaine }) {
  const d = DOMAINES[domaine];
  const { data, error, loading } = useApi(d.path);
  // Pas encore de partie dans ce domaine : le serveur répond 403, 404 ou 409 selon le domaine.
  const notStarted = error && [403, 404, 409].includes(error.status);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Tabs ariaLabel="Domaine du classement" value={domaine} onChange={onDomaine} tabs={Object.entries(DOMAINES).map(([value, v]) => ({ value, label: v.label }))} />
      {loading && <Loading />}
      {!loading && error && (
        <Card>
          <EmptyState icon="trophy" title={notStarted ? `Tu n’as pas encore commencé ${d.label}` : 'Classement indisponible'} action={<Button variant="primary" href={d.go}>{d.goLabel}</Button>}>
            {notStarted
              ? 'Le classement compare les joueurs d’un même domaine, à la même date de jeu. Lance ta partie pour apparaître dedans.'
              : error.message}
          </EmptyState>
        </Card>
      )}
      {!loading && data && (
        <Card>
          <CardHead title={`Classement ${d.label} · ${data.period ? `mois ${data.period}` : `année ${data.year}`}`} icon="trophy" help={<HelpTip term="performance" />} />
          <p className="ik-muted" style={{ margin: '0 0 12px', fontSize: 'var(--ik-fs-sm)' }}>
            Les joueurs sont comparés à la même date de jeu, en pourcentage et net de dettes. Il faut avoir engagé au moins {fr(data.minCapital ?? data.mine?.minCapitalCoins ?? 100)} 🪙 pour être classé.
          </p>
          {data.me
            ? <p data-testid="mon-rang"><strong>Ton rang : n°{data.me.rank}</strong> sur {fr(data.totalRanked)} · {pct(data.me.performancePct)}</p>
            : <p className="ik-muted" data-testid="mon-rang">Tu n’es pas encore classé dans ce domaine à cette date.</p>}
          {data.entries.length === 0
            ? <p className="ik-muted">Personne n’est encore classé.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table className="cl-table" data-testid="classement-monde">
                  <caption className="ik-sr-only">Classement {d.label}</caption>
                  <thead><tr><th scope="col">Rang</th><th scope="col">Joueur</th><th scope="col" className="ik-num">Levier</th><th scope="col" className="ik-num">Performance</th></tr></thead>
                  <tbody>{data.entries.map((e) => (
                    <tr key={`${e.rank}-${e.username}`} className={e.isMe ? 'is-me' : ''}>
                      <td><Rank rank={e.rank} /></td>
                      <td><PlayerName name={e.username} pro={e.pro} isMe={e.isMe} showTag={false} /></td>
                      <td className="ik-num">{e.leverage && e.leverage > 1 ? `×${Number(e.leverage).toLocaleString('fr-FR')}` : '—'}</td>
                      <td className="ik-num" style={{ color: e.performancePct >= 0 ? 'var(--ik-positive)' : 'var(--ik-negative)' }}>{pct(e.performancePct)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
        </Card>
      )}
    </div>
  );
}

// ── Amis : moi + mes amis, par XP d’éducation ──
function Amis() {
  const { data, error, loading } = useApi('/social/friends/ranking');
  if (loading) return <Loading />;
  if (error) return <Card><EmptyState icon="users" title="Classement indisponible">{error.message}</EmptyState></Card>;
  if (data.friendsCount === 0) {
    return <Card><EmptyState icon="users" title="Pas encore d’ami à comparer" action={<Button variant="primary" href="/friends?tab=add">Ajouter un ami</Button>}>Échange ton code ami avec quelqu’un : vous comparerez votre niveau et votre XP d’éducation.</EmptyState></Card>;
  }
  return (
    <Card>
      <CardHead title="Classement entre amis" icon="users" />
      <p className="ik-muted" style={{ margin: '0 0 12px', fontSize: 'var(--ik-fs-sm)' }}>Toi et tes amis, classés par XP d’éducation. Seuls le nom de joueur, le niveau et l’XP sont visibles.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="cl-table" data-testid="classement-amis">
          <caption className="ik-sr-only">Classement entre amis</caption>
          <thead><tr><th scope="col">Rang</th><th scope="col">Joueur</th><th scope="col" className="ik-num">Niveau</th><th scope="col" className="ik-num">XP</th></tr></thead>
          <tbody>{data.entries.map((e) => (
            <tr key={e.userId} className={e.isMe ? 'is-me' : ''}><td><Rank rank={e.rank} /></td><td><PlayerName name={e.name} tag={e.tag} pro={e.pro} isMe={e.isMe} /></td><td className="ik-num">{e.level}</td><td className="ik-num">{fr(e.xp)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Guilde : les membres de ma guilde, par XP d’éducation ──
function Guilde() {
  const { data, error, loading } = useApi('/social/guild');
  if (loading) return <Loading />;
  if (error) return <Card><EmptyState icon="crown" title="Classement indisponible">{error.message}</EmptyState></Card>;
  const g = data.guild;
  if (!g) return <Card><EmptyState icon="crown" title="Tu n’as pas de guilde" action={<Button variant="primary" href="/friends?tab=guild">Créer ou rejoindre une guilde</Button>}>Une guilde réunit jusqu’à quelques joueurs qui se comparent entre eux, par XP d’éducation.</EmptyState></Card>;
  return (
    <Card>
      <CardHead title={`Guilde « ${g.name} »`} icon="crown" actions={<span className="ik-chip">{g.members.length} / {g.memberCap} membres</span>} />
      <p className="ik-muted" style={{ margin: '0 0 12px', fontSize: 'var(--ik-fs-sm)' }}>XP total de la guilde : <strong className="ik-num">{fr(g.totalXp)}</strong>. Classement interne par XP d’éducation. <Link href="/friends?tab=guild" className="ik-link">Gérer ma guilde</Link></p>
      <div style={{ overflowX: 'auto' }}>
        <table className="cl-table" data-testid="classement-guilde">
          <caption className="ik-sr-only">Classement de la guilde {g.name}</caption>
          <thead><tr><th scope="col">Rang</th><th scope="col">Joueur</th><th scope="col" className="ik-num">Niveau</th><th scope="col" className="ik-num">XP</th></tr></thead>
          <tbody>{g.members.map((m) => (
            <tr key={m.userId} className={m.isMe ? 'is-me' : ''}><td><Rank rank={m.rank} /></td><td><PlayerName name={m.name} tag={m.tag} pro={m.pro} isMe={m.isMe} />{m.role === 'owner' ? ' 👑' : ''}</td><td className="ik-num">{m.level ?? '—'}</td><td className="ik-num">{m.xp === undefined ? '—' : fr(m.xp)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  );
}

function ClassementsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'monde';
  const domaine = Object.prototype.hasOwnProperty.call(DOMAINES, params.get('domaine')) ? params.get('domaine') : 'bourse';
  useEffect(() => { if (!localStorage.getItem('token')) router.push('/login'); }, [router]);
  const go = useCallback((t, dom) => router.replace(`/classements?tab=${t}${t === 'monde' ? `&domaine=${dom ?? domaine}` : ''}`, { scroll: false }), [router, domaine]);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Tabs ariaLabel="Type de classement" value={tab} onChange={(t) => go(t)} tabs={[{ value: 'monde', label: 'Monde' }, { value: 'amis', label: 'Amis' }, { value: 'guilde', label: 'Guilde' }]} />
      <div key={tab + (tab === 'monde' ? domaine : '')} className="dash-tabpanel">
        {tab === 'monde' && <Monde domaine={domaine} onDomaine={(dom) => go('monde', dom)} />}
        {tab === 'amis' && <Amis />}
        {tab === 'guilde' && <Guilde />}
      </div>
    </div>
  );
}

export default function ClassementsPage() {
  return (
    <AppShell>
      <PageHeader title="Classements" subtitle="Compare-toi aux autres joueurs, à tes amis et aux membres de ta guilde." />
      <Suspense fallback={null}><ClassementsContent /></Suspense>
    </AppShell>
  );
}
