// Corrélation de Pearson entre séries de rendements annuels, sur les années communes (minimum 3 points).
export const pearson = (a: number[], b: number[]): number | null => {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; cov += x * y; va += x * x; vb += y * y; }
  if (va === 0 || vb === 0) return null;
  return Math.max(-1, Math.min(1, cov / Math.sqrt(va * vb)));
};

// Rendements annuels (année → rendement) d'une série de prix par année.
export const annualReturns = (prices: Record<number, number>): Record<number, number> => {
  const out: Record<number, number> = {};
  for (const y of Object.keys(prices).map(Number)) {
    const prev = prices[y - 1];
    if (prev && prev > 0 && prices[y] > 0) out[y] = prices[y] / prev - 1;
  }
  return out;
};

export interface CorrelationMatrix { symbols: string[]; matrix: (number | null)[][]; overlap: number[][] }

// Matrice de corrélation entre séries de rendements (alignées par année commune).
export const correlationMatrix = (series: Record<string, Record<number, number>>): CorrelationMatrix => {
  const symbols = Object.keys(series);
  const matrix: (number | null)[][] = symbols.map(() => new Array(symbols.length).fill(null));
  const overlap: number[][] = symbols.map(() => new Array(symbols.length).fill(0));
  symbols.forEach((sa, i) => symbols.forEach((sb, j) => {
    const ya = Object.keys(series[sa]).map(Number), common = ya.filter((y) => y in series[sb]).sort((x, y) => x - y);
    overlap[i][j] = common.length;
    matrix[i][j] = i === j ? (common.length >= 3 ? 1 : null) : pearson(common.map((y) => series[sa][y]), common.map((y) => series[sb][y]));
    if (matrix[i][j] !== null) matrix[i][j] = Math.round((matrix[i][j] as number) * 100) / 100;
  }));
  return { symbols, matrix, overlap };
};
