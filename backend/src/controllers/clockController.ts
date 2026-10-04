import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { simClockService, ClockError } from '../services/simClockService';
import { modeAccessService } from '../services/modeAccessService';
import { CryptoDataError } from '../services/crypto/dataService';
import { TradingError } from '../services/tradingService';
import { RealEstateError } from '../services/realEstateService';
import { parseDay } from '../engine/clock';
import { clockService as cryptoClock } from '../services/crypto/clockService';
import { query } from '../utils/db';
import { yearOf } from '../engine/clock';

const STATUS: Record<string, number> = { INVALID_INPUT: 400, END: 400, NOT_STARTED: 409, STALE: 409, BUSY: 409, MIGRATION_REQUIRED: 409 };

// Traduit les erreurs de l'horloge et des domaines en réponses HTTP (l'horloge est la seule à avancer le temps).
const fail = (res: Response, e: unknown, fallback: string): void => {
  if (e instanceof ClockError) { res.status(STATUS[e.code] ?? 400).json({ error: e.message, code: e.code, ...e.extra }); return; }
  if (e instanceof CryptoDataError || e instanceof TradingError || e instanceof RealEstateError) { res.status(({ NOT_FOUND: 404, NO_GAME: 409 } as Record<string, number>)[(e as any).code] ?? 400).json({ error: (e as Error).message, code: (e as any).code }); return; }
  console.error(fallback, e);
  res.status(500).json({ error: fallback });
};

const run = (fallback: string, fn: (req: AuthRequest, uid: string) => Promise<unknown>) => async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
  try { res.json(await fn(req, req.user.userId)); } catch (e) { fail(res, e, fallback); }
};

// Portail : avant toute action d'un domaine, l'horloge du joueur existe, ses domaines sont à la bonne date (voir simClockService.gate).
export const clockGate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Non authentifié' }); return; }
  try { await simClockService.gate(req.user.userId); next(); } catch (e) { fail(res, e, 'Erreur d\'horloge de jeu'); }
};

export const clockController = {
  modes: run('Erreur lors de la lecture des modes', (_r, uid) => modeAccessService.view(uid)),
  view: run('Erreur lors de la lecture de l\'horloge', (_r, uid) => simClockService.view(uid)),
  start: run('Erreur lors du choix de la date de départ', async (r, uid) => { await simClockService.ensure(uid, r.body?.start); return simClockService.view(uid); }),
  advance: run('Erreur lors de l\'avance du temps', async (r, uid) => {
    const from = r.body?.from;
    if (from !== undefined && parseDay(from) === null) throw new ClockError('INVALID_INPUT', 'Date « from » invalide (AAAA-MM-JJ)');
    const recap = await simClockService.advance(uid, { step: r.body?.step, months: r.body?.months, fromDay: from });
    return { success: true, ...recap };
  }),

  // Anciens boutons d'avance : ils passent TOUS par l'horloge unique et gardent la forme de réponse que les pages attendent.
  legacyBourse: run('Erreur lors de l\'avancée dans le temps', async (r, uid) => {
    const domain = typeof r.body?.domain === 'string' ? r.body.domain : 'stocks';
    const recap = await simClockService.advance(uid, { step: 'year' });
    return { success: true, simulatedYear: yearOf(parseDay(recap.currentDay)!), bankEvents: recap.bourse.filter((b) => b.domain === domain).flatMap((b) => b.bankEvents), clock: { currentDay: recap.currentDay, stopped: recap.stopped, stopReason: recap.stopReason } };
  }),
  legacyCrypto: run('Erreur lors de l\'avance du temps', async (r, uid) => {
    if (!['day', 'week', 'month'].includes(r.body?.step)) throw new ClockError('INVALID_INPUT', 'Pas de temps invalide (day, week ou month)');
    if (!(await cryptoClock.get(uid))) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé');
    const recap = await simClockService.advance(uid, { step: r.body.step });
    return { success: true, from: parseDay(recap.fromDay)!, simulatedAt: parseDay(recap.toDay)!, events: recap.crypto.events, marketEvents: recap.crypto.marketEvents, loanEvents: recap.crypto.loanEvents, clock: { currentDay: recap.currentDay, stopped: recap.stopped, stopReason: recap.stopReason } };
  }),
  legacyImmo: run('Erreur lors de l\'avancée du temps', async (r, uid) => {
    if (!(await query('SELECT 1 FROM re_games WHERE user_id = $1', [uid])).rows.length) throw new RealEstateError('NO_GAME', 'Choisis d\'abord ton profil immobilier');
    const recap = await simClockService.advance(uid, { months: r.body?.months });
    const d = parseDay(recap.currentDay)!;
    return { year: yearOf(d), month: new Date(d).getUTCMonth() + 1, settled: recap.immo, clock: { currentDay: recap.currentDay, stopped: recap.stopped, stopReason: recap.stopReason } };
  }),
};
