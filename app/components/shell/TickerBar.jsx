'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Delta } from '@/app/components/ui/primitives';
import { Sparkline } from '@/app/components/ui/charts';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const CACHE_KEY = 'ik-ticker-v1';
const usd = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

// Cours RÉELS du marché simulé du joueur (Crypto). Sans compte Crypto ou sans réponse : le bandeau disparaît.
function useTickerItems() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.at < 10 * 60 * 1000) { setItems(c.items); return undefined; }
    } catch { /* ignore */ }
    (async () => {
      try {
        const st = await fetch(`${API}/crypto/state`);
        if (!st.ok) return;
        const state = await st.json();
        if (!state.hasAccount || !state.dataReady) return;
        const res = await fetch(`${API}/crypto/assets?sort=marketCap`);
        if (!res.ok) return;
        const { assets } = await res.json();
        const top = assets.filter((a) => !a.stable && !a.collapsed).slice(0, 8);
        const out = await Promise.all(top.map(async (a) => {
          let series = [];
          try {
            const r = await fetch(`${API}/crypto/candles?symbol=${encodeURIComponent(a.symbol)}&tf=1d&limit=24`);
            if (r.ok) series = (await r.json()).candles.map((k) => k.c);
          } catch { /* mini-courbe absente : l'élément s'affiche quand même */ }
          return { symbol: a.symbol, name: a.name, price: a.price, change: a.change1d, series };
        }));
        if (!alive) return;
        setItems(out);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: out })); } catch { /* ignore */ }
      } catch { /* réseau indisponible : pas de bandeau */ }
    })();
    return () => { alive = false; };
  }, []);
  return items;
}

export default function TickerBar() {
  const items = useTickerItems();
  if (!items.length) return null;
  const row = (suffix) => items.map((t) => (
    <Link key={`${t.symbol}${suffix}`} href="/crypto" className="ik-tick" tabIndex={suffix ? -1 : 0} aria-hidden={suffix ? true : undefined}>
      <span className="ik-tick__sym" aria-hidden="true">{t.symbol.slice(0, 3)}</span>
      {t.symbol}
      <Sparkline values={t.series} width={56} height={20} />
      <span className="ik-num">{usd.format(t.price)}</span>
      <Delta value={t.change} />
    </Link>
  ));
  return (
    <div className="ik-ticker" role="region" aria-label="Cours du marché simulé">
      <span className="ik-ticker__intro">
        <span className="ik-chip ik-chip--example">Simulation</span>
        Marché simulé
      </span>
      <div className="ik-ticker__track">
        <div className="ik-ticker__row">{row('')}{row('-bis')}</div>
      </div>
      <Link href="/crypto" className="ik-link" style={{ flex: 'none' }}>Tout voir</Link>
    </div>
  );
}
