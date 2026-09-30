// Mode « temps réel » : ARCHITECTURE SEULEMENT. Il dépend de la Phase 5 (abonnement aux prix en direct, exploitation) et n'est PAS activé :
// aucune route ne l'utilise, aucune donnée en direct n'est servie. Ce module fixe le contrat pour brancher plus tard un fournisseur de cours
// (CoinGecko, CryptoCompare ou API publique d'une plateforme) avec un cache et un repli, sans toucher au moteur d'ordres.
export interface LiveQuote { symbol: string; price: number; at: number; source: string }

export interface PriceProvider {
  readonly id: string;
  latest(symbol: string): Promise<LiveQuote>;
}

export class ProviderUnavailableError extends Error {
  constructor(message = 'Fournisseur de cours indisponible') { super(message); this.name = 'ProviderUnavailableError'; }
}

// Cache mémoire à durée de vie courte + chaîne de repli : on essaie les fournisseurs dans l'ordre ; si tous échouent, on sert la dernière
// cotation connue tant qu'elle n'est pas « périmée » (au-delà, on refuse plutôt que de servir un prix trompeur).
export class CachedPriceService {
  private cache = new Map<string, LiveQuote>();
  constructor(private providers: PriceProvider[], private opts: { ttlMs: number; maxStaleMs: number; now?: () => number }) {}
  private now() { return this.opts.now ? this.opts.now() : Date.now(); }

  async get(symbol: string): Promise<LiveQuote & { stale: boolean }> {
    const hit = this.cache.get(symbol);
    if (hit && this.now() - hit.at <= this.opts.ttlMs) return { ...hit, stale: false };
    for (const p of this.providers) {
      try {
        const q = await p.latest(symbol);
        if (!(q.price > 0) || !Number.isFinite(q.price)) continue;   // réponse aberrante : on passe au fournisseur suivant
        const fresh = { ...q, at: this.now() };
        this.cache.set(symbol, fresh);
        return { ...fresh, stale: false };
      } catch { /* fournisseur suivant */ }
    }
    if (hit && this.now() - hit.at <= this.opts.maxStaleMs) return { ...hit, stale: true };
    throw new ProviderUnavailableError();
  }
}

export const REALTIME_STATUS = { available: false, reason: 'Le mode temps réel dépend de la Phase 5 (données en direct) : pas encore disponible.' } as const;
