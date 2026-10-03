import { fxService } from '../services/fxService';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { cryptoDataService, CryptoDataError } from '../services/crypto/dataService';
import { clockService, availableStarts, dataEnd } from '../services/crypto/clockService';
import { cryptoTradingService } from '../services/crypto/tradingService';
import { cryptoLoanService } from '../services/crypto/loanService';
import { rankingService } from '../services/crypto/rankingService';
import { eventsService } from '../services/crypto/eventsService';
import { compareAssets } from '../services/crypto/compare';
import { REALTIME_STATUS } from '../services/crypto/realtime';
import { ATTRIBUTION, DISCLAIMER, TIMEFRAMES, TF_LABELS, Timeframe, CRYPTO_DOMAIN } from '../config/cryptoMarketRules';
import { CATEGORY_LABELS, RISK_LABELS } from '../data/crypto/catalog';

const STATUS: Record<string, number> = { INVALID_INPUT: 400, NOT_FOUND: 404 };
const SYMBOL_RE = /^[A-Z0-9]{2,20}$/;

const wrap = (fallback: string, fn: (req: AuthRequest) => Promise<unknown>) => async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json(await fn(req));
  } catch (error) {
    if (error instanceof CryptoDataError) { res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code }); return; }
    console.error(fallback, error);
    res.status(500).json({ error: fallback });
  }
};

const symbolOf = (v: unknown): string => {
  if (typeof v !== 'string' || !SYMBOL_RE.test(v.toUpperCase())) throw new CryptoDataError('INVALID_INPUT', 'Symbole invalide');
  return v.toUpperCase();
};
const tfOf = (v: unknown): Timeframe => {
  if (typeof v !== 'string' || !(TIMEFRAMES as string[]).includes(v)) throw new CryptoDataError('INVALID_INPUT', `Unité de temps invalide (${TIMEFRAMES.join(', ')})`);
  return v as Timeframe;
};
const intOf = (v: unknown, name: string): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new CryptoDataError('INVALID_INPUT', `${name} invalide`);
  return Math.trunc(n);
};

// L'horloge vient TOUJOURS du compte du joueur (serveur). Aucun paramètre de date envoyé par le navigateur n'est lu, hormis le curseur « before »,
// lui-même replafonné à la date simulée.
const requireAccount = async (req: AuthRequest) => {
  const acc = await clockService.get(req.user!.userId);
  if (!acc) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé : choisis d\'abord ta date de départ.');
  return acc;
};

