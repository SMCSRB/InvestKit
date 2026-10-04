// Empilement des séries d'un graphique en aires (pur, testable). Les valeurs négatives ne sont pas dessinées (elles restent lisibles dans l'infobulle et le tableau) ;
// les valeurs absentes ou non numériques comptent pour 0. Retourne, pour chaque série, les bornes basse et haute de chaque point.
export function stackSeries(series, n) {
  const base = new Array(n).fill(0);
  return series.map((s) => {
    const lo = base.slice();
    const hi = base.map((b, i) => {
      const v = Number(s.data[i]);
      const add = Number.isFinite(v) && v > 0 ? v : 0;
      base[i] = b + add;
      return base[i];
    });
    return { lo, hi };
  });
}

export const stackTotals = (series, n) => {
  const st = stackSeries(series, n);
  return new Array(n).fill(0).map((_, i) => (st.length ? st[st.length - 1].hi[i] : 0));
};
