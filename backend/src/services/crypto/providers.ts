import zlib from 'zlib';
import { BaseTimeframe } from '../../config/cryptoMarketRules';
import { Candle } from '../../engine/crypto/candles';

// Couche d'abstraction « fournisseur de données de marché ». Le jeu ne dépend d'aucun fournisseur précis : chaque adaptateur renvoie
// des bougies normalisées (heure d'ouverture en ms UTC, prix en dollars, volume en dollars). CONDITIONS D'UTILISATION, LIMITES ET PROFONDEUR :
// voir docs/crypto-donnees.md (à relire avant tout import : elles peuvent changer).

export interface FetchRequest { symbol: string; tf: BaseTimeframe; fromMs: number; toMs: number }
export interface MarketDataProvider {
  id: string; name: string;
  supports: BaseTimeframe[];
  fetchCandles(req: FetchRequest, http?: HttpGet): Promise<Candle[]>;
}
export type HttpGet = (url: string, opts?: { binary?: boolean; headers?: Record<string, string> }) => Promise<any>;

export const defaultHttp: HttpGet = async (url, opts) => {
  const res = await fetch(url, { headers: opts?.headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url.replace(/api_key=[^&]+/, 'api_key=***')}`);
  return opts?.binary ? Buffer.from(await res.arrayBuffer()) : res.json();
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── CryptoCompare : journalier / horaire / minute en JSON (clé gratuite requise). Pagination vers le passé avec toTs. ──
export const cryptoCompareProvider = (apiKey: string | undefined, pauseMs = 250): MarketDataProvider => ({
  id: 'cryptocompare', name: 'CryptoCompare', supports: ['1d', '1h', '1m'],
  async fetchCandles({ symbol, tf, fromMs, toMs }, http = defaultHttp) {
    const endpoint = { '1d': 'histoday', '1h': 'histohour', '1m': 'histominute' }[tf];
    const step = { '1d': 86_400, '1h': 3_600, '1m': 60 }[tf];
    const out = new Map<number, Candle>();
    let to = Math.floor(toMs / 1000);
    for (let guard = 0; guard < 5000 && to * 1000 > fromMs; guard++) {
      const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${encodeURIComponent(symbol)}&tsym=USD&limit=2000&toTs=${to}${apiKey ? `&api_key=${apiKey}` : ''}`;
      const json = await http(url);
      if (json?.Response === 'Error') throw new Error(`CryptoCompare : ${json.Message}`);
      const rows: any[] = json?.Data?.Data ?? [];
      if (!rows.length) break;
      const before = out.size;
      for (const r of rows) {
        // CryptoCompare renvoie des lignes à zéro AVANT le lancement de la pièce : on les ignore (pas de cours = pas de bougie).
        if (!(r.close > 0) && !(r.high > 0)) continue;
        const ts = r.time * 1000;
        if (ts >= fromMs && ts <= toMs) out.set(ts, { ts, o: r.open, h: r.high, l: r.low, c: r.close, volume: Number(r.volumeto) || 0 });
      }
      const earliest = rows[0].time;
      // Fin : on a atteint la date de début demandée, ou la page ne contenait plus que des lignes à zéro (avant le lancement de la pièce).
      if (earliest <= Math.floor(fromMs / 1000) || (out.size === before && rows.every((r) => !(r.close > 0) && !(r.high > 0)))) break;
      to = earliest - step;
      await sleep(pauseMs);
    }
    return [...out.values()].sort((a, b) => a.ts - b.ts);
  },
});

// ── Binance Vision : fichiers CSV mensuels compressés (aucune clé). Paire SYMBOLEUSDT. ──
// Colonnes : open_time, open, high, low, close, volume (base), close_time, quote_asset_volume, ... ; depuis 2025 l'heure est en MICROsecondes.
export const readZipFirstEntry = (buf: Buffer): Buffer => {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('Archive ZIP invalide');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cdOffset) !== 0x02014b50) throw new Error('Répertoire central ZIP invalide');
  const method = buf.readUInt16LE(cdOffset + 10), compSize = buf.readUInt32LE(cdOffset + 20), localOffset = buf.readUInt32LE(cdOffset + 42);
  if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('En-tête local ZIP invalide');
  const start = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
  const data = buf.subarray(start, start + compSize);
  if (method === 0) return Buffer.from(data);
  if (method === 8) return zlib.inflateRawSync(data);
  throw new Error(`Méthode de compression ZIP non gérée : ${method}`);
};

export const parseBinanceKlines = (csv: string): Candle[] => {
  const out: Candle[] = [];
  for (const line of csv.split('\n')) {
    const p = line.trim().split(',');
    if (p.length < 8 || !/^\d+$/.test(p[0])) continue;       // ignore l'éventuelle ligne d'en-tête
    let ts = Number(p[0]);
    if (ts > 1e14) ts = Math.floor(ts / 1000);                // microsecondes → millisecondes
    out.push({ ts, o: Number(p[1]), h: Number(p[2]), l: Number(p[3]), c: Number(p[4]), volume: Number(p[7]) || 0 });
  }
  return out;
};

export const binanceVisionProvider = (pauseMs = 150): MarketDataProvider => ({
  id: 'binance-vision', name: 'Binance Vision (données publiques)', supports: ['1d', '1h', '1m'],
  async fetchCandles({ symbol, tf, fromMs, toMs }, http = defaultHttp) {
    const pair = `${symbol}USDT`;
    const out: Candle[] = [];
    const d = new Date(fromMs); let y = d.getUTCFullYear(), m = d.getUTCMonth();
    const end = new Date(toMs);
    while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth())) {
      const url = `https://data.binance.vision/data/spot/monthly/klines/${pair}/${tf}/${pair}-${tf}-${y}-${String(m + 1).padStart(2, '0')}.zip`;
      try {
        const zip: Buffer = await http(url, { binary: true });
        for (const c of parseBinanceKlines(readZipFirstEntry(zip).toString('utf8'))) if (c.ts >= fromMs && c.ts <= toMs) out.push(c);
      } catch (e: any) {
        if (!/HTTP 404/.test(e.message)) throw e;            // 404 = mois sans fichier (paire pas encore cotée) : normal
      }
      if (++m > 11) { m = 0; y++; }
      await sleep(pauseMs);
    }
    return out.sort((a, b) => a.ts - b.ts);
  },
});

// ── CoinGecko : capitalisation et volumes quotidiens (pas d'OHLC). Sert à renseigner crypto_candles.market_cap. ──
export const coinGeckoMarketCaps = async (coinId: string, days: number | 'max', apiKey: string | undefined, http: HttpGet = defaultHttp): Promise<{ ts: number; marketCap: number }[]> => {
  const headers = apiKey ? { 'x-cg-demo-api-key': apiKey } : undefined;
  const json = await http(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}&interval=daily`, { headers });
  return (json?.market_caps ?? []).filter((r: number[]) => r[1] > 0).map((r: number[]) => ({ ts: Math.floor(r[0] / 86_400_000) * 86_400_000, marketCap: r[1] }));
};
