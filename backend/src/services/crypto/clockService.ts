import { query } from '../../utils/db';
import { ADVANCE_STEPS, AdvanceStep, DEFAULT_START_ID, START_SCENARIOS } from '../../config/cryptoMarketRules';
import { CryptoDataError } from './dataService';

const DAY = 86_400_000;

export interface CryptoAccount { userId: string; startAt: number; simulatedAt: number; taxState: any }

// Date de fin des données importées (dernier jour COMPLET) : on ne peut pas avancer au-delà.
export const dataEnd = async (): Promise<number | null> => {
  const r = (await query(`SELECT MAX(last_candle_at) AS m FROM crypto_assets WHERE last_candle_at IS NOT NULL`)).rows[0];
  return r.m ? new Date(r.m).getTime() + DAY : null;
};

// Dates de départ réellement proposables : au moins un actif coté (une bougie terminée) à cette date.
export const availableStarts = async () => {
  const out = [];
  for (const s of START_SCENARIOS) {
    const t = Date.parse(s.date + 'T00:00:00Z');
    const r = await query(`SELECT 1 FROM crypto_assets WHERE first_candle_at IS NOT NULL AND first_candle_at <= to_timestamp(($1::float8 - 86400000) / 1000.0) LIMIT 1`, [t]);
    out.push({ ...s, available: r.rows.length > 0 });
  }
  return out;
};

export const addStep = (ms: number, step: AdvanceStep): number => {
  if (step === 'day') return ms + DAY;
  if (step === 'week') return ms + 7 * DAY;
  // Même quantième le mois suivant, ramené à la fin du mois si besoin (31 janvier → 29 février) ; l'heure est conservée.
  const d = new Date(ms);
  const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0)).getUTCDate();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, Math.min(d.getUTCDate(), dim)) + (ms % DAY);
};

const toAccount = (r: any): CryptoAccount => ({ userId: r.user_id, startAt: new Date(r.start_at).getTime(), simulatedAt: new Date(r.simulated_at).getTime(), taxState: r.tax_state });

// Un compte de jeu ne peut pas exister sans horloge unique : si elle n'existe pas encore, elle démarre à la date du compte (sans effet sinon).
const ensureSimClock = async (userId: string, dayMs: number): Promise<void> => {
  const day = new Date(dayMs).toISOString().slice(0, 10);
  await query(`INSERT INTO sim_clocks (user_id, mode, start_day, current_day) VALUES ($1, 'history', $2::date, $2::date) ON CONFLICT DO NOTHING`, [userId, day]);
};

export const clockService = {
  async get(userId: string): Promise<CryptoAccount | null> {
    const r = (await query('SELECT * FROM crypto_accounts WHERE user_id = $1', [userId])).rows[0];
    return r ? toAccount(r) : null;
  },

  // Création UNIQUE du compte : le joueur choisit sa date de départ parmi celles proposées (jamais une date libre).
  async create(userId: string, startId: unknown): Promise<CryptoAccount> {
    const id = startId === undefined || startId === null || startId === '' ? DEFAULT_START_ID : startId;
    const scenario = START_SCENARIOS.find((s) => s.id === id);
    if (!scenario) throw new CryptoDataError('INVALID_INPUT', 'Date de départ inconnue');
    const starts = await availableStarts();
    if (!starts.find((s) => s.id === scenario.id)!.available) throw new CryptoDataError('INVALID_INPUT', 'Aucune donnée importée pour cette date de départ');
    const t = Date.parse(scenario.date + 'T00:00:00Z');
    await ensureSimClock(userId, t);
    await query(`INSERT INTO crypto_accounts (user_id, start_at, simulated_at) VALUES ($1, to_timestamp($2::float8 / 1000.0), to_timestamp($2::float8 / 1000.0)) ON CONFLICT (user_id) DO NOTHING`, [userId, t]);
    return (await clockService.get(userId))!;
  },

  // Création du compte à une date décidée par l'horloge unique (le joueur ne choisit plus la date ici). Sans effet si le compte existe déjà.
  async createAt(userId: string, dayMs: number): Promise<CryptoAccount> {
    const r = await query(`SELECT 1 FROM crypto_assets WHERE first_candle_at IS NOT NULL AND first_candle_at <= to_timestamp(($1::float8 - 86400000) / 1000.0) LIMIT 1`, [dayMs]);
    if (!r.rows.length) throw new CryptoDataError('INVALID_INPUT', 'Aucune donnée Crypto importée pour cette date de jeu.');
    await ensureSimClock(userId, dayMs);
    await query(`INSERT INTO crypto_accounts (user_id, start_at, simulated_at) VALUES ($1, to_timestamp($2::float8 / 1000.0), to_timestamp($2::float8 / 1000.0)) ON CONFLICT (user_id) DO NOTHING`, [userId, dayMs]);
    return (await clockService.get(userId))!;
  },

  // Nouvelle date simulée (le serveur décide ; aucun retour en arrière). Les hooks (ordres, événements, prêts) sont branchés par le moteur d'ordres.
  async nextDate(account: CryptoAccount, step: unknown): Promise<number> {
    if (!(ADVANCE_STEPS as readonly string[]).includes(step as string)) throw new CryptoDataError('INVALID_INPUT', 'Pas de temps invalide (day, week ou month)');
    const target = addStep(account.simulatedAt, step as AdvanceStep);
    const end = await dataEnd();
    if (end === null || target > end) throw new CryptoDataError('INVALID_INPUT', 'Fin des données disponibles : tu ne peux pas avancer davantage.');
    return target;
  },
};
