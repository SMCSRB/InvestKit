import { EUROS_PER_COIN, FIRST_STEP_BONUSES } from '../src/config/economy';
import { randomEventOn } from '../src/services/crypto/eventsService';
import { randomUUID } from 'crypto';
import { initDatabase, executeSchema, query, closePool } from '../src/utils/db';

export const hasDb = !!process.env.TEST_DATABASE_URL;

// Les montants en pièces écrits avant le passage à 1 InvestCoin = 1 € valaient 20 € chacun en Immobilier :
// legacyCoins(n) donne le même montant en euros avec la règle actuelle (les assertions en euros restent donc valables).
export const legacyCoins = (n: number): number => Math.round((n * 20) / EUROS_PER_COIN);

export const setupDb = async (): Promise<void> => {
  initDatabase();
  await executeSchema(); // schema.sql + migrations (idempotents)
  await resetPlayers();
  await seedTestIrl();
};

// IRL FABRIQUÉ pour les tests (le jeu lit l'IRL réel de l'Insee, absent d'une base de test) : 1999-T1 à 2026-T4, +0,5 par trimestre à partir de 100 (variation annuelle d'environ 1,5 %).
// Aucune valeur réelle. Posé seulement si la table est vide ; loyersAnil.test.ts la vide puis la repose lui-même.
export const seedTestIrl = async (): Promise<void> => {
  if (Number((await query('SELECT COUNT(*) AS n FROM immo_irl')).rows[0].n) > 0) return;
  const imp = (await query(`INSERT INTO immo_irl_imports (first_quarter, last_quarter, row_count, checksum) VALUES ('1999-T1', '2026-T4', 112, 'fixture-irl-fabriquee') ON CONFLICT (checksum) DO UPDATE SET row_count = 112 RETURNING id`)).rows[0];
  await query(`INSERT INTO immo_irl (year, quarter, value, import_id)
               SELECT 1999 + i / 4, (i % 4) + 1, 100 + 0.5 * i, $1 FROM generate_series(0, 111) AS i ON CONFLICT (year, quarter) DO NOTHING`, [imp.id]);
};

// La base de test est PARTAGÉE et n'était jamais vidée : chaque exécution y laissait ses joueurs (plus de 33 000 après
// quelques semaines). Les classements, les statistiques et les temps d'exécution dépendaient donc de l'historique des
// exécutions précédentes (et de l'ordre des fichiers) : un test pouvait passer seul et échouer dans la suite complète.
// On repart donc d'une base sans joueur à l'ouverture de chaque fichier de test. Garde-fou : jamais hors d'une base « test ».
// Les données de référence (catalogue, cours importés, migrations) ne dépendent pas des joueurs et sont conservées.
export const resetPlayers = async (): Promise<void> => {
  const name = (await query('SELECT current_database() AS db')).rows[0].db as string;
  if (!/test/i.test(name)) throw new Error(`Refus de vider la base « ${name} » : son nom ne contient pas « test ».`);
  await query('TRUNCATE users CASCADE');
  await query('TRUNCATE leaderboard_rankings');
  await query('TRUNCATE investcoins_ledger_archive');   // totaux anonymes des comptes supprimés : repartent de zéro avec les joueurs
};

export const teardownDb = async (): Promise<void> => {
  await closePool();
};

export const createUser = async (
  opts: { id?: string; balance?: number; tier?: 'free' | 'pro'; proOverride?: boolean; freeDomain?: string | null; verified?: boolean; code?: string; referredBy?: string; firstStepsPending?: boolean; activeDays?: number } = {}
): Promise<string> => {
  const id = opts.id ?? randomUUID();
  await query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, subscription_tier, pro_override,
                        free_domain, verified, verification_code, referred_by_user_id, referral_code)
     VALUES ($1, $2, 'x', 'T', 'T', $3, $4, $5, $6, $7, $8, $9)`,
    [
      id, `${id}@test.local`, opts.tier ?? 'free', opts.proOverride ?? false, opts.freeDomain ?? null,
      opts.verified ?? true, opts.code ?? null, opts.referredBy ?? null, id.slice(0, 8),
    ]
  );
  if (opts.activeDays) await query('UPDATE users SET active_days = $2 WHERE id = $1', [id, opts.activeDays]);   // jours actifs (seuil de classement)
  if (opts.balance !== undefined) {
    await query('INSERT INTO investcoins_balance (user_id, balance) VALUES ($1, $2)', [id, opts.balance]);
  }
  // Par défaut, les bonus « premiers pas » sont déjà reçus : les tests de montants exacts (achats, quiz, registre) restent centrés sur leur sujet.
  // Les tests des bonus eux-mêmes demandent un compte neuf avec { firstStepsPending: true }.
  if (!opts.firstStepsPending) {
    for (const [key, coins] of Object.entries(FIRST_STEP_BONUSES)) {
      await query('INSERT INTO first_step_bonuses (user_id, step_key, coins) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, key, coins]);
    }
  }
  return id;
};

export const balanceOf = async (userId: string): Promise<number> => {
  const r = await query('SELECT balance FROM investcoins_balance WHERE user_id = $1', [userId]);
  return r.rows[0]?.balance ?? 0;
};

export const ledgerSum = async (userId: string): Promise<number> => {
  const r = await query('SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions WHERE user_id = $1', [userId]);
  return r.rows[0].s;
};

// Les incidents aléatoires du jeu Crypto (plateforme indisponible un jour donné) sont tirés d'après l'identifiant du
// joueur. Avec un identifiant aléatoire, un test d'ordre ou d'échange tombait environ une fois sur cent sur un jour
// d'incident et échouait sans rapport avec ce qu'il vérifie. Ici : un identifiant sans incident sur toute la fenêtre
// de test (un an à partir de la date de départ). Les épisodes de volatilité restent possibles : les tests y résistent.
export const calmUserId = (startMs = Date.parse('2020-01-01T00:00:00Z'), days = 400): string => {
  for (let i = 0; i < 10_000; i++) {
    const id = randomUUID();
    let outage = false;
    for (let d = 0; d <= days && !outage; d++) outage = randomEventOn(id, startMs + d * 86_400_000) === 'outage';
    if (!outage) return id;
  }
  throw new Error('Aucun identifiant sans incident trouvé');
};

// Taux de change plat pour les tests de la Crypto : `rate` dollars pour 1 InvestCoin sur tous les jours ouvrés (1 = 1 InvestCoin vaut 1 $, les montants
// des anciens tests restent lisibles). Remplace le taux de démonstration écrit par importDemo ; les tests du taux lui-même choisissent leur valeur.
export const setFlatFx = async (rate = 1): Promise<void> => {
  await query('DELETE FROM fx_rates');
  await query(
    `INSERT INTO fx_rates (day, currency, per_eur, source, demo)
     SELECT d::date, 'USD', $1::numeric, 'test-taux-plat', TRUE FROM generate_series('2013-01-01'::date, '2026-12-31'::date, interval '1 day') AS d WHERE extract(isodow FROM d) < 6`, [rate]);
};

// Apport minimum de la banque (frais de notaire + 10 % du prix) en pièces, avec une petite marge d'arrondi. Pour les tests d'achat.
export const minDownCoins = (l: { price: number; age: string }, margin = 50): number =>
  Math.ceil((l.price * (l.age === 'old' ? 0.075 : 0.025) + l.price * 0.1) / EUROS_PER_COIN) + margin;
