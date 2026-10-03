// Mini-courbes : chaque courbe doit venir de la VRAIE série de cours de SON actif (GET /crypto/candles?symbol=...).
// Garde-fou : une courbe est retirée (la ligne s'affiche sans courbe) si elle est trop courte, plate, contient une valeur invalide,
// ou si elle a exactement la même forme qu'un autre actif (corrélation des variations ≥ 0,99999 : impossible pour deux séries réelles
// indépendantes, c'est le signe d'une série copiée ou générée à partir d'une même source).
const returns = (v) => v.slice(1).map((x, i) => Math.log(x / v[i]));
const corr = (a, b) => {
  const n = Math.min(a.length, b.length);
  const ma = a.slice(0, n).reduce((s, x) => s + x, 0) / n, mb = b.slice(0, n).reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i += 1) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
};
export const MIN_POINTS = 8;
export const DUPLICATE_CORRELATION = 0.99999;

export const usableSeries = (values) => Array.isArray(values) && values.length >= MIN_POINTS
  && values.every((x) => Number.isFinite(x) && x > 0) && Math.max(...values) > Math.min(...values);

export const keepGenuineSparklines = (items) => {
  const kept = [];
  return items.map((it) => {
    if (!usableSeries(it.series)) return { ...it, series: [] };
    const r = returns(it.series);
    if (kept.some((k) => k.length === r.length && corr(k, r) >= DUPLICATE_CORRELATION)) return { ...it, series: [] };
    kept.push(r);
    return it;
  });
};
