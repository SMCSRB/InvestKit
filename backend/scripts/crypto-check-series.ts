// Contrôle (lecture seule) des mini-courbes du bandeau : pour chaque actif, les N derniers cours journaliers EN BASE, puis la corrélation
// des variations entre actifs. Deux actifs réels sont corrélés (souvent 0,6 à 0,95) mais jamais identiques ; ≥ 0,99999 = série copiée.
//   cd backend && npm run crypto:check-series -- --symbols BTC,ETH,BNB,XRP --days 24
import { initDatabase, closePool, query } from '../src/utils/db';

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const symbols = (arg('symbols') ?? 'BTC,ETH,BNB,XRP').split(',').map((s) => s.trim().toUpperCase());
const days = Number(arg('days') ?? 24);
const corr = (a: number[], b: number[]) => {
  const n = Math.min(a.length, b.length); const ma = a.slice(0, n).reduce((s, x) => s + x, 0) / n; const mb = b.slice(0, n).reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
};
(async () => {
  initDatabase();
  const series: Record<string, number[]> = {};
  for (const s of symbols) {
    const r = await query(`SELECT c.c FROM crypto_candles c JOIN crypto_assets a ON a.id = c.asset_id WHERE a.symbol = $1 AND c.tf = '1d' ORDER BY c.ts DESC LIMIT $2`, [s, days]);
    series[s] = r.rows.map((x: any) => Number(x.c)).reverse();
    console.log(`${s}: ${series[s].length} cours, du ${series[s][0]} au ${series[s][series[s].length - 1]}`);
  }
  let bad = 0;
  for (let i = 0; i < symbols.length; i++) for (let j = i + 1; j < symbols.length; j++) {
    const a = series[symbols[i]], b = series[symbols[j]];
    if (a.length < 3 || b.length < 3) { console.log(`${symbols[i]} / ${symbols[j]} : pas assez de données`); continue; }
    const ra = a.slice(1).map((x, k) => Math.log(x / a[k])), rb = b.slice(1).map((x, k) => Math.log(x / b[k]));
    const c = corr(ra, rb); const dup = c >= 0.99999; if (dup) bad++;
    console.log(`${symbols[i]} / ${symbols[j]} : corrélation des variations ${c.toFixed(3)}${dup ? '  ← IDENTIQUES : série copiée !' : ''}`);
  }
  console.log(bad ? `\n${bad} paire(s) suspecte(s).` : '\nAucune série copiée : chaque courbe est propre à son actif.');
  await closePool();
})().catch((e) => { console.error(e); process.exit(1); });
