'use client';

import { useState } from 'react';
import AppShell, { PageHeader } from '@/app/components/shell/AppShell';
import Icon, { ICON_NAMES } from '@/app/components/ui/Icon';
import { Button, Card, CardHead, Coin, Delta, EmptyState, Modal, Segmented, Skeleton, StatCard, Switch, Tabs } from '@/app/components/ui/primitives';
import { Donut, LineChart, SegmentedBar, Sparkline, StackedArea, StackedBars } from '@/app/components/ui/charts';
import { Reveal } from '@/app/components/ui/motion';
import { useTheme } from '@/app/context/ThemeContext';
import { fmtInt } from '@/app/lib/format';

// Valeurs d'EXEMPLE uniquement (cette page n'existe pas en production).
const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];
const LINE_A = [120, 135, 128, 160, 152, 190, 210, 198, 240, 262, 255, 290];
const LINE_B = [80, 82, 95, 90, 110, 118, 112, 130, 128, 150, 160, 158];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const STACK = [[2, 1, 1], [3, 2, 1], [2, 2, 2], [4, 2, 2], [3, 3, 2], [4, 3, 3], [5, 3, 3]].map((p, i) => ({ label: YEARS[i], parts: p.map((x) => x * 1000) }));
const fmt = fmtInt;

const Swatch = ({ name, varName }) => (
  <div style={{ display: 'grid', gap: 6 }}>
    <div style={{ height: 52, borderRadius: 12, background: `var(${varName})`, border: '1px solid var(--ik-border)' }} />
    <span className="ik-muted" style={{ fontSize: 12 }}>{name}</span>
  </div>
);

