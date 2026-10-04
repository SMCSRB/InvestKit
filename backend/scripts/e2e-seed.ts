// Prépare la base de test des parcours navigateur (Playwright) : migrations, jeu Crypto FICTIF, taux de change plats, un compte Pro de test.
//   DATABASE_URL=postgresql://…/investkit_e2e_test E2E_EMAIL=… E2E_PASSWORD=… npm run e2e:seed
//
// Sécurité (comme test-give-coins) :
//  - refuse de tourner si le nom de la base de DATABASE_URL ne finit pas par « _test » ; sans DATABASE_URL, il refuse aussi ;
//  - vérifie une seconde fois, une fois connecté (SELECT current_database()) ;
//  - n'affiche jamais l'adresse de connexion ni le mot de passe ;
//  - le mot de passe du compte vient de E2E_PASSWORD (jamais écrit dans le dépôt : la CI en génère un au hasard à chaque exécution).
import bcrypt from 'bcrypt';
import { initDatabase, closePool, executeSchema, query } from '../src/utils/db';
import { assertTestDatabase, isTestDatabaseName } from './test-give-coins';
import { cryptoDataService } from '../src/services/crypto/dataService';
import { importDemo } from '../src/services/crypto/importer';
import { FIRST_STEP_BONUSES } from '../src/config/economy';
import { realEstateService } from '../src/services/realEstateService';
import { fictiveDataSource } from '../src/data/realEstate/fictiveCatalog';

export const seedE2e = async (urlForCheck: string | undefined, email: string, password: string): Promise<string> => {
  const database = assertTestDatabase(urlForCheck);
  if (!email.includes('@') || password.length < 12) throw new Error('E2E_EMAIL (adresse) et E2E_PASSWORD (12 caractères au moins) sont obligatoires.');
  const current = String((await query('SELECT current_database() AS d')).rows[0].d);
  if (!isTestDatabaseName(current)) throw new Error(`Refusé : la base réellement connectée s'appelle « ${current} » (pas _test). Rien n'a été modifié.`);

  await cryptoDataService.seedCatalog();
  await importDemo();   // jeu FICTIF : jamais présenté comme de vrais cours
  await query('DELETE FROM fx_rates');
  await query(
    `INSERT INTO fx_rates (day, currency, per_eur, source, demo)
     SELECT d::date, 'USD', 1.1, 'e2e-taux-plat', TRUE FROM generate_series('2013-01-01'::date, '2026-12-31'::date, interval '1 day') AS d WHERE extract(isodow FROM d) < 6`);

  await query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);
  const hash = await bcrypt.hash(password, 10);
  const id = String((await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, username, subscription_tier, verified, referral_code, active_days)
     VALUES ($1, $2, 'Test', 'Navigateur', 'testeur-e2e', 'pro', TRUE, 'e2e-test', 5) RETURNING id`, [email.toLowerCase(), hash])).rows[0].id);
  await query('INSERT INTO investcoins_balance (user_id, balance) VALUES ($1, 50000)', [id]);
  for (const [key, coins] of Object.entries(FIRST_STEP_BONUSES)) {
    await query('INSERT INTO first_step_bonuses (user_id, step_key, coins) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, key, coins]);
  }

  // Une partie Immobilier avec un bien en bon état, sans travaux : le tableau de bord a de quoi expliquer sa « performance ».
  await realEstateService.startGame(id, 'employee');
  let choisi: Awaited<ReturnType<typeof fictiveDataSource.listListings>>[number] | undefined;
  for (const l of await fictiveDataSource.listListings(2010)) {
    if (l.type === 'studio' && l.condition === 'good' && l.advertisedWorks === 0 && (await fictiveDataSource.getExpertise(l.id, 2010))!.hiddenDefects.length === 0) { choisi = l; break; }
  }
  if (!choisi) throw new Error('Aucune annonce de départ adaptée dans le catalogue.');
  const apport = Math.ceil(choisi.price * (choisi.age === 'old' ? 0.075 : 0.025) + choisi.price * 0.1) + 50;   // notaire + 10 % du prix, avec une marge
  await realEstateService.purchase(id, { listingId: choisi.id, downPaymentCoins: apport, months: 240 });
  return database;
};

const main = async () => {
  const url = process.env.DATABASE_URL;
  assertTestDatabase(url);                       // contrôle AVANT toute connexion
  await initDatabase();
  await executeSchema();
  const database = await seedE2e(url, process.env.E2E_EMAIL ?? '', process.env.E2E_PASSWORD ?? '');
  console.log(`Base de test « ${database} » prête (compte Pro de test créé).`);
};

if (require.main === module) {
  main().then(() => closePool()).catch(async (e) => { console.error(e instanceof Error ? e.message : e); await closePool().catch(() => undefined); process.exit(1); });
}
