'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHead, Delta, EmptyState, Button, Skeleton } from '@/app/components/ui/primitives';
import { Sparkline } from '@/app/components/ui/charts';
import { keepGenuineSparklines } from '@/app/lib/sparklines';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const usd = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

// Onglet Marché : uniquement les cours RÉELS du marché Crypto simulé du joueur (mêmes sources que le bandeau).
// Aucune valeur en dur. Sans compte Crypto ou sans réponse du serveur : état vide honnête.
export default function MarketTab() {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await fetch(`${API}/crypto/state`);
        if (!st.ok) throw new Error('state');
        const s = await st.json();
        if (!s.hasAccount || !s.dataReady) { if (alive) setState({ status: 'empty', items: [] }); return; }
        const res = await fetch(`${API}/crypto/assets?sort=marketCap`);
        if (!res.ok) throw new Error('assets');
        const { assets } = await res.json();
        const top = assets.filter((a) => !a.stable && !a.collapsed).slice(0, 8);
        const raw = await Promise.all(top.map(async (a) => {
          let series = [];
          try {
            const r = await fetch(`${API}/crypto/candles?symbol=${encodeURIComponent(a.symbol)}&tf=1d&limit=30`);
            if (r.ok) series = (await r.json()).candles.map((k) => k.c);
          } catch { /* courbe absente : la carte s'affiche quand même */ }
          return { symbol: a.symbol, name: a.name, price: a.price, change: a.change1d, series };
        }));
        const items = keepGenuineSparklines(raw);   // courbe retirée si elle ne vient pas d'une vraie série propre à l'actif
        if (alive) setState({ status: items.length ? 'ok' : 'empty', items });
      } catch {
        if (alive) setState({ status: 'error', items: [] });
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="dash-overview">
      <Card>
        <CardHead
          title="Marché Crypto"
          icon="candles"
          actions={<Button size="sm" href="/crypto">Ouvrir le marché</Button>}
        />
        <p className="ik-muted" style={{ margin: '0 0 16px', fontSize: 'var(--ik-fs-sm)' }}>
          Cours historiques, rejoués à ta date de jeu (ils ne sont pas en direct).
        </p>
        {state.status === 'loading' && (
          <div className="dash-market">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} style={{ borderRadius: 16 }} />)}
          </div>
        )}
        {state.status === 'ok' && (
          <div className="dash-market">
            {state.items.map((t) => (
              <Link key={t.symbol} className="dash-market__item" href="/crypto">
                <span className="dash-market__head">
                  <strong>{t.symbol}</strong>
                  <span className="ik-muted">{t.name}</span>
                </span>
                <span className="dash-market__price ik-num">{usd.format(t.price)}</span>
                <span className="dash-market__foot">
                  <Delta value={t.change} />
                  <Sparkline values={t.series} width={84} height={26} />
                </span>
              </Link>
            ))}
          </div>
        )}
        {state.status === 'empty' && (
          <EmptyState icon="candles" title="Aucun cours à afficher pour l'instant" action={<Button href="/crypto">Ouvrir le marché Crypto</Button>}>
            Le marché Crypto n&apos;est pas encore activé sur ton compte, ou ses données ne sont pas importées.
          </EmptyState>
        )}
        {state.status === 'error' && (
          <EmptyState icon="alert" title="Cours momentanément indisponibles">
            Le serveur n&apos;a pas répondu. Réessaie dans un instant.
          </EmptyState>
        )}
      </Card>
      <Card>
        <CardHead title="Bourse et Immobilier" icon="chart" />
        <p className="ik-muted" style={{ margin: 0 }}>
          Les indices boursiers et les références immobilières ne sont pas disponibles pour l&apos;instant : aucune source de données fiable n&apos;est branchée, donc rien n&apos;est affiché.
        </p>
      </Card>
    </div>
  );
}
