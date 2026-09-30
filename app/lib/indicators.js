// Indicateurs techniques (fonctions pures, sans dépendance). Entrée : tableau de bougies { ts, o, h, l, c, volume }.
// Sortie : tableaux alignés sur les bougies (null tant que l'indicateur n'est pas calculable).
// Formules classiques : SMA, EMA (amorcée par la SMA), Bandes de Bollinger (écart-type de population),
// RSI de Wilder, MACD (EMA rapide − EMA lente, ligne de signal = EMA du MACD), moyenne mobile du volume.

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const posInt = (n, def) => (Number.isInteger(n) && n >= 1 ? n : def);

export const sma = (values, period) => {
  const p = posInt(period, 20);
  const out = new Array(values.length).fill(null);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    count++;
    if (count > p) { sum -= values[i - p]; count--; }
    if (count === p) out[i] = sum / p;
  }
  return out;
};

export const ema = (values, period) => {
  const p = posInt(period, 20);
  const out = new Array(values.length).fill(null);
  if (values.length < p) return out;
  const k = 2 / (p + 1);
  let prev = values.slice(0, p).reduce((a, b) => a + b, 0) / p;
  out[p - 1] = prev;
  for (let i = p; i < values.length; i++) { prev = values[i] * k + prev * (1 - k); out[i] = prev; }
  return out;
};

export const bollinger = (values, period = 20, mult = 2) => {
  const p = posInt(period, 20);
  const m = isNum(mult) && mult > 0 ? mult : 2;
  const mid = sma(values, p);
  const upper = new Array(values.length).fill(null);
  const lower = new Array(values.length).fill(null);
  for (let i = p - 1; i < values.length; i++) {
    let v = 0;
    for (let j = i - p + 1; j <= i; j++) v += (values[j] - mid[i]) ** 2;
    const sd = Math.sqrt(v / p);
    upper[i] = mid[i] + m * sd;
    lower[i] = mid[i] - m * sd;
  }
  return { upper, mid, lower };
};

// RSI de Wilder : moyennes lissées des hausses et des baisses ; 100 si aucune baisse.
export const rsi = (values, period = 14) => {
  const p = posInt(period, 14);
  const out = new Array(values.length).fill(null);
  if (values.length <= p) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= p; i++) { const d = values[i] - values[i - 1]; if (d >= 0) gain += d; else loss -= d; }
  gain /= p; loss /= p;
  const val = () => (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss));
  out[p] = val();
  for (let i = p + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (p - 1) + (d > 0 ? d : 0)) / p;
    loss = (loss * (p - 1) + (d < 0 ? -d : 0)) / p;
    out[i] = val();
  }
  return out;
};

export const macd = (values, fast = 12, slow = 26, signal = 9) => {
  let f = posInt(fast, 12);
  let s = posInt(slow, 26);
  if (f >= s) { f = Math.min(f, s - 1) || 1; if (f >= s) s = f + 1; }
  const sg = posInt(signal, 9);
  const ef = ema(values, f);
  const es = ema(values, s);
  const line = values.map((_, i) => (ef[i] !== null && es[i] !== null ? ef[i] - es[i] : null));
  const first = line.findIndex((x) => x !== null);
  const sig = new Array(values.length).fill(null);
  if (first >= 0) {
    const tail = ema(line.slice(first), sg);
    tail.forEach((v, i) => { sig[first + i] = v; });
  }
  const hist = line.map((x, i) => (x !== null && sig[i] !== null ? x - sig[i] : null));
  return { macd: line, signal: sig, hist };
};

// Convertit un tableau aligné en points { time, value } (secondes), en sautant les valeurs absentes.
export const toPoints = (candles, series) => {
  const pts = [];
  for (let i = 0; i < candles.length; i++) if (series[i] !== null && series[i] !== undefined && isNum(series[i])) pts.push({ time: Math.floor(candles[i].ts / 1000), value: series[i] });
  return pts;
};

export const INDICATORS = {
  sma: { label: 'Moyenne mobile simple (SMA)', pane: 'price', params: { period: 20 } },
  ema: { label: 'Moyenne mobile exponentielle (EMA)', pane: 'price', params: { period: 20 } },
  bollinger: { label: 'Bandes de Bollinger', pane: 'price', params: { period: 20, mult: 2 } },
  volsma: { label: 'Moyenne mobile du volume', pane: 'volume', params: { period: 20 } },
  rsi: { label: 'RSI', pane: 'own', params: { period: 14 } },
  macd: { label: 'MACD', pane: 'own', params: { fast: 12, slow: 26, signal: 9 } },
};

// Calcule un indicateur configuré { type, params } sur des bougies. Retourne { lines: [{ key, points }], hist? }.
export const computeIndicator = (candles, { type, params }) => {
  const closes = candles.map((c) => c.c);
  const p = { ...(INDICATORS[type]?.params || {}), ...(params || {}) };
  switch (type) {
    case 'sma': return { lines: [{ key: 'sma', points: toPoints(candles, sma(closes, p.period)) }] };
    case 'ema': return { lines: [{ key: 'ema', points: toPoints(candles, ema(closes, p.period)) }] };
    case 'bollinger': { const b = bollinger(closes, p.period, p.mult); return { lines: [{ key: 'upper', points: toPoints(candles, b.upper) }, { key: 'mid', points: toPoints(candles, b.mid) }, { key: 'lower', points: toPoints(candles, b.lower) }] }; }
    case 'volsma': return { lines: [{ key: 'volsma', points: toPoints(candles, sma(candles.map((c) => c.volume), p.period)) }] };
    case 'rsi': return { lines: [{ key: 'rsi', points: toPoints(candles, rsi(closes, p.period)) }] };
    case 'macd': { const m = macd(closes, p.fast, p.slow, p.signal); return { lines: [{ key: 'macd', points: toPoints(candles, m.macd) }, { key: 'signal', points: toPoints(candles, m.signal) }], hist: toPoints(candles, m.hist) }; }
    default: return { lines: [] };
  }
};
