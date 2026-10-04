// Explique les sauts de médiane glissante d'une ville (lecture seule : aucune base, rien n'est écrit en dehors de l'affichage).
//   npm run immo:jumps -- --city lille --dir backend/data/dvf-brut-cp
// Options : --city <id> (défaut lille) · --dir <dossier> · --threshold <0.15> · --from AAAA-MM · --to AAAA-MM
import path from 'path';
import { loadSalesFromDir, buildFromSales } from '../src/data/realEstate/dvf/pipeline';
import { explainJumps, renderJumps } from '../src/data/realEstate/dvf/jumps';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
try {
  const dir = path.resolve(arg('dir') ?? path.join(__dirname, '..', 'data', 'dvf-brut'));
  const city = arg('city') ?? 'lille'; const threshold = Number(arg('threshold') ?? 0.15);
  const { sales, rejected } = loadSalesFromDir(dir);
  const built = buildFromSales(sales, rejected, { from: arg('from'), to: arg('to') });
  console.log(renderJumps(city, explainJumps(built.kept, built.rows, city, threshold), threshold));
} catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
