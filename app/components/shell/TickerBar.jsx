'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Delta } from '@/app/components/ui/primitives';
import { Sparkline } from '@/app/components/ui/charts';
import { keepGenuineSparklines } from '@/app/lib/sparklines';
import { useTheme } from '@/app/context/ThemeContext';
import Coin from '@/app/components/ui/Coin';
import { CLOCK_EVENT } from '@/app/lib/gameClock';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const CACHE_KEY = 'ik-ticker-v3';
const usd = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
// Prix en InvestCoins (1 pièce = 1 €) : décimales adaptées aux petits prix.
const unit = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: n >= 100 ? 2 : n >= 1 ? 3 : n >= 0.01 ? 5 : 8 });

// Cours HISTORIQUES du marché crypto du joueur, rejoués à sa date de jeu (ils ne sont pas en direct ; les données peuvent être fictives tant
// que l'historique n'est pas importé). Sans compte Crypto ou sans réponse : le bandeau disparaît.
function useTickerItems() {
  const [items, setItems] = useState([]);
  const [version, setVersion] = useState(0);
  // La date de jeu change (avance du temps sur n'importe quelle page) : on recharge les cours à la nouvelle date.
  useEffect(() => {
    const onAdvance = () => setVersion((v) => v + 1);
    window.addEventListener(CLOCK_EVENT, onAdvance);
    return () => window.removeEventListener(CLOCK_EVENT, onAdvance);
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await fetch(`${API}/crypto/state`, { cache: 'no-store' });
        if (!st.ok) { if (alive) setItems([]); return; }
        const state = await st.json();
        if (!state.hasAccount || !state.dataReady) { if (alive) setItems([]); return; }
        const at = state.account?.simulatedAt ?? null;
        // Le cache ne vaut que pour LA MÊME date de jeu : changer de date le rend caduc (jamais de prix d'une autre date).
        try {
          const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
          if (c && c.simulatedAt === at && Date.now() - c.at < 10 * 60 * 1000) { if (alive) setItems(c.items); return; }
        } catch { /* ignore */ }
        const res = await fetch(`${API}/crypto/assets?sort=marketCap`, { cache: 'no-store' });
        if (!res.ok) return;
        const { assets } = await res.json();
        const top = assets.filter((a) => !a.stable && !a.collapsed).slice(0, 8);
        const raw = await Promise.all(top.map(async (a) => {
          let series = [];
          try {
            let r = await fetch(`${API}/crypto/candles?symbol=${encodeURIComponent(a.symbol)}&tf=1d&limit=24${a.priceCoins != null ? '&unit=coins' : ''}`, { cache: 'no-store' });
            if (!r.ok && a.priceCoins != null) r = await fetch(`${API}/crypto/candles?symbol=${encodeURIComponent(a.symbol)}&tf=1d&limit=24`, { cache: 'no-store' });
            if (r.ok) series = (await r.json()).candles.map((k) => k.c);
          } catch { /* mini-courbe absente : l'élément s'affiche quand même */ }
          return { symbol: a.symbol, name: a.name, price: a.price, priceCoins: a.priceCoins ?? null, change: a.change1d, series, synthetic: !!a.synthetic };
        }));
        const out = keepGenuineSparklines(raw);   // courbe retirée si elle ne vient pas d'une vraie série propre à l'actif
        if (!alive) return;
        setItems(out);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), simulatedAt: at, items: out })); } catch { /* ignore */ }
      } catch { /* réseau indisponible : pas de bandeau */ }
    })();
    return () => { alive = false; };
  }, [version]);
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
