// Charge en base l'IRL préparé par immo:import-irl (backend/data/irl-insee.json). PRÉPARATION : le moteur actuel ne lit pas l'IRL réel (IRL_ENABLED = false).
//   npm run immo:load-irl -- --file backend/data/irl-insee.json           simulation : valide et affiche ce qui serait écrit, n'écrit RIEN (aucune base n'est ouverte)
//   npm run immo:load-irl -- --file … --apply                              écrit en base, SEULEMENT si la base visée se termine par « _test » (sinon refus). Rejouable.
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { parseIrlFile } from '../src/data/realEstate/irl/irlFile';
import { IRL_ENABLED } from '../src/config/irlRules';
import { assertTestDatabase } from './test-give-coins';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = async () => {
  const f = arg('file'); if (!f) throw new Error('Précise le fichier : --file backend/data/irl-insee.json');
  const file = path.resolve(f);
  const text = readFileSync(file, 'utf8');
  const parsed = parseIrlFile(JSON.parse(text));
  if (!parsed.ok) { console.error(`Fichier refusé, rien n'est importé :\n- ${parsed.errors.join('\n- ')}`); process.exit(1); }
  const a = parsed.points[0]; const b = parsed.points[parsed.points.length - 1];
  console.log(`${file}\n${parsed.points.length} trimestres, de ${a.year}-T${a.quarter} à ${b.year}-T${b.quarter}.`);
  if (!flag('apply')) { console.log('\nSimulation : rien n\'est écrit. Ajoute --apply pour écrire (base de test seulement).'); return; }
  const database = assertTestDatabase(process.env.DATABASE_URL);        // refuse toute base qui ne finit pas par « _test » AVANT de se connecter
  console.log(`\nBase visée : ${database}`);
  const { initDatabase, closePool } = await import('../src/utils/db');
  const { irlService } = await import('../src/services/irlService');
  initDatabase();
  try {
    const r = await irlService.importIrl(parsed, createHash('sha256').update(text).digest('hex'));
    console.log(r.imported ? `Importé : ${r.rows} trimestres (import n° ${r.importId}).` : `Déjà importé (import n° ${r.importId}) : rien de plus n'a été écrit.`);
    console.log(`Source « insee » en base ; lecture par le moteur : ${IRL_ENABLED ? 'ACTIVE' : 'NON activée'}.`);
  } finally { await closePool(); }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
