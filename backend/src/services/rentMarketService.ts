// Loyers réels en base (source « anil »). PRÉPARATION : ce service n'est branché sur aucune route ni sur le moteur Immobilier (RENT_MARKET_ENABLED = false).
//  - importRents : enregistre un fichier déjà validé (transaction, rejouable : même fichier = rien de plus) ;
//  - rentAt : loyer à la date D du joueur = dernier millésime dont le 3e trimestre est TERMINÉ au jour D (jamais un millésime futur) ; null si aucun (donc aucune rentabilité).
// Le loyer exposé ne contient JAMAIS d'adresse ni de coordonnées : seulement commune, série, millésime, loyer, fourchette et nature de l'estimation.
import { query, getClient } from '../utils/db';
import { ParsedRentFile } from '../data/realEstate/rents/rentFile';
import { zoneLabel, cityOfCode, cityOfZone } from '../data/realEstate/dvf/cities';
import { RENT_SOURCE_ID, RentGroup, RENT_ATTRIBUTION, RENT_NATURE } from '../config/rentMarketRules';

export interface RentView {
  source: 'anil';
  communeCode: string;
  communeLabel: string;
  cityId: string;
  group: RentGroup;
  vintage: number;
  snapshotDate: string;          // AAAA-MM-JJ : fin du 3e trimestre décrit
  rentEurM2: number;             // €/m²/mois, charges comprises, loyer d'annonce
  lowEurM2: number;
  highEurM2: number;
  estimate: 'commune' | 'maille';
  observations: number | null;
  attribution: string;
  nature: string;
}
export const RENT_VIEW_KEYS = ['source', 'communeCode', 'communeLabel', 'cityId', 'group', 'vintage', 'snapshotDate', 'rentEurM2', 'lowEurM2', 'highEurM2', 'estimate', 'observations', 'attribution', 'nature'] as const;

// Code commune (ou arrondissement) d'une zone de prix : les codes postaux d'une ville partagent le loyer de leur commune.
export const communeOfZone = (zone: string): string | null => {
  const city = cityOfZone(zone) ?? cityOfCode(zone);
  if (!city) return null;
  return city.districts ? (city.codes.includes(zone) ? zone : null) : city.codes[0];
};

const dayString = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const rentMarketService = {
  async importRents(parsed: ParsedRentFile, checksum: string): Promise<{ imported: boolean; importId: number; rows: number }> {
    if (!parsed.ok || parsed.vintage === null) throw new Error('Fichier non validé : rien n\'est importé.');
    const known = (await query('SELECT id, row_count FROM immo_rent_imports WHERE checksum = $1', [checksum])).rows[0];
    if (known) return { imported: false, importId: Number(known.id), rows: Number(known.row_count) };
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const snap = parsed.rows[0]?.snapshotDate ?? `${parsed.vintage}-09-30`;
      const imp = (await client.query('INSERT INTO immo_rent_imports (source, vintage_year, snapshot_date, row_count, checksum) VALUES ($1, $2, $3::date, $4, $5) RETURNING id', [RENT_SOURCE_ID, parsed.vintage, snap, parsed.rows.length, checksum])).rows[0];
      for (let i = 0; i < parsed.rows.length; i += 400) {
        const chunk = parsed.rows.slice(i, i + 400);
        const params: unknown[] = []; const values: string[] = [];
        chunk.forEach((r, k) => { const b = k * 10; values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::date, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10})`); params.push(r.commune, r.group, r.vintage, r.snapshotDate, r.rent, r.low, r.high, r.kind, r.observations, imp.id); });
        await client.query(
          `INSERT INTO immo_rent_market (commune_code, property_group, vintage_year, snapshot_date, rent_eur_m2, low_eur_m2, high_eur_m2, estimate_kind, observations, import_id)
           VALUES ${values.join(', ')}
           ON CONFLICT (commune_code, property_group, vintage_year) DO UPDATE SET snapshot_date = EXCLUDED.snapshot_date, rent_eur_m2 = EXCLUDED.rent_eur_m2, low_eur_m2 = EXCLUDED.low_eur_m2,
             high_eur_m2 = EXCLUDED.high_eur_m2, estimate_kind = EXCLUDED.estimate_kind, observations = EXCLUDED.observations, import_id = EXCLUDED.import_id`, params);
      }
      await client.query('COMMIT');
      return { imported: true, importId: Number(imp.id), rows: parsed.rows.length };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally { client.release(); }
  },

  // Loyer connu à la date simulée : dernier millésime dont le 3e trimestre est terminé AVANT ou LE jour de la date. Aucun millésime = null (pas de loyer, pas de rentabilité).
  async rentAt(communeCode: string, group: RentGroup, simulatedMs: number): Promise<RentView | null> {
    const city = cityOfCode(communeCode); const label = zoneLabel(communeCode);
    if (!city || !label) return null;
    const r = (await query(
      `SELECT vintage_year, to_char(snapshot_date, 'YYYY-MM-DD') AS snap, rent_eur_m2, low_eur_m2, high_eur_m2, estimate_kind, observations
         FROM immo_rent_market
        WHERE commune_code = $1 AND property_group = $2 AND snapshot_date <= $3::date
        ORDER BY snapshot_date DESC LIMIT 1`, [communeCode, group, dayString(simulatedMs)])).rows[0];
    if (!r) return null;
    return {
      source: 'anil', communeCode, communeLabel: label, cityId: city.id, group, vintage: Number(r.vintage_year), snapshotDate: r.snap,
      rentEurM2: Number(r.rent_eur_m2), lowEurM2: Number(r.low_eur_m2), highEurM2: Number(r.high_eur_m2), estimate: r.estimate_kind,
      observations: r.observations === null ? null : Number(r.observations), attribution: RENT_ATTRIBUTION, nature: RENT_NATURE,
    };
  },
};
