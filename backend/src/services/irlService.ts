// IRL réel en base (source « insee »). PRÉPARATION : le moteur actuel ne lit pas ce service (IRL_ENABLED = false) ; seul le loyer d'avant le 3e trimestre du premier millésime s'en sert (recalage).
//  - importIrl : enregistre un fichier déjà validé (transaction, rejouable : même fichier = rien de plus) ;
//  - irlAt : dernière valeur PUBLIÉE au jour donné (jamais une valeur dont la publication est postérieure).
import { query, getClient } from '../utils/db';
import { ParsedIrlFile } from '../data/realEstate/irl/irlFile';
import { IRL_SOURCE_ID } from '../config/irlRules';
import { IrlPoint, latestPublished, valueOf } from '../engine/immo/irl';

export const irlService = {
  async importIrl(parsed: ParsedIrlFile, checksum: string): Promise<{ imported: boolean; importId: number; rows: number }> {
    if (!parsed.ok || !parsed.points.length) throw new Error('Fichier non validé : rien n\'est importé.');
    const known = (await query('SELECT id, row_count FROM immo_irl_imports WHERE checksum = $1', [checksum])).rows[0];
    if (known) return { imported: false, importId: Number(known.id), rows: Number(known.row_count) };
    const first = parsed.points[0]; const last = parsed.points[parsed.points.length - 1];
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const imp = (await client.query('INSERT INTO immo_irl_imports (source, first_quarter, last_quarter, row_count, checksum) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [IRL_SOURCE_ID, `${first.year}-T${first.quarter}`, `${last.year}-T${last.quarter}`, parsed.points.length, checksum])).rows[0];
      for (const p of parsed.points) {
        await client.query(
          `INSERT INTO immo_irl (year, quarter, value, import_id) VALUES ($1, $2, $3, $4)
           ON CONFLICT (year, quarter) DO UPDATE SET value = EXCLUDED.value, import_id = EXCLUDED.import_id`, [p.year, p.quarter, p.value, imp.id]);
      }
      await client.query('COMMIT');
      return { imported: true, importId: Number(imp.id), rows: parsed.points.length };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally { client.release(); }
  },

  async series(): Promise<IrlPoint[]> {
    return (await query('SELECT year, quarter, value FROM immo_irl ORDER BY year, quarter')).rows.map((r) => ({ year: Number(r.year), quarter: Number(r.quarter) as 1 | 2 | 3 | 4, value: Number(r.value) }));
  },

  // Dernière valeur publiée au jour donné (AAAA-MM-JJ), ou null.
  async irlAt(day: string): Promise<IrlPoint | null> { return latestPublished(await irlService.series(), day); },
  async quarterValue(year: number, quarter: number): Promise<number | null> { return valueOf(await irlService.series(), year, quarter); },
};
