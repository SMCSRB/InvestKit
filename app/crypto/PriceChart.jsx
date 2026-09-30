'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart, createSeriesMarkers, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries,
  CrosshairMode, LineStyle, PriceScaleMode,
} from 'lightweight-charts';
import { INDICATORS, computeIndicator } from '../lib/indicators';

// Graphique professionnel basé sur TradingView Lightweight Charts™ (Apache 2.0) — le logo d'attribution reste affiché.
// Toutes les données viennent du serveur, déjà bornées à la date simulée : ce composant ne choisit jamais une date.

const COLORS = { up: '#22c55e', down: '#ef4444', grid: 'rgba(148,163,184,0.12)', text: '#94a3b8', line: '#60a5fa' };
const IND_COLORS = ['#f59e0b', '#a78bfa', '#22d3ee', '#f472b6', '#84cc16', '#fb923c'];
const SCALES = [['linear', 'Linéaire'], ['log', 'Log'], ['percent', '%']];
const SCALE_MODE = { linear: PriceScaleMode.Normal, log: PriceScaleMode.Logarithmic, percent: PriceScaleMode.Percentage };
const TYPES = [['candles', 'Bougies'], ['line', 'Ligne'], ['area', 'Aire']];
const LOAD_MORE_BEFORE = 15;