export default function DesignSystemClient() {
  const { theme, toggleTheme, motion, setMotion } = useTheme();
  const [period, setPeriod] = useState('1A');
  const [tab, setTab] = useState('bourse');
  const [modal, setModal] = useState(false);
  const [anim, setAnim] = useState(true);

  return (
    <AppShell>
      <PageHeader
        title="Design system"
        subtitle="Composants communs du nouveau thème. Page de développement : les valeurs sont des exemples."
        actions={<>
          <Button icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme}>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</Button>
          <Button variant="primary" icon="plus" onClick={() => setModal(true)}>Ouvrir une fenêtre</Button>
        </>}
      />

      <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        <Reveal index={0}><StatCard label="Patrimoine total" icon="wallet" value={325980} format={fmt} unit={<Coin size={26} />} delta={12} deltaLabel="sur l'année (exemple)" hero /></Reveal>
        <Reveal index={1}><StatCard label="Investi" icon="chart" value={270560} format={fmt} unit={<Coin size={26} />} delta={20} deltaLabel="exemple" href="#" /></Reveal>
        <Reveal index={2}><StatCard label="Plus-values" icon="trendUp" value={55420} format={fmt} unit={<Coin size={26} />} delta={-3.2} deltaLabel="exemple" /></Reveal>
        <Reveal index={3}><StatCard label="Jours actifs" icon="calendar" value={7} format={(v) => `${Math.round(v)} jours`} deltaLabel="sans pénalité" /></Reveal>
      </div>

      <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', marginTop: 16 }}>
        <Reveal index={0} className="ik-span-2">
          <Card glow>
            <CardHead title="Évolution de la valeur" icon="chart" actions={<Segmented ariaLabel="Période" value={period} onChange={setPeriod} options={['1S', '1M', '3M', '6M', 'YTD', '1A', 'Tout'].map((v) => ({ value: v, label: v }))} />} />
            <LineChart labels={MONTHS} series={[{ label: 'Actions', color: 'var(--ik-series-1)', data: LINE_A }, { label: 'Obligations', color: 'var(--ik-series-2)', data: LINE_B }]} format={(v) => `${fmt(v)} k`} ariaLabel="Évolution de la valeur par mois (exemple)" />
          </Card>
        </Reveal>
        <Reveal index={2} className="ik-span-2">
          <Card glow>
            <CardHead title="Patrimoine par domaine (exemple)" icon="chart" />
            <div data-testid="stacked-area-demo">
              <StackedArea labels={MONTHS} series={[{ label: 'Liquidités', color: 'var(--ik-series-1)', data: LINE_A }, { label: 'Titres', color: 'var(--ik-series-2)', data: LINE_B }, { label: 'Crypto', color: 'var(--ik-series-3)', data: LINE_B.map((v) => Math.round(v / 2)) }]} format={(v) => `${fmt(v)} k`} xEvery={2} ariaLabel="Patrimoine par domaine au fil des mois (exemple)" />
            </div>
          </Card>
        </Reveal>
        <Reveal index={1}>
          <Card glow>
            <CardHead title="Répartition" icon="pie" />
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Donut segments={[{ label: 'Actions', value: 65, color: 'var(--ik-series-1)' }, { label: 'Obligations', value: 25, color: 'var(--ik-series-2)' }, { label: 'Fonds', value: 10, color: 'var(--ik-series-3)' }]} ariaLabel="Répartition : actions 65 %, obligations 25 %, fonds 10 % (exemple)">
                <div><div className="ik-num" style={{ fontWeight: 800, fontSize: 22 }}>3</div><div className="ik-muted">classes</div></div>
              </Donut>
              <div style={{ flex: 1, minWidth: 160, display: 'grid', gap: 12 }}>
                <SegmentedBar segments={[{ label: 'Actions', value: 65, color: 'var(--ik-series-1)' }, { label: 'Obligations', value: 25, color: 'var(--ik-series-2)' }, { label: 'Fonds', value: 10, color: 'var(--ik-series-3)' }]} />
                {[['Actions', '65 %', 'var(--ik-series-1)'], ['Obligations', '25 %', 'var(--ik-series-2)'], ['Fonds', '10 %', 'var(--ik-series-3)']].map(([l, v, c]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ik-dot" style={{ background: c }} />{l}<strong className="ik-num" style={{ marginLeft: 'auto' }}>{v}</strong></div>
                ))}
              </div>
            </div>
          </Card>
        </Reveal>
        <Reveal index={2} className="ik-span-2">
          <Card glow>
            <CardHead title="Profits par année" icon="bars" />
            <StackedBars rows={STACK} keys={[{ label: 'Actions', color: 'var(--ik-series-1)' }, { label: 'Obligations', color: 'var(--ik-series-2)' }, { label: 'Fonds', color: 'var(--ik-series-3)' }]} format={(v) => fmt(v)} ariaLabel="Profits par année (exemple)" />
          </Card>
        </Reveal>
      </div>

      <div className="ik-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginTop: 16 }}>
        <Card>
          <CardHead title="Boutons et contrôles" icon="layout" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Button variant="primary">Principal</Button><Button>Secondaire</Button><Button variant="ghost">Discret</Button><Button variant="danger">Danger</Button><Button variant="primary" loading>Chargement</Button><Button disabled>Désactivé</Button>
          </div>
          <Tabs ariaLabel="Domaines" value={tab} onChange={setTab} tabs={[{ value: 'bourse', label: 'Bourse' }, { value: 'crypto', label: 'Crypto' }, { value: 'immo', label: 'Immobilier' }]} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <Switch checked={anim} onChange={setAnim} label="Interrupteur d'exemple" /> <span>Interrupteur</span>
            <Delta value={4.25} /> <Delta value={-1.8} /> <Delta value={0} />
            <Sparkline values={[3, 4, 3.6, 5, 4.8, 6.2, 7]} /> <Sparkline values={[7, 6, 6.4, 5, 5.2, 4]} />
          </div>
          <div className="ik-field" style={{ marginTop: 16 }}>
            <label className="ik-label" htmlFor="ds-input">Champ de saisie</label>
            <input id="ds-input" className="ik-input" placeholder="Ex. 1 000" />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <span className="ik-chip">Pastille</span><span className="ik-chip ik-chip--example">Exemple</span><span className="ik-chip ik-chip--soon">Bientôt</span>
            <span className="ik-muted">Animations :</span>
            <Segmented ariaLabel="Animations" value={motion} onChange={setMotion} options={[{ value: 'auto', label: 'Auto' }, { value: 'on', label: 'Oui' }, { value: 'off', label: 'Non' }]} />
          </div>
        </Card>
        <Card>
          <CardHead title="Tableau" icon="file" />
          <div className="ik-table-wrap"><table className="ik-table"><thead><tr><th>Actif</th><th className="is-num">Quantité</th><th className="is-num">Valeur</th><th className="is-num">Variation</th></tr></thead><tbody>
            {[['Actif A', 12, 4800, 3.4], ['Actif B', 40, 2100, -1.2], ['Actif C', 5, 9600, 0.6]].map(([n, q, v, d]) => (<tr key={n}><td>{n}</td><td className="is-num">{q}</td><td className="is-num">{fmt(v)} <Coin size={14} /></td><td className="is-num"><Delta value={d} /></td></tr>))}
          </tbody></table></div>
        </Card>
        <Card>
          <CardHead title="Chargement et état vide" icon="clock" />
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}><Skeleton height={22} width="60%" /><Skeleton height={14} /><Skeleton height={14} width="85%" /></div>
          <EmptyState icon="target" title="Aucun investissement pour l'instant" action={<Button variant="primary" size="sm">Commencer</Button>}>Quand tu achèteras un actif, il apparaîtra ici avec sa performance.</EmptyState>
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <CardHead title="Palette" icon="sparkles" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 14 }}>
          {[['Fond', '--ik-bg'], ['Carte', '--ik-surface-1'], ['Carte 2', '--ik-surface-2'], ['Primaire', '--ik-primary'], ['Accent', '--ik-accent'], ['Orchidée', '--ik-orchid'], ['Positif', '--ik-positive'], ['Négatif', '--ik-negative'], ['Alerte', '--ik-warning'], ['Série 1', '--ik-series-1'], ['Série 2', '--ik-series-2'], ['Série 3', '--ik-series-3'], ['Série 4', '--ik-series-4'], ['Série 5', '--ik-series-5']].map(([n, v]) => <Swatch key={v} name={n} varName={v} />)}
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHead title="Icônes" icon="layout" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10 }}>
          {ICON_NAMES.map((n) => <div key={n} style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: 10, borderRadius: 12, background: 'var(--ik-surface-2)' }}><Icon name={n} size={22} /><span className="ik-muted" style={{ fontSize: 11 }}>{n}</span></div>)}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Fenêtre d'exemple" footer={<><Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button variant="primary" onClick={() => setModal(false)}>Confirmer</Button></>}>
        <p style={{ margin: 0, color: 'var(--ik-text-2)' }}>Échap ferme la fenêtre, le focus reste dans la fenêtre et revient au bouton d&apos;origine.</p>
      </Modal>
    </AppShell>
  );
}
