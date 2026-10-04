import { query, getClient } from '../utils/db';
import { DOMAINS } from '../data/marketData';
import { START_SCENARIOS, DEFAULT_START_ID } from '../config/cryptoMarketRules';
import { clockService as cryptoClock, dataEnd, availableStarts } from './crypto/clockService';
import { cryptoTradingService } from './crypto/tradingService';
import { tradingService } from './tradingService';
import { realEstateLifeService } from './realEstateLifeService';
import { source } from './realEstateService';
import { virtualPortfolioRepository } from '../repositories/virtualPortfolioRepository';
import { CLOCK_STEPS, ClockStep, isClockStep, parseDay, dayString, addStepMs, addMonthsMs, chunkEnds, yearOf, monthIndex, lastPlayableDay, DAY_MS } from '../engine/clock';
import { MAX_ADVANCE_DAYS, MAX_ADVANCE_MONTHS } from '../config/clockRules';

// Horloge de jeu unique (6c). UNE date par joueur (mode Histoire) ; les trois domaines (Bourse, Crypto, Immobilier) suivent cette date.
// Le serveur décide de tout : le navigateur n'envoie jamais de date, seulement un pas (jour, semaine, mois, trimestre, année).
// Chaque domaine garde sa propre mécanique (ordres, intérêts annuels, règlement mensuel) mais n'avance QUE par cette fonction.
const MODE = 'history';
const BOURSE_MODE = 'accelerated';   // valeur de la colonne `mode` des portefeuilles de Bourse (historique du code)

export type ClockErrorCode = 'INVALID_INPUT' | 'NOT_STARTED' | 'STALE' | 'END' | 'BUSY' | 'MIGRATION_REQUIRED';
export class ClockError extends Error {
  constructor(public code: ClockErrorCode, message: string, public extra: Record<string, unknown> = {}) { super(message); this.name = 'ClockError'; }
}

export interface ClockRow { startDay: string; currentDay: string }

const read = async (userId: string): Promise<ClockRow | null> => {
  const r = (await query(`SELECT to_char(start_day, 'YYYY-MM-DD') AS s, to_char(current_day, 'YYYY-MM-DD') AS c FROM sim_clocks WHERE user_id = $1 AND mode = $2`, [userId, MODE])).rows[0];
  return r ? { startDay: r.s, currentDay: r.c } : null;
};

// Dernier jour jouable : fin des données Crypto importées, dernière année de la Bourse et de l'Immobilier.
export const endDayMs = async (): Promise<number | null> => {
  const cryptoEnd = await dataEnd();
  return lastPlayableDay([cryptoEnd, Date.UTC(DOMAINS.stocks.maxYear, 11, 31), Date.UTC(source().maxYear, 11, 31)]);
};

// Un événement « important » arrête l'avance au sous-pas où il se produit (appel de marge, ordre exécuté ou annulé, impayé, départ du locataire…).
export interface Recap {
  fromDay: string; toDay: string;
  crypto: { events: any[]; marketEvents: any[]; loanEvents: any[] };
  bourse: { year: number; domain: string; bankEvents: any[] }[];
  immo: { year: number; month: number; warnings: any[]; propertyEvents: string[] }[];
  stopped: boolean; stopReason: string | null;
}
const IMMO_IMPORTANT = /depart|left|notice|arrear|impay|default|vacan/i;
export const importantReason = (r: Pick<Recap, 'crypto' | 'bourse' | 'immo'>): string | null => {
  if (r.crypto.events.length) return 'Un ordre Crypto a été exécuté ou annulé.';
  if (r.crypto.loanEvents.length) return 'Ton prêt Crypto a déclenché un événement (échéance, appel de marge ou vente forcée).';
  if (r.bourse.some((b) => b.bankEvents.length)) return 'Ton prêt sur portefeuille a déclenché un événement (appel de marge ou vente forcée).';
  if (r.immo.some((m) => m.warnings.length || m.propertyEvents.some((k) => IMMO_IMPORTANT.test(k)))) return 'Un événement important est arrivé sur un de tes biens immobiliers.';
  return null;
};

