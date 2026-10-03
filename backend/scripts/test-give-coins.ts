// Se donner des InvestCoins pour les tests, UNIQUEMENT sur une base de test.
//   npm run test:give-coins -- --user TEST --amount 50000
//
// Sécurité (à ne jamais assouplir) :
//  - refuse de tourner si le nom de la base visée par DATABASE_URL ne finit pas par « _test » (ex. investkit_design_test) ;
//    sans DATABASE_URL, il refuse aussi : on ne devine jamais la base visée. Rien n'est modifié dans ces cas ;
//  - vérifie une seconde fois, une fois connecté (SELECT current_database()) ;
//  - n'affiche jamais l'adresse de connexion (elle contient un mot de passe) : seulement le NOM de la base ;
//  - crédite par le registre (ledger) comme une opération normale (motif « test_gift », libellé « don de test ») + journal d'audit ;
//  - ne sert qu'à un compte EXISTANT (nom d'utilisateur ou e-mail) ; un compte inconnu donne une erreur ;
//  - jamais lancé automatiquement : à lancer à la main.
// À RETIRER ou BLOQUER avant l'ouverture au public (voir docs/PARAMETRES-A-RECONFIRMER.md).
import { env } from '../src/config/env';
import { initDatabase, getClient, closePool } from '../src/utils/db';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { auditLog } from '../src/services/auditService';

export const MAX_GIFT = 10_000_000;
export const TEST_GIFT_REASON = 'test_gift';
export const TEST_GIFT_LABEL = 'don de test';

export class GiveCoinsError extends Error {
  constructor(message: string) { super(message); this.name = 'GiveCoinsError'; }
}

// Nom de la base d'une adresse de connexion PostgreSQL (dernier segment du chemin, sans les options).
export const databaseNameOf = (url: string | undefined | null): string | null => {
  if (!url) return null;
  try {
    const name = decodeURIComponent(new URL(url).pathname.replace(/^\/+/, '').split('/')[0] ?? '');
    return name || null;
  } catch {
    return null;
  }
};

export const isTestDatabaseName = (name: string | null | undefined): boolean => typeof name === 'string' && name.length > '_test'.length && name.endsWith('_test');

// Refuse (sans rien modifier) si la base visée n'est pas une base de test. Retourne le nom de la base.
export const assertTestDatabase = (url: string | undefined | null): string => {
  if (!url) {
    throw new GiveCoinsError('Refusé : DATABASE_URL n\'est pas défini. Ce script ne devine jamais la base visée. Rien n\'a été modifié.');
  }
  const name = databaseNameOf(url);
  if (!name) throw new GiveCoinsError('Refusé : impossible de lire le nom de la base dans DATABASE_URL. Rien n\'a été modifié.');
  if (!isTestDatabaseName(name)) {
    throw new GiveCoinsError(`Refusé : la base visée s'appelle « ${name} » et son nom ne finit pas par « _test ». Ce script ne tourne que sur une base de test (ex. investkit_design_test). Rien n'a été modifié.`);
  }
  return name;
};

export interface GiveArgs { user: string; amount: number }

export const parseArgs = (argv: string[]): GiveArgs => {
  let user: string | undefined; let amountRaw: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--user') user = argv[++i];
    else if (argv[i] === '--amount') amountRaw = argv[++i];
    else throw new GiveCoinsError(`Option inconnue : ${argv[i]}. Usage : npm run test:give-coins -- --user NOM --amount 50000`);
  }
  if (!user || !user.trim()) throw new GiveCoinsError('Il manque --user (nom d\'utilisateur ou e-mail du compte). Usage : npm run test:give-coins -- --user NOM --amount 50000');
  if (amountRaw === undefined || !/^\d+$/.test(amountRaw)) throw new GiveCoinsError('--amount doit être un entier positif (ex. 50000).');
  const amount = Number(amountRaw);
  if (amount < 1 || amount > MAX_GIFT) throw new GiveCoinsError(`--amount doit être compris entre 1 et ${MAX_GIFT}.`);
  return { user: user.trim(), amount };
};

export interface GiveResult { database: string; userId: string; username: string | null; before: number; after: number; amount: number }

// Doit être appelée après initDatabase(). Une seule transaction : contrôle de la base, recherche du compte, crédit par le registre, audit.
export const giveCoins = async (args: GiveArgs, urlForCheck: string | undefined | null): Promise<GiveResult> => {   // pas de valeur par défaut : l'appelant donne explicitement l'adresse à contrôler
  const database = assertTestDatabase(urlForCheck);
  const client = await getClient();
  try {
    const current = String((await client.query('SELECT current_database() AS d')).rows[0].d);
    if (!isTestDatabaseName(current)) throw new GiveCoinsError(`Refusé : la base réellement connectée s'appelle « ${current} » (pas _test). Rien n'a été modifié.`);
    await client.query('BEGIN');
    const found = (await client.query(
      `SELECT id, username FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`, [args.user])).rows;
    if (found.length === 0) throw new GiveCoinsError(`Aucun compte « ${args.user} » (nom d'utilisateur ou e-mail). Ce script ne crée jamais de compte.`);
    if (found.length > 1) throw new GiveCoinsError(`Plusieurs comptes correspondent à « ${args.user} » : précise avec l'e-mail complet.`);
    const userId = String(found[0].id);
    const before = await investcoinsRepository.getBalance(userId, client);
    const after = await investcoinsRepository.applyTransaction(userId, args.amount, TEST_GIFT_REASON, { label: TEST_GIFT_LABEL, via: 'cli', database }, client);
    await auditLog({ userId, action: 'test_give_coins', entityType: 'user', entityId: userId, metadata: { amount: args.amount, label: TEST_GIFT_LABEL, database, via: 'cli' } }, client);
    await client.query('COMMIT');
    return { database, userId, username: found[0].username ?? null, before, after, amount: args.amount };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
};

const main = async (): Promise<void> => {
  try {
    const args = parseArgs(process.argv.slice(2));
    assertTestDatabase(env.database.url);        // avant toute connexion : rien n'est ouvert si la base n'est pas une base de test
    initDatabase();
    const r = await giveCoins(args, env.database.url);
    console.log(`Base : ${r.database}`);
    console.log(`Compte : ${r.username ?? '(sans nom)'} (${r.userId})`);
    console.log(`Solde avant : ${r.before} InvestCoins`);
    console.log(`+ ${r.amount} InvestCoins (« ${TEST_GIFT_LABEL} », enregistré dans le registre)`);
    console.log(`Solde après : ${r.after} InvestCoins`);
  } catch (e) {
    console.error(e instanceof GiveCoinsError ? e.message : `Erreur : ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => undefined);
  }
};

if (require.main === module) void main();
