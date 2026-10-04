// Médianes de prix DVF en base (source « dvf »). PRÉPARATION : ce service n'est branché sur aucune route ni sur le moteur Immobilier (DVF_MARKET_ENABLED = false).
//  - importMarket : enregistre un fichier déjà validé (transaction, rejouable : même fichier = rien de plus) ;
//  - priceAt : prix à la date D du joueur = dernier mois ENTIÈREMENT passé avant D (le mois de D n'est jamais utilisé : il contiendrait des ventes postérieures à D).
// Le prix exposé ne contient JAMAIS de rue, de numéro ni de coordonnées : seulement quartier, type de bien, mois, nombre de ventes et prix au m².
import { query, getClient } from '../utils/db';
import { ParsedMarketFile } from '../data/realEstate/dvf/marketFile';
import { zoneLabel, cityOfCode } from '../data/realEstate/dvf/cities';
import { DVF_SOURCE_ID } from '../config/dvfMarketRules';

export interface DvfPriceView {
  source: 'dvf';
  zoneCode: string;
  zoneLabel: string;
  cityId: string;
  propertyType: 'apartment' | 'house';
  asOfMonth: string;            // AAAA-MM : dernier mois entièrement passé pris en compte
  salesCount: number;
  medianEurM2: number;
  p25EurM2: number;
  p75EurM2: number;
  scope: 'zone' | 'city';       // « city » : repli sur la ville entière (trop peu de ventes dans le quartier)
}
export const DVF_VIEW_KEYS = ['source', 'zoneCode', 'zoneLabel', 'cityId', 'propertyType', 'asOfMonth', 'salesCount', 'medianEurM2', 'p25EurM2', 'p75EurM2', 'scope'] as const;

const monthStart = (ms: number): string => { const d = new Date(ms); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`; };

export const dvfMarketService = {
  async importMarket(parsed: ParsedMarketFile, checksum: string): Promise<{ imported: boolean; importId: number; rows: number }> {
    if (!parsed.ok || !parsed.meta) throw new Error('Fichier non validé : rien n\'est importé.');
    const known = (await query('SELECT id, row_count FROM immo_dvf_imports WHERE checksum = $1', [checksum])).rows[0];
    if (known) return { imported: false, importId: Number(known.id), rows: Number(known.row_count) };
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const m = parsed.meta;
      const imp = (await client.query(
        `INSERT INTO immo_dvf_imports (source, range_from, range_to, window_months, min_sales, row_count, checksum)
         VALUES ($1, $2::date, ($3 || '-01')::date, $4, $5, $6, $7) RETURNING id`, [DVF_SOURCE_ID, `${m.from}-01`, m.to, m.windowMonths, m.minSales, parsed.rows.length, checksum])).rows[0];
      for (let i = 0; i < parsed.rows.length; i += 500) {
        const chunk = parsed.rows.slice(i, i + 500);
        const params: unknown[] = []; const values: string[] = [];
        chunk.forEach((r, k) => { const b = k * 9; values.push(`($${b + 1}, $${b + 2}::date, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`); params.push(r.zone, `${r.month}-01`, r.type, r.salesCount, r.median, r.p25, r.p75, r.scope, imp.id); });
        await client.query(
          `INSERT INTO immo_dvf_market (zone_code, month, property_type, sales_count, median_eur_m2, p25_eur_m2, p75_eur_m2, scope, import_id)
           VALUES ${values.join(', ')}
           ON CONFLICT (zone_code, month, property_type) DO UPDATE SET sales_count = EXCLUDED.sales_count, median_eur_m2 = EXCLUDED.median_eur_m2,
             p25_eur_m2 = EXCLUDED.p25_eur_m2, p75_eur_m2 = EXCLUDED.p75_eur_m2, scope = EXCLUDED.scope, import_id = EXCLUDED.import_id`, params);
      }
      await client.query('COMMIT');
      return { imported: true, importId: Number(imp.id), rows: parsed.rows.length };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally { client.release(); }
  },

  // Dernier mois couvert par les données (plafond naturel de l'Immobilier réel), ou null.
  async lastMonth(): Promise<string | null> {
    const r = (await query(`SELECT to_char(MAX(month), 'YYYY-MM') AS m FROM immo_dvf_market`)).rows[0];
    return r?.m ?? null;
  },

  async priceAt(zoneCode: string, type: 'apartment' | 'house', simulatedMs: number): Promise<DvfPriceView | null> {
    const label = zoneLabel(zoneCode); const city = cityOfCode(zoneCode);
    if (!label || !city) return null;
    const r = (await query(
      `SELECT to_char(month, 'YYYY-MM') AS m, sales_count, median_eur_m2, p25_eur_m2, p75_eur_m2, scope
         FROM immo_dvf_market
        WHERE zone_code = $1 AND property_type = $2 AND month < $3::date
        ORDER BY month DESC LIMIT 1`, [zoneCode, type, monthStart(simulatedMs)])).rows[0];
    if (!r) return null;
    return {
      source: 'dvf', zoneCode, zoneLabel: label, cityId: city.id, propertyType: type, asOfMonth: r.m, salesCount: Number(r.sales_count),
      medianEurM2: Number(r.median_eur_m2), p25EurM2: Number(r.p25_eur_m2), p75EurM2: Number(r.p75_eur_m2), scope: r.scope,
    };
  },
};