const targetFor = (fromMs: number, opts: { step?: unknown; months?: unknown }): number => {
  if (opts.months !== undefined) {
    const n = opts.months;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_ADVANCE_MONTHS) throw new ClockError('INVALID_INPUT', `months doit être un entier entre 1 et ${MAX_ADVANCE_MONTHS}`);
    return addMonthsMs(fromMs, n);
  }
  if (opts.step === 'next_event') return fromMs + MAX_ADVANCE_DAYS * DAY_MS;
  if (!isClockStep(opts.step)) throw new ClockError('INVALID_INPUT', `Pas de temps invalide (${CLOCK_STEPS.join(', ')} ou next_event)`);
  return addStepMs(fromMs, opts.step as ClockStep);
};

// ── Rattrapage des domaines jusqu'à la date T (idempotent : un domaine déjà à T n'est pas touché, donc une reprise après panne est sans danger).
const syncCrypto = async (userId: string, t: number, recap: Recap) => {
  const acc = await cryptoClock.get(userId);
  if (!acc || acc.simulatedAt >= t) return;
  const r = await cryptoTradingService.advanceTo(userId, t);
  recap.crypto.events.push(...r.events); recap.crypto.marketEvents.push(...r.marketEvents); recap.crypto.loanEvents.push(...r.loanEvents);
};
const syncImmo = async (userId: string, t: number, recap: Recap) => {
  const g = (await query('SELECT simulated_year, simulated_month FROM re_games WHERE user_id = $1', [userId])).rows[0];
  if (!g) return;
  let idx = Number(g.simulated_year) * 12 + Number(g.simulated_month);
  const goal = monthIndex(t);
  while (idx < goal) {
    const r: any = await realEstateLifeService.advanceTime(userId, 1);
    for (const s of r.settled) recap.immo.push({ year: s.year, month: s.month, warnings: s.warnings ?? [], propertyEvents: (s.properties ?? []).flatMap((p: any) => p.events ?? []) });
    idx += 1;
  }
};
const syncBourse = async (userId: string, t: number, recap: Recap) => {
  const rows = (await query('SELECT domain, simulated_year FROM virtual_portfolios WHERE user_id = $1 AND mode = $2', [userId, BOURSE_MODE])).rows;
  for (const row of rows) {
    const dom = DOMAINS[row.domain];
    let y = Number(row.simulated_year);
    while (dom && y < Math.min(yearOf(t), dom.maxYear)) {
      const r: any = await tradingService.advanceYear(userId, row.domain);
      y = r.simulatedYear;
      recap.bourse.push({ year: y, domain: row.domain, bankEvents: r.bankEvents ?? [] });
    }
  }
};
const syncDomains = async (userId: string, t: number, recap: Recap) => { await syncCrypto(userId, t, recap); await syncImmo(userId, t, recap); await syncBourse(userId, t, recap); };

const emptyRecap = (fromDay: string): Recap => ({ fromDay, toDay: fromDay, crypto: { events: [], marketEvents: [], loanEvents: [] }, bourse: [], immo: [], stopped: false, stopReason: null });

const hasDomainState = async (userId: string): Promise<boolean> => {
  const r = (await query(
    `SELECT (EXISTS (SELECT 1 FROM crypto_accounts WHERE user_id = $1) OR EXISTS (SELECT 1 FROM re_games WHERE user_id = $1) OR EXISTS (SELECT 1 FROM virtual_portfolios WHERE user_id = $1)) AS b`, [userId])).rows[0];
  return !!r.b;
};

