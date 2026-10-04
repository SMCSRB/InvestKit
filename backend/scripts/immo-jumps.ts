// Explique les sauts de médiane glissante d'une ville, ou compare l'ancienne et la nouvelle méthode sur les 12 villes (lecture seule : aucune base, rien n'est écrit).
//   npm run immo:jumps -- --city lille --dir backend/data/dvf-brut-cp           (détail des sauts de Lille, méthode actuelle : lissage par crédibilité)
//   npm run immo:jumps -- --city lille --method seuil                              (même détail avec l'ANCIENNE règle : 10 ventes, sinon ville)
//   npm run immo:jumps -- --all --dir backend/data/dvf-brut-cp                    (nombre de sauts par ville, avant (seuil) et après (crédibilité))
// Options : --city <id> (défaut lille) · --dir <dossier> · --threshold <0.15> · --since AAAA-MM (défaut 2022-01 : les mois de 2021 n'ont pas 12 mois d'historique) · --from AAAA-MM · --to AAAA-MM
import path from 'path';
import { loadSalesFromDir, buildFromSales } from '../src/data/realEstate/dvf/pipeline';
import { monthlyMarket, Method } from '../src/data/realEstate/dvf/aggregate';
import { explainJumps, renderJumps, countJumps } from '../src/data/realEstate/dvf/jumps';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
try {
  const dir = path.resolve(arg('dir') ?? path.join(__dirname, '..', 'data', 'dvf-brut'));
  const city = arg('city') ?? 'lille'; const threshold = Number(arg('threshold') ?? 0.15); const since = arg('since') ?? '2022-01';
  const { sales, rejected } = loadSalesFromDir(dir);
  const built = buildFromSales(sales, rejected, { from: arg('from'), to: arg('to') });
  if (process.argv.includes('--all')) {
    const before = countJumps(monthlyMarket(built.kept, built.range, 'seuil'), threshold, since);
    const after = countJumps(built.rows, threshold, since);
    console.log(`Sauts de plus de ${Math.round(threshold * 100)} % d'un mois à l'autre sur la médiane glissante (appartements, mois à partir de ${since}) : avant = ancienne règle (10 ventes, sinon ville) ; après = lissage par crédibilité.`);
    console.log('Ville'.padEnd(16) + 'avant'.padStart(8) + 'après'.padStart(8));
    let a = 0; let b = 0;
    for (const c of DVF_CITIES) { console.log(c.name.padEnd(16) + String(before[c.id]).padStart(8) + String(after[c.id]).padStart(8)); a += before[c.id]; b += after[c.id]; }
    console.log('Total'.padEnd(16) + String(a).padStart(8) + String(b).padStart(8));
  } else {
    const method = (arg('method') ?? 'credibilite') as Method;
    const rows = method === 'seuil' ? monthlyMarket(built.kept, built.range, 'seuil') : built.rows;
    console.log(`Méthode : ${method === 'seuil' ? 'ancienne règle (10 ventes, sinon ville)' : 'lissage par crédibilité'}`);
    console.log(renderJumps(city, explainJumps(built.kept, rows, city, threshold, since), threshold));
  }
} catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