export const cryptoController = {
  state: wrap('Erreur lors de la lecture de l\'état Crypto', async (req) => {
    const acc = await clockService.get(req.user!.userId);
    const end = await dataEnd();
    const fx = acc ? await fxService.rateAt(acc.simulatedAt) : null;
    return {
      domain: CRYPTO_DOMAIN, hasAccount: !!acc, dataReady: end !== null,
      // Taux de change du jour de jeu (dollars pour 1 InvestCoin = 1 €) : décidé par le serveur ; null = indisponible, l'affichage reste en dollars.
      fx: acc ? { available: !!fx, usdPerCoin: fx?.perEur ?? null, rateDay: fx?.day ?? null, staleDays: fx?.staleDays ?? null, demo: fx?.demo ?? null, source: fx?.source ?? null } : null,
      account: acc ? { startAt: acc.startAt, simulatedAt: acc.simulatedAt, canAdvance: end !== null && acc.simulatedAt < end, dataEnd: end } : null,
      starts: acc ? null : await availableStarts(),
      timeframes: TIMEFRAMES.map((t) => ({ id: t, label: TF_LABELS[t] })),
      modes: [{ id: 'accelerated', label: 'Accéléré / Historique', available: true }, { id: 'realtime', label: 'Temps réel', ...REALTIME_STATUS }],
      categories: CATEGORY_LABELS, riskLabels: RISK_LABELS, attribution: ATTRIBUTION, disclaimer: DISCLAIMER,
    };
  }),

  create: wrap('Erreur lors de la création du compte Crypto', async (req) => {
    const acc = await clockService.create(req.user!.userId, req.body?.start);
    return { success: true, account: { startAt: acc.startAt, simulatedAt: acc.simulatedAt } };
  }),

  advance: wrap('Erreur lors de l\'avance du temps', async (req) => {
    const before = await requireAccount(req);
    const r = await cryptoTradingService.advance(req.user!.userId, req.body?.step);
    return { success: true, from: before.simulatedAt, simulatedAt: r.simulatedAt, events: r.events, marketEvents: r.marketEvents };
  }),

  assets: wrap('Erreur lors de la lecture des actifs', async (req) => {
    const acc = await requireAccount(req);
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 40) : undefined;
    const category = typeof req.query.category === 'string' && req.query.category in CATEGORY_LABELS ? req.query.category : undefined;
    return { simulatedAt: acc.simulatedAt, assets: await cryptoDataService.listAssets(acc.simulatedAt, { q, category, sort: typeof req.query.sort === 'string' ? req.query.sort : undefined }) };
  }),

  asset: wrap('Erreur lors de la lecture de l\'actif', async (req) => {
    const acc = await requireAccount(req);
    const symbol = symbolOf(req.params.symbol);
    return { simulatedAt: acc.simulatedAt, asset: await cryptoDataService.getAsset(symbol, acc.simulatedAt), timeframes: await cryptoDataService.availableTimeframes(symbol, acc.simulatedAt) };
  }),

  candles: wrap('Erreur lors de la lecture des bougies', async (req) => {
    const acc = await requireAccount(req);
    return cryptoDataService.getCandles(symbolOf(req.query.symbol), tfOf(req.query.tf ?? '1d'), acc.simulatedAt, { before: intOf(req.query.before, 'before'), limit: intOf(req.query.limit, 'limit') });
  }),

  quote: wrap('Erreur lors du chiffrage de l\'ordre', async (req) => cryptoTradingService.quote(req.user!.userId, symbolOf(req.query.symbol), req.query.side, req.query.quantity, req.query.amountCoins)),

  placeOrder: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const r = await cryptoTradingService.placeOrder(req.user!.userId, { ...(req.body ?? {}) }, req.ip);
      res.status(r.idempotent ? 200 : 201).json({ success: true, ...r });
    } catch (error) {
      if (error instanceof CryptoDataError) { res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code }); return; }
      console.error('Erreur ordre Crypto', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'ordre' });
    }
  },

  swap: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const r = await cryptoTradingService.swap(req.user!.userId, { ...(req.body ?? {}) }, req.ip);
      res.status(r.idempotent ? 200 : 201).json({ success: true, ...r });
    } catch (error) {
      if (error instanceof CryptoDataError) { res.status(STATUS[error.code] ?? 400).json({ error: error.message, code: error.code }); return; }
      console.error('Erreur échange Crypto', error);
      res.status(500).json({ error: 'Erreur lors de l\'échange' });
    }
  },
  events: wrap('Erreur lors de la lecture du journal du marché', async (req) => ({ events: await eventsService.list(req.user!.userId) })),

  loan: wrap('Erreur lors de la lecture du prêt', async (req) => cryptoLoanService.view(req.user!.userId)),
  loanQuote: wrap('Erreur lors de la simulation du prêt', async (req) => cryptoLoanService.quote(req.user!.userId, req.body?.amountCoins)),
  loanBorrow: wrap('Erreur lors de l\'emprunt', async (req) => ({ success: true, ...(await cryptoLoanService.borrow(req.user!.userId, req.body?.amountCoins)) })),
  loanRepay: wrap('Erreur lors du remboursement', async (req) => ({ success: true, ...(await cryptoLoanService.repay(req.user!.userId, req.body?.loanId, req.body?.coins)) })),
  leaderboard: wrap('Erreur lors de la lecture du classement', async (req) => rankingService.board(req.user!.userId, req.query.period)),

  cancelOrder: wrap('Erreur lors de l\'annulation', async (req) => ({ success: true, order: await cryptoTradingService.cancelOrder(req.user!.userId, String(req.params.id), req.ip) })),
  orders: wrap('Erreur lors de la lecture des ordres', async (req) => ({ orders: await cryptoTradingService.listOrders(req.user!.userId, req.query.status) })),
  portfolio: wrap('Erreur lors de la lecture du portefeuille', async (req) => cryptoTradingService.portfolio(req.user!.userId)),

  compare: wrap('Erreur lors de la comparaison', async (req) => {
    const acc = await requireAccount(req);
    const symbols = String(req.query.symbols ?? '').split(',').map((s) => symbolOf(s.trim()));
    if (symbols.length < 2 || symbols.length > 4 || new Set(symbols).size !== symbols.length) throw new CryptoDataError('INVALID_INPUT', 'Compare 2 à 4 actifs différents');
    return compareAssets(symbols, tfOf(req.query.tf ?? '1d'), acc.simulatedAt, Math.min(1000, intOf(req.query.limit, 'limit') ?? 300));
  }),
};
