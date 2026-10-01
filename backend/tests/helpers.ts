import { randomEventOn } from '../src/services/crypto/eventsService';
import { randomUUID } from 'crypto';
import { initDatabase, executeSchema, query, closePool } from '../src/utils/db';

export const hasDb = !!process.env.TEST_DATABASE_URL;

export const setupDb = async (): Promise<void> => {
  initDatabase();
  await executeSchema(); // schema.sql + migrations (idempotents)
  await resetPlayers();
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
};

export const teardownDb = async (): Promise<void> => {
  await closePool();
};

export const createUser = async (
  opts: { id?: string; balance?: number; tier?: 'free' | 'pro'; proOverride?: boolean; freeDomain?: string | null; verified?: boolean; code?: string; referredBy?: string } = {}
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
  if (opts.balance !== undefined) {
    await query('INSERT INTO investcoins_balance (user_id, balance) VALUES ($1, $2)', [id, opts.balance]);
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
