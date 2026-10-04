// Charge en base les taux préparés par immo:import-taxe-fonciere (backend/data/taxe-fonciere-dgfip.json). PRÉPARATION : le moteur actuel ne lit pas ces taux (PROPERTY_TAX_ENABLED = false).
//   npm run immo:load-taxe-fonciere -- --file backend/data/taxe-fonciere-dgfip.json           simulation : valide et affiche, n'écrit RIEN (aucune base n'est ouverte)
//   npm run immo:load-taxe-fonciere -- --file … --apply                                        écrit en base, SEULEMENT si la base visée se termine par « _test » (sinon refus). Rejouable.
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { parseTaxRateFile } from '../src/data/realEstate/taxes/rateFile';
import { PROPERTY_TAX_ENABLED } from '../src/config/propertyTaxRules';
import { assertTestDatabase } from './test-give-coins';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = async () => {
  const f = arg('file'); if (!f) throw new Error('Précise le fichier : --file backend/data/taxe-fonciere-dgfip.json');
  const file = path.resolve(f);
  const text = readFileSync(file, 'utf8');
  const parsed = parseTaxRateFile(JSON.parse(text));
  if (!parsed.ok) { console.error(`Fichier refusé, rien n'est importé :\n- ${parsed.errors.join('\n- ')}`); process.exit(1); }
  const years = parsed.rows.map((r) => r.year);
  console.log(`${file}\n${parsed.rows.length} taux, années ${Math.min(...years)} à ${Math.max(...years)}.`);
  if (!flag('apply')) { console.log('\nSimulation : rien n\'est écrit. Ajoute --apply pour écrire (base de test seulement).'); return; }
  const database = assertTestDatabase(process.env.DATABASE_URL);        // refuse toute base qui ne finit pas par « _test » AVANT de se connecter
  console.log(`\nBase visée : ${database}`);
  const { initDatabase, closePool } = await import('../src/utils/db');
  const { propertyTaxService } = await import('../src/services/propertyTaxService');
  initDatabase();
  try {
    const r = await propertyTaxService.importRates(parsed, createHash('sha256').update(text).digest('hex'));
    console.log(r.imported ? `Importé : ${r.rows} taux (import n° ${r.importId}).` : `Déjà importé (import n° ${r.importId}) : rien de plus n'a été écrit.`);
    console.log(`Source « dgfip-rei » en base ; lecture par le moteur : ${PROPERTY_TAX_ENABLED ? 'ACTIVE' : 'NON activée'}.`);
  } finally { await closePool(); }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
