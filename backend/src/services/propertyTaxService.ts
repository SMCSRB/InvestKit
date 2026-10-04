// Taux de taxe foncière RÉELS en base (source « terralyse »). PRÉPARATION : le moteur actuel ne lit pas ce service (PROPERTY_TAX_ENABLED = false).
//  - importRates : enregistre un fichier déjà validé (transaction, rejouable : même fichier = rien de plus) ;
//  - rateAt : taux en vigueur à une date de jeu (jamais une année dont la date d'usage est postérieure) ; null avant la première année.
import { query, getClient } from '../utils/db';
import { ParsedTaxFile } from '../data/realEstate/taxes/rateFile';
import { PROPERTY_TAX_SOURCE_ID } from '../config/propertyTaxRules';
import { TaxRatePoint, taxRateAt } from '../engine/immo/propertyTax';

export const propertyTaxService = {
  async importRates(parsed: ParsedTaxFile, checksum: string): Promise<{ imported: boolean; importId: number; rows: number }> {
    if (!parsed.ok || !parsed.rows.length) throw new Error('Fichier non validé : rien n\'est importé.');
    const known = (await query('SELECT id, row_count FROM immo_property_tax_imports WHERE checksum = $1', [checksum])).rows[0];
    if (known) return { imported: false, importId: Number(known.id), rows: Number(known.row_count) };
    const years = parsed.rows.map((r) => r.year);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const imp = (await client.query('INSERT INTO immo_property_tax_imports (source, first_year, last_year, row_count, checksum) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [PROPERTY_TAX_SOURCE_ID, Math.min(...years), Math.max(...years), parsed.rows.length, checksum])).rows[0];
      for (const r of parsed.rows) {
        await client.query(
          `INSERT INTO immo_property_tax_rates (commune_code, year, rate_pct, communal_pct, intercommunal_pct, teom_pct, import_id) VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (commune_code, year) DO UPDATE SET rate_pct = EXCLUDED.rate_pct, communal_pct = EXCLUDED.communal_pct, intercommunal_pct = EXCLUDED.intercommunal_pct, teom_pct = EXCLUDED.teom_pct, import_id = EXCLUDED.import_id`,
          [r.commune, r.year, r.ratePct, r.communalPct, r.intercommunalPct, r.teomPct, imp.id]);
      }
      await client.query('COMMIT');
      return { imported: true, importId: Number(imp.id), rows: parsed.rows.length };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally { client.release(); }
  },

  async series(commune: string): Promise<TaxRatePoint[]> {
    return (await query('SELECT year, rate_pct FROM immo_property_tax_rates WHERE commune_code = $1 ORDER BY year', [commune])).rows.map((r) => ({ year: Number(r.year), ratePct: Number(r.rate_pct) }));
  },

  // Taux en vigueur au jour donné (AAAA-MM-JJ), ou null.
  async rateAt(commune: string, day: string): Promise<TaxRatePoint | null> { return taxRateAt(await propertyTaxService.series(commune), day); },
};
