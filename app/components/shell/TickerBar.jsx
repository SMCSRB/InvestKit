'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Delta } from '@/app/components/ui/primitives';
import { Sparkline } from '@/app/components/ui/charts';
import { keepGenuineSparklines } from '@/app/lib/sparklines';
import { useTheme } from '@/app/context/ThemeContext';
import Coin from '@/app/components/ui/Coin';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const CACHE_KEY = 'ik-ticker-v2';
const usd = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
// Prix en InvestCoins (1 pièce = 1 €) : décimales adaptées aux petits prix.
const unit = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: n >= 100 ? 2 : n >= 1 ? 3 : n >= 0.01 ? 5 : 8 });

// Cours HISTORIQUES du marché crypto du joueur, rejoués à sa date de jeu (ils ne sont pas en direct ; les données peuvent être fictives tant
// que l'historique n'est pas importé). Sans compte Crypto ou sans réponse : le bandeau disparaît.
function useTickerItems() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.at < 10 * 60 * 1000) { setItems(c.items); return undefined; }   // (le drapeau « fictives » est porté par chaque élément)
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
        const raw = await Promise.all(top.map(async (a) => {
          let series = [];
          try {
            let r = await fetch(`${API}/crypto/candles?symbol=${encodeURIComponent(a.symbol)}&tf=1d&limit=24${a.priceCoins != null ? '&unit=coins' : ''}`);
            if (!r.ok && a.priceCoins != null) r = await fetch(`${API}/crypto/candles?symbol=${encodeURIComponent(a.symbol)}&tf=1d&limit=24`);
            if (r.ok) series = (await r.json()).candles.map((k) => k.c);
          } catch { /* mini-courbe absente : l'élément s'affiche quand même */ }
          return { symbol: a.symbol, name: a.name, price: a.price, priceCoins: a.priceCoins ?? null, change: a.change1d, series, synthetic: !!a.synthetic };
        }));
        const out = keepGenuineSparklines(raw);   // courbe retirée si elle ne vient pas d'une vraie série propre à l'actif
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
  const { tickerVisible } = useTheme();
  if (!tickerVisible || !items.length) return null;
  const synthetic = items.some((t) => t.synthetic);
  const row = (suffix) => items.map((t) => (
    <Link key={`${t.symbol}${suffix}`} href="/crypto" className="ik-tick" tabIndex={suffix ? -1 : 0} aria-hidden={suffix ? true : undefined}>
      <span className="ik-tick__sym" aria-hidden="true">{t.symbol.slice(0, 3)}</span>
      {t.symbol}
      <Sparkline values={t.series} width={56} height={20} />
      <span className="ik-num" title={t.priceCoins != null ? `${usd.format(t.price)} (cours d'origine)` : undefined}>{t.priceCoins != null ? <>{unit(t.priceCoins)} <Coin /></> : usd.format(t.price)}</span>
      <Delta value={t.change} />
    </Link>
  ));
  return (
    <div className="ik-ticker" role="region" aria-label={synthetic ? 'Cours du marché simulé (données fictives, pas en direct)' : 'Cours du marché simulé (historique rejoué à ta date de jeu, pas en direct)'}>
      <span className="ik-ticker__intro" title="Cours historiques rejoués à ta date de jeu : ils ne sont pas en direct.">
        {synthetic ? 'Données fictives' : 'Marché'}
      </span>
      <div className="ik-ticker__track">
        <div className="ik-ticker__row">{row('')}{row('-bis')}</div>
      </div>
      <Link href="/crypto" className="ik-link" style={{ flex: 'none' }}>Tout voir</Link>
    </div>
  );
}