export const simClockService = {
  get: read,

  // Vue pour le navigateur : tout est décidé ici (jamais de date envoyée par le client).
  async view(userId: string) {
    const clock = await read(userId);
    const end = await endDayMs();
    const endDay = end === null ? null : dayString(end);
    if (!clock) return { mode: MODE, started: false, startDay: null, currentDay: null, endDay, canAdvance: false, starts: await availableStarts(), defaultStartId: DEFAULT_START_ID, steps: [...CLOCK_STEPS] };
    return { mode: MODE, started: true, startDay: clock.startDay, currentDay: clock.currentDay, endDay, canAdvance: end !== null && parseDay(clock.currentDay)! < end, starts: null, defaultStartId: DEFAULT_START_ID, steps: [...CLOCK_STEPS] };
  },

  // Création UNIQUE de la partie : le joueur choisit sa date de départ dans la liste fermée (jamais une date libre). Sans effet si elle existe déjà.
  async ensure(userId: string, startId?: unknown): Promise<ClockRow> {
    const existing = await read(userId);
    if (existing) return existing;
    // Sans choix du joueur : le départ par défaut s'il a des données, sinon le premier départ disponible (jamais une date sans données).
    let id: unknown = startId;
    if (id === undefined || id === null || id === '') {
      id = DEFAULT_START_ID;
      if ((await dataEnd()) !== null) { const av = await availableStarts(); if (!av.find((a) => a.id === DEFAULT_START_ID)?.available) id = av.find((a) => a.available)?.id ?? DEFAULT_START_ID; }
    }
    const sc = START_SCENARIOS.find((s) => s.id === id);
    if (!sc) throw new ClockError('INVALID_INPUT', 'Date de départ inconnue');
    if ((await dataEnd()) !== null && !(await availableStarts()).find((s) => s.id === sc.id)!.available) throw new ClockError('INVALID_INPUT', 'Aucune donnée importée pour cette date de départ');
    await query(`INSERT INTO sim_clocks (user_id, mode, start_day, current_day) VALUES ($1, $2, $3::date, $3::date) ON CONFLICT DO NOTHING`, [userId, MODE, sc.date]);
    return (await read(userId))!;
  },

  // Appelée avant toute action d'un domaine (portail de l'API) : donne l'horloge du joueur, la crée au départ par défaut pour un nouveau joueur,
  // refuse les parties d'avant l'horloge unique (elles passent par la migration), crée les portefeuilles de Bourse à la date de jeu et rattrape un domaine en retard.
  async gate(userId: string): Promise<ClockRow> {
    let clock = await read(userId);
    if (!clock) {
      if (await hasDomainState(userId)) throw new ClockError('MIGRATION_REQUIRED', 'Ta partie date d\'avant l\'horloge unique : elle doit être migrée (valeur conservée) avant de continuer. Contacte l\'administrateur.');
      clock = await this.ensure(userId);
    }
    const t = parseDay(clock.currentDay)!;
    for (const d of Object.values(DOMAINS)) await virtualPortfolioRepository.getOrCreate(userId, BOURSE_MODE, d.id, Math.max(d.minYear, yearOf(t)));
    await syncDomains(userId, t, emptyRecap(clock.currentDay));
    return clock;
  },

  // LA seule fonction qui change la date. Avance par sous-pas (un par 1er du mois franchi) : chaque domaine est rattrapé, puis la date est enregistrée.
  async advance(userId: string, opts: { step?: unknown; months?: unknown; fromDay?: unknown }): Promise<Recap & { currentDay: string }> {
    const lock = await getClient();
    try {
      const got = (await lock.query('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS ok', [`clock:${userId}`])).rows[0].ok;
      if (!got) throw new ClockError('BUSY', 'Une avance du temps est déjà en cours pour ton compte.');
      try {
        const clock = await this.gate(userId);
        if (opts.fromDay !== undefined && opts.fromDay !== clock.currentDay) throw new ClockError('STALE', 'Ta date de jeu a changé (autre onglet ?) : recharge la page.', { currentDay: clock.currentDay });
        const from = parseDay(clock.currentDay)!;
        const end = await endDayMs();
        if (end === null || from >= end) throw new ClockError('END', 'Fin des données disponibles : tu ne peux pas avancer davantage.');
        let target = targetFor(from, opts);
        if (target > end) {
          if (opts.step === 'next_event') target = end;
          else throw new ClockError('END', 'Fin des données disponibles : tu ne peux pas avancer davantage.');
        }
        const recap = emptyRecap(clock.currentDay);
        for (const t of chunkEnds(from, target)) {
          await syncDomains(userId, t, recap);
          await query(`UPDATE sim_clocks SET current_day = $3::date, updated_at = NOW() WHERE user_id = $1 AND mode = $2`, [userId, MODE, dayString(t)]);
          recap.toDay = dayString(t);
          const why = importantReason(recap);
          if (why && t < target) { recap.stopped = true; recap.stopReason = why; break; }
        }
        return { ...recap, currentDay: recap.toDay };
      } finally {
        await lock.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [`clock:${userId}`]);
      }
    } finally {
      lock.release();
    }
  },
};
