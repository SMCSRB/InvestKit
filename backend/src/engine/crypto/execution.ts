import { CRYPTO_ECONOMY as E } from '../../config/cryptoMarketRules';
import type { Candle } from './candles';

export type Side = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';

// Un ordre « maker » attend dans le carnet à son prix (limite, take-profit) ; un ordre « taker » prend la liquidité (marché, stop-loss).
export const isMakerType = (t: OrderType): boolean => t === 'limit' || t === 'take_profit';

export const feeCoins = (notionalCoins: number, tier: number, maker: boolean): number => {
  if (notionalCoins <= 0) return 0;
  const pct = (E.feePctTaker[tier] ?? E.feePctTaker[4]) * (maker ? E.makerFactor : 1);
  return Math.max(E.minFeeCoins, Math.ceil(Math.round(notionalCoins * pct * 1e4) / 1e6));
};

// Glissement (fraction) : croît avec la racine de la taille de l'ordre rapportée au volume quotidien moyen.
export const slippageFraction = (notionalUsd: number, avgDailyVolumeUsd: number): number => {
  if (notionalUsd <= 0) return 0;
  if (!(avgDailyVolumeUsd > 0)) return E.slippage.maxFraction;
  return Math.min(E.slippage.maxFraction, E.slippage.k * Math.sqrt(notionalUsd / avgDailyVolumeUsd));
};

// `usdPerCoin` : dollars pour 1 InvestCoin (= 1 €) ce jour-là, d'après le taux de la BCE ; décidé par le serveur. Prix, écart et glissement restent en dollars ;
// seul le montant final est converti en pièces. Défaut 1 : 1 InvestCoin = 1 $ (tests du moteur).
export interface ExecInput { side: Side; refPrice: number; quantity: number; tier: number; avgDailyVolumeUsd: number; maker: boolean; stressMultiplier?: number; usdPerCoin?: number }
export interface Execution { price: number; spreadPct: number; slippagePct: number; notionalCoins: number; feeCoins: number }

// Prix effectif : un achat paie plus cher, une vente reçoit moins (demi-écart + glissement). Un ordre maker s'exécute à son prix, sans écart ni glissement.
// Montant en pièces entières, arrondi CONTRE le joueur (achat : supérieur ; vente : inférieur), comme le reste du registre.
export const executeAt = (i: ExecInput): Execution => {
  const mult = i.stressMultiplier && i.stressMultiplier > 1 ? i.stressMultiplier : 1;   // épisode de volatilité extrême : écart et glissement multipliés
  const spreadPct = i.maker ? 0 : (E.spreadPct[i.tier] ?? E.spreadPct[4]) * mult;
  const notionalUsdRef = i.refPrice * i.quantity;
  const slip = i.maker ? 0 : Math.min(E.slippage.maxFraction * mult, slippageFraction(notionalUsdRef, i.avgDailyVolumeUsd) * mult);
  const factor = 1 + (i.side === 'buy' ? 1 : -1) * (spreadPct / 200 + slip);
  const price = Math.max(0, i.refPrice * factor);
  const rate = i.usdPerCoin ?? 1;
  if (!(rate > 0) || !Number.isFinite(rate)) throw new Error('Taux de change invalide');
  const raw = (price * i.quantity) / rate;
  const notionalCoins = i.side === 'buy' ? Math.ceil(raw - 1e-9) : Math.floor(raw + 1e-9);
  return { price, spreadPct, slippagePct: slip * 100, notionalCoins, feeCoins: feeCoins(notionalCoins, i.tier, i.maker) };
};

export interface Resting { side: Side; type: OrderType; triggerPrice: number }
export interface RestingFill { ts: number; refPrice: number; maker: boolean }

// Évalue un ordre en attente sur des bougies (ordre chronologique) : retourne la première exécution, sinon null.
//  - limite d'achat : exécutée si le plus bas ≤ limite, au meilleur de (ouverture, limite) ; limite de vente : plus haut ≥ limite.
//  - take-profit (vente) : comme une limite de vente.
//  - stop-loss (vente) : déclenché si le plus bas ≤ seuil ; exécuté « au marché » au pire de (ouverture, seuil) (un trou à la baisse traverse le seuil).
export const evaluateResting = (o: Resting, candles: Candle[]): RestingFill | null => {
  for (const c of candles) {
    if (o.type === 'limit' && o.side === 'buy' && c.l <= o.triggerPrice) return { ts: c.ts, refPrice: Math.min(c.o, o.triggerPrice), maker: true };
    if ((o.type === 'limit' && o.side === 'sell' || o.type === 'take_profit') && c.h >= o.triggerPrice) return { ts: c.ts, refPrice: Math.max(c.o, o.triggerPrice), maker: true };
    if (o.type === 'stop_loss' && c.l <= o.triggerPrice) return { ts: c.ts, refPrice: Math.min(c.o, o.triggerPrice), maker: false };
  }
  return null;
};

// Quantité décimale saisie sous forme de TEXTE (jamais de flottant) : au plus 8 décimales, strictement positive, bornée.
export const parseQuantity = (raw: unknown, max = 1e12): string | null => {
  const s = typeof raw === 'number' ? (Number.isFinite(raw) ? raw.toFixed(8).replace(/\.?0+$/, '') : '') : typeof raw === 'string' ? raw.trim() : '';
  if (!/^\d{1,15}(\.\d{1,8})?$/.test(s)) return null;
  const n = Number(s);
  if (!(n > 0) || n > max) return null;
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

// Arrondi à 8 décimales vers le bas (quantité achetable avec un budget).
export const floorQty8 = (x: number): string => {
  const f = Math.floor(x * 1e8 + 1e-6) / 1e8;
  return f.toFixed(8).replace(/\.?0+$/, '') || '0';
};
