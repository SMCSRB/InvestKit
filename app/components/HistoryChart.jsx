'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries, CrosshairMode, TickMarkType } from 'lightweight-charts';
import { useChartTheme, withAlpha } from '@/app/lib/chartTheme';
import Coin from '@/app/components/ui/Coin';

// Historique d'un titre de la Bourse (cours de clôture annuels du jeu de données simplifié).
// Les données viennent du serveur et s'arrêtent à l'année simulée du joueur : jamais de futur.
// Graphique : TradingView Lightweight Charts™ (Apache 2.0), logo d'attribution conservé.
const API = process.env.NEXT_PUBLIC_API_URL;
const fr = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export default function HistoryChart({ domain, symbol, simulatedYear, enabled = true }) {
  const theme = useChartTheme();
  const boxRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let off = false;
    setError(''); setData(null); setHover(null);
    if (!symbol || !enabled) return undefined;
    fetch(`${API}/trading/history?domain=${encodeURIComponent(domain)}&symbol=${encodeURIComponent(symbol)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, credentials: 'include' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (off) return; if (!ok) setError(j.error || 'Historique indisponible'); else setData(j); })
      .catch(() => { if (!off) setError('Historique indisponible'); });
    return () => { off = true; };
  }, [domain, symbol, simulatedYear, enabled]);

  useEffect(() => {
    if (!boxRef.current || (data?.points?.length ?? 0) < 2) return undefined;
    const chart = createChart(boxRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: theme.text, fontFamily: 'inherit', attributionLogo: true },
      grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: theme.border },
      timeScale: { borderColor: theme.border, tickMarkFormatter: (t, type) => (type === TickMarkType.Year ? String(new Date(t * 1000).getUTCFullYear()) : '') },
      localization: { locale: 'fr-FR', timeFormatter: (t) => String(new Date(t * 1000).getUTCFullYear()) },
      handleScroll: false, handleScale: false,
    });
    const s = chart.addSeries(AreaSeries, { lineColor: theme.line, topColor: withAlpha(theme.line, 0.3), bottomColor: withAlpha(theme.line, 0.02), lineWidth: 2, priceLineVisible: false });
    s.setData(data.points.map((p) => ({ time: Math.floor(Date.UTC(p.year, 11, 31) / 1000), value: p.close })));
    chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData && param.seriesData.get(s);
      if (!param.time || !d) { setHover(null); return; }
      setHover({ year: new Date(param.time * 1000).getUTCFullYear(), close: d.value });
    });
    chartRef.current = chart; seriesRef.current = s;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, [data, theme]);

  const pts = data?.points || [];
  const last = pts[pts.length - 1];
  const first = pts[0];
  const shown = hover || (last ? { year: last.year, close: last.close } : null);
  const change = first && last && first.close ? (last.close / first.close - 1) * 100 : null;

  return (
    <section className="ik-card" style={{ marginBottom: 24 }} aria-label={`Historique de ${symbol}`}>
      <div className="ik-card__head">
        <h3 className="ik-card__title">Historique · {symbol}</h3>
        <span className="ik-chip ik-chip--example">Données illustratives</span>
      </div>
      {error && <p className="ik-muted" role="status">{error}</p>}
      {!error && !data && <div className="ik-skeleton" style={{ height: 240, borderRadius: 12 }} aria-hidden="true" />}
      {data && pts.length < 2 && <p className="ik-muted" style={{ margin: '0 0 8px' }}>Une seule année de cours pour l&apos;instant : avance dans le temps pour voir l&apos;évolution se dessiner.</p>}
      {data && pts.length >= 2 && (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 8 }}>
            <strong className="ik-num" style={{ fontSize: 'var(--ik-fs-lg)' }}>{shown && fr(shown.close)} <Coin /></strong>
            <span className="ik-muted">clôture {shown && shown.year}</span>
            {change !== null && pts.length > 1 && <span className={`ik-num ${change >= 0 ? 'ik-up' : 'ik-down'}`}>{change >= 0 ? '▲ +' : '▼ '}{change.toFixed(1).replace('.', ',')} % depuis {first.year}</span>}
          </div>
          <div ref={boxRef} role="img" aria-label={`Courbe des cours de clôture annuels de ${symbol}, de ${first.year} à ${last.year}`} style={{ height: 240, width: '100%', overflow: 'hidden', borderRadius: 12 }} />
          <details style={{ marginTop: 10 }}>
            <summary className="ik-link" style={{ cursor: 'pointer' }}>Voir les valeurs (tableau)</summary>
            <table className="ik-table" style={{ marginTop: 8 }}>
              <thead><tr><th scope="col">Année</th><th scope="col">Clôture (<Coin />)</th></tr></thead>
              <tbody>{pts.map((p) => <tr key={p.year}><td>{p.year}</td><td className="ik-num">{fr(p.close)}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      )}
      <p className="ik-muted" style={{ fontSize: 'var(--ik-fs-xs)', margin: '8px 0 0' }}>
        Cours de clôture annuels, jusqu&apos;à ton année de jeu. Graphique :{' '}
        <a href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener noreferrer" className="ik-link">TradingView Lightweight Charts™</a>.
      </p>
    </section>
  );
}
