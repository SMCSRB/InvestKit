import { CATALOG } from '../../data/crypto/catalog';
import { DEMO_SPECS, generateDemoCandles } from '../../data/crypto/demoData';
import { BaseTimeframe } from '../../config/cryptoMarketRules';
import { cryptoDataService } from './dataService';
import { MarketDataProvider, HttpGet, coinGeckoMarketCaps } from './providers';
import { query } from '../../utils/db';
import { fxService } from '../fxService';

export interface ImportOptions { provider: MarketDataProvider; symbols: string[]; tf: BaseTimeframe; fromMs: number; toMs: number; http?: HttpGet; log?: (m: string) => void; continueOnError?: boolean }
export interface ImportReport { symbol: string; status: 'ok' | 'empty' | 'error'; written: number; rejected: number; gaps: number; error?: string }

// Importe de VRAIES données depuis un fournisseur. Écrit dans crypto_candles ; ne fabrique rien ; un symbole sans donnée est simplement signalé « vide ».
export const runImport = async (o: ImportOptions): Promise<ImportReport[]> => {
  const log = o.log ?? (() => {});
  await cryptoDataService.seedCatalog();
  const reports: ImportReport[] = [];
  for (const symbol of o.symbols) {
    const entry = CATALOG.find((c) => c.symbol === symbol);
    if (!entry) { reports.push({ symbol, status: 'error', written: 0, rejected: 0, gaps: 0, error: 'symbole absent du catalogue' }); log(`✗ ${symbol} : absent du catalogue`); continue; }
    const providerSymbol = (entry.providers as any)?.[o.provider.id === 'binance-vision' ? 'binance' : o.provider.id] ?? symbol;
    try {
      const candles = await o.provider.fetchCandles({ symbol: providerSymbol, tf: o.tf, fromMs: o.fromMs, toMs: o.toMs }, o.http);
      if (!candles.length) { reports.push({ symbol, status: 'empty', written: 0, rejected: 0, gaps: 0 }); log(`∅ ${symbol} : aucune donnée renvoyée par ${o.provider.name}`); continue; }
      const r = await cryptoDataService.importCandles(symbol, o.tf, candles, { provider: o.provider.id, fromMs: o.fromMs, toMs: o.toMs });
      reports.push({ symbol, status: 'ok', ...r });
      log(`✓ ${symbol} (${o.tf}) : ${r.written} bougies, ${r.rejected} rejetées, ${r.gaps} trou(s)`);
    } catch (e: any) {
      reports.push({ symbol, status: 'error', written: 0, rejected: 0, gaps: 0, error: e.message });
      log(`✗ ${symbol} : ${e.message}`);
      if (!o.continueOnError) throw e;
    }
  }
  return reports;
};

// Capitalisation quotidienne (CoinGecko) rattachée aux bougies journalières déjà importées.
export const importMarketCaps = async (symbols: string[], days: number | 'max', apiKey: string | undefined, http?: HttpGet, log: (m: string) => void = () => {}) => {
  for (const symbol of symbols) {
    const entry = CATALOG.find((c) => c.symbol === symbol);
    const coinId = (entry?.providers as any)?.coingecko;
    if (!coinId) { log(`∅ ${symbol} : identifiant CoinGecko non renseigné dans le catalogue (providers.coingecko)`); continue; }
    const id = await cryptoDataService.assetId(symbol);
    const caps = await coinGeckoMarketCaps(coinId, days, apiKey, http);
    let n = 0;
    for (const c of caps) n += (await query(`UPDATE crypto_candles SET market_cap = $3 WHERE asset_id = $1 AND tf = '1d' AND ts = to_timestamp($2::float8 / 1000.0)`, [id, c.ts, c.marketCap])).rowCount ?? 0;
    log(`✓ ${symbol} : capitalisation renseignée sur ${n} bougies`);
  }
};

// Jeu FICTIF de démonstration (explicitement étiqueté dans la base et dans l'interface).
export const importDemo = async (log: (m: string) => void = () => {}): Promise<void> => {
  for (const spec of DEMO_SPECS) {
    const crashDate = spec.crash ? new Date(Date.parse(spec.start) + spec.crash.dayIndex * 86_400_000).toISOString().slice(0, 10) : undefined;
    await cryptoDataService.upsertSyntheticAsset({ symbol: spec.symbol, name: spec.name, category: spec.category, risk: spec.risk, stable: spec.stable, description: spec.description, crashDate });
    const { h1, d1, m1 } = generateDemoCandles(spec);
    await cryptoDataService.importCandles(spec.symbol, '1d', d1, { provider: 'demo-fictif' });
    await cryptoDataService.importCandles(spec.symbol, '1h', h1, { provider: 'demo-fictif' });
    await cryptoDataService.importCandles(spec.symbol, '1m', m1, { provider: 'demo-fictif' });
    log(`✓ ${spec.symbol} (FICTIF) : ${d1.length} jours, ${h1.length} heures, ${m1.length} minutes`);
  }
  // Taux de change FICTIFS (marqués « demo », jamais par-dessus un taux réel) pour que le jeu d'exemple fonctionne en InvestCoins.
  const n = await fxService.seedDemoRates();
  log(`✓ ${n} taux de change FICTIFS de démonstration`);
};