const btn = (active) => ({ padding: '6px 10px', borderRadius: 8, border: `1px solid ${active ? 'rgba(96,165,250,0.8)' : 'rgba(148,163,184,0.3)'}`, background: active ? 'rgba(59,130,246,0.3)' : 'rgba(15,23,42,0.6)', color: active ? '#bfdbfe' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' });
const smallInput = { width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.8)', color: '#fff', fontSize: 12 };

const precisionFor = (p) => (p >= 100 ? 2 : p >= 1 ? 3 : p >= 0.01 ? 5 : 8);
const fmt = (p) => (p == null ? '—' : Number(p).toLocaleString('fr-FR', { maximumFractionDigits: precisionFor(Math.abs(p)) }));
const toBar = (c) => ({ time: Math.floor(c.ts / 1000), open: c.o, high: c.h, low: c.l, close: c.c });

const loadTools = (symbol) => {
  try { const v = JSON.parse(localStorage.getItem(`ik_crypto_tools_${symbol}`) || 'null'); if (v && Array.isArray(v.h) && Array.isArray(v.t)) return v; } catch { /* ignore */ }
  return { h: [], t: [] };
};
const saveTools = (symbol, tools) => { try { localStorage.setItem(`ik_crypto_tools_${symbol}`, JSON.stringify(tools)); } catch { /* ignore */ } };

export default function PriceChart({ symbol, tf, candleLoader, refreshKey, markers }) {
  const boxRef = useRef(null);
  const chartRef = useRef(null);
  const mainRef = useRef(null);
  const volRef = useRef(null);
  const indSeriesRef = useRef([]);
  const toolSeriesRef = useRef([]);
  const priceLinesRef = useRef([]);
  const markersApiRef = useRef(null);
  const candlesRef = useRef([]);
  const stateRef = useRef({ hasMore: false, before: null, loading: false });
  const modeRef = useRef('none');
  const pendingPointRef = useRef(null);

  const [type, setType] = useState('candles');
  const [scale, setScale] = useState('linear');
  const [indicators, setIndicators] = useState([]);
  const [tools, setTools] = useState({ h: [], t: [] });
  const [drawMode, setDrawMode] = useState('none');
  const [hover, setHover] = useState(null);
  const [version, setVersion] = useState(0);        // incrémenté à chaque changement des bougies chargées
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInd, setShowInd] = useState(false);

  useEffect(() => { setTools(loadTools(symbol)); }, [symbol]);
  useEffect(() => { modeRef.current = drawMode; pendingPointRef.current = null; }, [drawMode]);

  // Création du graphique (une fois) : adapté au mobile (largeur automatique, défilement/zoom tactiles).
  useEffect(() => {
    const chart = createChart(boxRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: COLORS.text, fontFamily: 'inherit', attributionLogo: true, panes: { separatorColor: 'rgba(148,163,184,0.25)' } },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.25)' },
      timeScale: { borderColor: 'rgba(148,163,184,0.25)', timeVisible: true, secondsVisible: false, rightOffset: 4 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      localization: { locale: 'fr-FR' },
    });
    chartRef.current = chart;
    return () => { chart.remove(); chartRef.current = null; mainRef.current = null; volRef.current = null; indSeriesRef.current = []; toolSeriesRef.current = []; priceLinesRef.current = []; markersApiRef.current = null; };
  }, []);

  // Chargement initial / changement d'actif ou d'unité de temps / avance du temps.
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    candleLoader(symbol, tf, null).then((r) => {
      if (cancelled) return;
      candlesRef.current = r.candles;
      stateRef.current = { hasMore: r.hasMore, before: r.nextBefore, loading: false };
      setVersion((v) => v + 1);
      setLoading(false);
      requestAnimationFrame(() => chartRef.current?.timeScale().scrollToRealTime?.());
    }).catch((e) => { if (!cancelled) { setError(e.message || 'Erreur de chargement'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [symbol, tf, refreshKey, candleLoader]);

  // Chargement des bougies plus anciennes quand on fait défiler vers la gauche (jamais tout l'historique d'un coup).
  const loadOlder = useCallback(async () => {
    const st = stateRef.current;
    if (st.loading || !st.hasMore || st.before == null) return;
    st.loading = true;
    try {
      const r = await candleLoader(symbol, tf, st.before);
      const seen = new Set(candlesRef.current.map((c) => c.ts));
      const add = r.candles.filter((c) => !seen.has(c.ts));
      const range = chartRef.current?.timeScale().getVisibleLogicalRange();
      candlesRef.current = [...add, ...candlesRef.current];
      st.hasMore = r.hasMore && add.length > 0; st.before = r.nextBefore;
      setVersion((v) => v + 1);
      if (range && add.length) requestAnimationFrame(() => chartRef.current?.timeScale().setVisibleLogicalRange({ from: range.from + add.length, to: range.to + add.length }));
    } catch { /* on réessaiera au prochain défilement */ }
    st.loading = false;
  }, [candleLoader, symbol, tf]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const onRange = (range) => { if (range && range.from < LOAD_MORE_BEFORE) loadOlder(); };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
  }, [loadOlder]);

  // Séries principales (bougies / ligne / aire + volume) et indicateurs.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const candles = candlesRef.current;
    // Nettoyage des séries précédentes
    [mainRef.current, volRef.current, ...indSeriesRef.current, ...toolSeriesRef.current].forEach((s) => { if (s) { try { chart.removeSeries(s); } catch { /* déjà retirée */ } } });
    mainRef.current = null; volRef.current = null; indSeriesRef.current = []; toolSeriesRef.current = []; priceLinesRef.current = []; markersApiRef.current = null;
    // Les volets d'indicateurs (RSI, MACD) vivent dans des panneaux séparés
    if (!candles.length) return;
    const last = candles[candles.length - 1].c;
    const priceFormat = { type: 'price', precision: precisionFor(last), minMove: 10 ** -precisionFor(last) };
    let main;
    if (type === 'candles') {
      main = chart.addSeries(CandlestickSeries, { upColor: COLORS.up, downColor: COLORS.down, borderVisible: false, wickUpColor: COLORS.up, wickDownColor: COLORS.down, priceFormat }, 0);
      main.setData(candles.map(toBar));
    } else if (type === 'line') {
      main = chart.addSeries(LineSeries, { color: COLORS.line, lineWidth: 2, priceFormat }, 0);
      main.setData(candles.map((c) => ({ time: Math.floor(c.ts / 1000), value: c.c })));
    } else {
      main = chart.addSeries(AreaSeries, { lineColor: COLORS.line, topColor: 'rgba(96,165,250,0.35)', bottomColor: 'rgba(96,165,250,0.02)', lineWidth: 2, priceFormat }, 0);
      main.setData(candles.map((c) => ({ time: Math.floor(c.ts / 1000), value: c.c })));
    }
    mainRef.current = main;
    chart.priceScale('right', 0).applyOptions({ mode: SCALE_MODE[scale], scaleMargins: { top: 0.06, bottom: 0.22 } });
    // Volume (histogramme en bas du panneau principal)
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false }, 0);
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(candles.map((c) => ({ time: Math.floor(c.ts / 1000), value: c.volume, color: c.c >= c.o ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)' })));
    volRef.current = vol;
    // Indicateurs
    let pane = 1;
    indicators.forEach((ind, idx) => {
      const def = INDICATORS[ind.type];
      if (!def) return;
      const res = computeIndicator(candles, ind);
      const color = IND_COLORS[idx % IND_COLORS.length];
      const opt = (extra = {}) => ({ color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, ...extra });
      if (def.pane === 'price') {
        res.lines.forEach((l) => { const s = chart.addSeries(LineSeries, opt(l.key === 'mid' ? { lineStyle: LineStyle.Dashed } : {}), 0); s.setData(l.points); indSeriesRef.current.push(s); });
      } else if (def.pane === 'volume') {
        res.lines.forEach((l) => { const s = chart.addSeries(LineSeries, opt({ priceScaleId: 'vol', lineWidth: 2 }), 0); s.setData(l.points); indSeriesRef.current.push(s); });
      } else {
        const p = pane++;
        if (ind.type === 'macd') {
          const h = chart.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false }, p);
          h.setData(res.hist.map((x) => ({ ...x, color: x.value >= 0 ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)' })));
          indSeriesRef.current.push(h);
          res.lines.forEach((l, i) => { const s = chart.addSeries(LineSeries, opt({ color: i ? '#f59e0b' : '#60a5fa' }), p); s.setData(l.points); indSeriesRef.current.push(s); });
        } else {
          res.lines.forEach((l) => {
            const s = chart.addSeries(LineSeries, opt({ lineWidth: 2 }), p); s.setData(l.points); indSeriesRef.current.push(s);
            if (ind.type === 'rsi') { s.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.6)', lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false }); s.createPriceLine({ price: 30, color: 'rgba(34,197,94,0.6)', lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false }); }
          });
        }
        chart.panes()[p]?.setHeight?.(110);
      }
    });
    // Outils de dessin enregistrés
    tools.h.forEach((price) => { priceLinesRef.current.push(main.createPriceLine({ price, color: '#fbbf24', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'ligne' })); });
    tools.t.forEach((t) => {
      const s = chart.addSeries(LineSeries, { color: '#fbbf24', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, priceFormat }, 0);
      s.setData([{ time: t.t1, value: t.p1 }, { time: t.t2, value: t.p2 }].sort((a, b) => a.time - b.time));
      toolSeriesRef.current.push(s);
    });
    // Repères d'ordres (achats / ventes du joueur)
    if (markers?.length) markersApiRef.current = createSeriesMarkers(main, [...markers].sort((a, b) => a.time - b.time));
  }, [version, type, scale, indicators, tools, markers]);

  // Infobulle OHLC au survol + outils de dessin (clic)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const onMove = (param) => {
      const main = mainRef.current;
      if (!main || !param.time || !param.seriesData) { setHover(null); return; }
      const d = param.seriesData.get(main);
      const candle = candlesRef.current.find((c) => Math.floor(c.ts / 1000) === param.time);
      if (!d || !candle) { setHover(null); return; }
      setHover({ time: param.time, o: candle.o, h: candle.h, l: candle.l, c: candle.c, v: candle.volume, partial: !!candle.partial });
    };
    const onClick = (param) => {
      const main = mainRef.current;
      if (!main || !param.point || !param.time || modeRef.current === 'none') return;
      const price = main.coordinateToPrice(param.point.y);
      if (price == null || !Number.isFinite(price)) return;
      if (modeRef.current === 'hline') {
        setTools((t) => { const n = { ...t, h: [...t.h, Number(price.toPrecision(8))].slice(-20) }; saveTools(symbol, n); return n; });
        setDrawMode('none');
      } else if (modeRef.current === 'trend') {
        const p = pendingPointRef.current;
        if (!p) { pendingPointRef.current = { t: param.time, p: price }; return; }
        if (p.t === param.time) return;
        pendingPointRef.current = null;
        setTools((t) => { const n = { ...t, t: [...t.t, { t1: p.t, p1: p.p, t2: param.time, p2: price }].slice(-20) }; saveTools(symbol, n); return n; });
        setDrawMode('none');
      }
    };
    chart.subscribeCrosshairMove(onMove);
    chart.subscribeClick(onClick);
    return () => { chart.unsubscribeCrosshairMove(onMove); chart.unsubscribeClick(onClick); };
  }, [symbol]);

  const addIndicator = (t) => setIndicators((a) => (a.length >= 6 ? a : [...a, { id: `${t}-${Date.now()}`, type: t, params: { ...INDICATORS[t].params } }]));
  const setParam = (id, k, v) => setIndicators((a) => a.map((i) => (i.id === id ? { ...i, params: { ...i.params, [k]: v } } : i)));
  const clampParam = (k, raw) => { const n = Number(raw); if (!Number.isFinite(n)) return undefined; return k === 'mult' ? Math.min(5, Math.max(0.5, n)) : Math.min(200, Math.max(1, Math.round(n))); };
  const clearTools = () => { const n = { h: [], t: [] }; setTools(n); saveTools(symbol, n); };
  const shown = hover || (candlesRef.current.length ? (() => { const c = candlesRef.current[candlesRef.current.length - 1]; return { time: Math.floor(c.ts / 1000), o: c.o, h: c.h, l: c.l, c: c.c, v: c.volume, partial: !!c.partial }; })() : null);
  const pct = useMemo(() => (shown && shown.o ? ((shown.c / shown.o - 1) * 100) : null), [shown]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        {TYPES.map(([id, l]) => <button key={id} style={btn(type === id)} onClick={() => setType(id)}>{l}</button>)}
        <span style={{ width: 8 }} />
        {SCALES.map(([id, l]) => <button key={id} style={btn(scale === id)} onClick={() => setScale(id)} title="Échelle de l'axe des prix">{l}</button>)}
        <span style={{ width: 8 }} />
        <button style={btn(showInd)} onClick={() => setShowInd((s) => !s)}>Indicateurs{indicators.length ? ` (${indicators.length})` : ''}</button>
        <button style={btn(drawMode === 'hline')} onClick={() => setDrawMode(drawMode === 'hline' ? 'none' : 'hline')} title="Puis clique sur le graphique">― Ligne horizontale</button>
        <button style={btn(drawMode === 'trend')} onClick={() => setDrawMode(drawMode === 'trend' ? 'none' : 'trend')} title="Clique deux points sur le graphique">╱ Ligne de tendance</button>
        {(tools.h.length > 0 || tools.t.length > 0) && <button style={btn(false)} onClick={clearTools}>Effacer mes tracés</button>}
      </div>
      {drawMode !== 'none' && <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 6 }}>{drawMode === 'hline' ? 'Clique sur le graphique à la hauteur voulue.' : 'Clique le premier point, puis le second.'}</div>}

      {showInd && (
        <div style={{ border: '1px solid rgba(148,163,184,0.25)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.6)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(INDICATORS).map(([t, d]) => <button key={t} style={btn(false)} onClick={() => addIndicator(t)}>+ {d.label}</button>)}
          </div>
          {indicators.map((ind, idx) => (
            <div key={ind.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: IND_COLORS[idx % IND_COLORS.length], display: 'inline-block' }} />
              <strong>{INDICATORS[ind.type].label}</strong>
              {Object.entries(ind.params).map(([k, v]) => (
                <label key={k} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {k === 'period' ? 'période' : k === 'mult' ? 'écarts-types' : k === 'fast' ? 'rapide' : k === 'slow' ? 'lente' : 'signal'}
                  <input aria-label={`${ind.type}-${k}`} style={smallInput} type="number" step={k === 'mult' ? 0.5 : 1} value={v}
                    onChange={(e) => { const n = clampParam(k, e.target.value); if (n !== undefined) setParam(ind.id, k, n); }} />
                </label>
              ))}
              <button style={btn(false)} onClick={() => setIndicators((a) => a.filter((i) => i.id !== ind.id))}>Retirer</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.6)' }}>
        <div data-testid="chart-legend" style={{ position: 'absolute', zIndex: 3, top: 6, left: 10, right: 60, fontSize: 12, color: '#cbd5e1', pointerEvents: 'none', display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
          <strong style={{ color: '#fff' }}>{symbol} · {tf}</strong>
          {shown && <>
            <span>O <b>{fmt(shown.o)}</b></span><span>H <b>{fmt(shown.h)}</b></span><span>L <b>{fmt(shown.l)}</b></span><span>C <b>{fmt(shown.c)}</b></span>
            {pct !== null && <span style={{ color: pct >= 0 ? COLORS.up : COLORS.down }}>{pct >= 0 ? '+' : ''}{pct.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %</span>}
            <span>Vol <b>{Number(shown.v).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $</b></span>
            {shown.partial && <span style={{ color: '#fbbf24' }}>bougie en cours</span>}
          </>}
        </div>
        <div ref={boxRef} data-testid="chart-box" style={{ width: '100%', height: indicators.some((i) => INDICATORS[i.type]?.pane === 'own') ? 560 : 400, touchAction: 'pan-y' }} />
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'rgba(2,6,23,0.4)' }}>Chargement…</div>}
        {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', padding: 16, textAlign: 'center' }}>{error}</div>}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
        Graphique : <a href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b' }}>TradingView Lightweight Charts™</a> (licence Apache 2.0). Les bougies sont calculées sur les données connues à ta date simulée ; la dernière peut être incomplète.
      </div>
    </div>
  );
}

// Comparaison de 2 à 4 actifs rebasés à 100 (une seule échelle : jamais deux axes différents).
export function CompareChart({ data }) {
  const boxRef = useRef(null);
  useEffect(() => {
    if (!boxRef.current || !data?.points?.length) return undefined;
    const chart = createChart(boxRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: COLORS.text, attributionLogo: true },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.25)' },
      timeScale: { borderColor: 'rgba(148,163,184,0.25)', timeVisible: true },
      localization: { locale: 'fr-FR' },
    });
    data.series.forEach((s, i) => {
      const line = chart.addSeries(LineSeries, { color: IND_COLORS[i % IND_COLORS.length], lineWidth: 2, title: s.symbol, priceFormat: { type: 'price', precision: 1, minMove: 0.1 } });
      line.setData(data.points.map((p, k) => ({ time: Math.floor(p.ts / 1000), value: s.values[k] })));
    });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [data]);
  if (!data?.points?.length) return <div style={{ color: '#94a3b8', fontSize: 13 }}>{data?.note || 'Pas assez de données communes.'}</div>;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, marginBottom: 6 }}>
        {data.series.map((s, i) => <span key={s.symbol} style={{ color: '#cbd5e1' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: IND_COLORS[i % IND_COLORS.length], marginRight: 4 }} />{s.symbol} ({s.values.length ? `${s.values[s.values.length - 1].toFixed(1)}` : '—'})</span>)}
      </div>
      <div ref={boxRef} style={{ width: '100%', height: 320, overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.6)' }} />
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Base 100 à la première date commune : on compare des évolutions, pas des prix.</div>
    </div>
  );
}
