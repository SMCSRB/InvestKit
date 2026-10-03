import { query } from '../utils/db';
import type { Queryable } from '../repositories/investcoinsRepository';
import { FX_DEMO_USD_PER_EUR, FX_MAX_STALE_DAYS } from '../config/economy';
import { dayOf, pickRate, type FxRate } from '../engine/fx';

// Taux de change du jeu : EUR/USD de la BCE, lus dans la table fx_rates. Le serveur décide du taux (jamais le navigateur) et l'enregistre
// avec chaque opération. Le taux d'un instant de jeu T est le dernier taux PUBLIÉ AVANT le jour de T (comme la bougie de clôture de la veille).
export const FX_SOURCE_ECB = 'BCE (taux de référence EUR/USD)';
export const CURRENCY = 'USD';
const DAY_MS = 86_400_000;

export class FxUnavailableError extends Error {
  code = 'FX_UNAVAILABLE' as const;
  constructor(message = 'Taux de change indisponible pour cette date : la conversion en InvestCoins est impossible pour le moment.') { super(message); this.name = 'FxUnavailableError'; }
}

export interface FxQuote { perEur: number; day: string; staleDays: number; source: string; demo: boolean }

const rowQuote = (r: any, target: string): FxQuote => ({
  perEur: Number(r.per_eur), day: String(r.day), staleDays: Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${r.day}T00:00:00Z`)) / DAY_MS), source: String(r.source), demo: r.demo === true,
});

export const fxService = {
  // Dernier taux publié au plus tard ce jour-là (repli sur le jour ouvré précédent, pas plus de FX_MAX_STALE_DAYS jours). null = indisponible.
  async rateOnDay(day: string, db: Queryable = { query } as Queryable): Promise<FxQuote | null> {
    const r = (await db.query(
      `SELECT day::text AS day, per_eur::float8 AS per_eur, source, demo FROM fx_rates
        WHERE currency = $1 AND day <= $2::date AND day > ($2::date - $3::int) ORDER BY day DESC LIMIT 1`, [CURRENCY, day, FX_MAX_STALE_DAYS + 1])).rows[0];
    return r ? rowQuote(r, day) : null;
  },

  // Taux applicable à un instant de jeu : dernier taux publié strictement avant le jour de cet instant.
  async rateAt(simMs: number, db: Queryable = { query } as Queryable): Promise<FxQuote | null> {
    return fxService.rateOnDay(dayOf(simMs - DAY_MS), db);
  },

  async requireRateAt(simMs: number, db: Queryable = { query } as Queryable): Promise<FxQuote> {
    const q = await fxService.rateAt(simMs, db);
    if (!q) throw new FxUnavailableError();
    return q;
  },

  // Fonction « taux du jour » pour convertir une série de bougies : un seul aller-retour en base pour toute la période.
  async dayRater(fromMs: number, toMs: number, db: Queryable = { query } as Queryable): Promise<(ms: number) => number | null> {
    const rows = (await db.query(
      `SELECT day::text AS day, per_eur::float8 AS per_eur FROM fx_rates WHERE currency = $1 AND day >= $2::date AND day <= $3::date ORDER BY day`,
      [CURRENCY, dayOf(fromMs - (FX_MAX_STALE_DAYS + 1) * DAY_MS), dayOf(toMs)])).rows;
    const rates: FxRate[] = rows.map((r: any) => ({ day: r.day, perEur: Number(r.per_eur) }));
    const memo = new Map<string, number | null>();
    return (ms: number) => {
      const d = dayOf(ms);
      if (!memo.has(d)) memo.set(d, pickRate(rates, d, FX_MAX_STALE_DAYS)?.perEur ?? null);
      return memo.get(d)!;
    };
  },

  // Écrit des taux réels (remplace un taux de démonstration du même jour). Idempotent.
  async importRates(rates: FxRate[], source: string = FX_SOURCE_ECB, db: Queryable = { query } as Queryable): Promise<number> {
    let n = 0;
    for (let i = 0; i < rates.length; i += 500) {
      const chunk = rates.slice(i, i + 500);
      const r = await db.query(
        `INSERT INTO fx_rates (day, currency, per_eur, source, demo)
         SELECT d::date, $1, v::numeric, $2, FALSE FROM unnest($3::text[], $4::text[]) AS t(d, v)
         ON CONFLICT (day, currency) DO UPDATE SET per_eur = EXCLUDED.per_eur, source = EXCLUDED.source, demo = FALSE, imported_at = NOW()`,
        [CURRENCY, source, chunk.map((x) => x.day), chunk.map((x) => String(x.perEur))]);
      n += r.rowCount ?? chunk.length;
    }
    return n;
  },

  // Taux FICTIFS de démonstration (jours ouvrés, taux constant), JAMAIS par-dessus un taux réel. Marqués « demo ».
  async seedDemoRates(fromDay = '2013-01-01', toDay = '2026-12-31', db: Queryable = { query } as Queryable): Promise<number> {
    const r = await db.query(
      `INSERT INTO fx_rates (day, currency, per_eur, source, demo)
       SELECT d::date, $1, $4::numeric, 'demo-fictif', TRUE FROM generate_series($2::date, $3::date, interval '1 day') AS d
        WHERE extract(isodow FROM d) < 6
       ON CONFLICT (day, currency) DO NOTHING`, [CURRENCY, fromDay, toDay, FX_DEMO_USD_PER_EUR]);
    return r.rowCount ?? 0;
  },

  // État pour l'interface et l'administration : taux disponibles ? derniers jours couverts ? taux réels ou de démonstration ?
  async status(db: Queryable = { query } as Queryable): Promise<{ available: boolean; lastDay: string | null; firstDay: string | null; real: number; demo: number }> {
    const r = (await db.query(
      `SELECT MIN(day)::text AS first_day, MAX(day)::text AS last_day, COUNT(*) FILTER (WHERE NOT demo)::int AS real, COUNT(*) FILTER (WHERE demo)::int AS demo FROM fx_rates WHERE currency = $1`, [CURRENCY])).rows[0];
    return { available: Number(r.real) + Number(r.demo) > 0, lastDay: r.last_day ?? null, firstDay: r.first_day ?? null, real: Number(r.real), demo: Number(r.demo) };
  },
};
