import { query } from '../utils/db';
import { getRealEstateDataSource } from '../data/realEstate';
import { parseSearch, searchListings, toStoredFilters, SearchInputError } from '../engine/immo';
import { RealEstateError, requireGame, decorateListing } from './realEstateService';

// Favoris et recherches enregistrées (« alerte nouvelle annonce »). Chaque requête filtre sur user_id : un joueur ne lit, ne
// modifie et ne supprime jamais les lignes d'un autre (anti-IDOR). Aucune donnée de jeu n'est modifiée ici.
export const WATCH_LIMITS = { favorites: 200, savedSearches: 20, nameMax: 60 };
const source = () => getRealEstateDataSource();
const ID_RE = /^[a-z0-9-]{1,80}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const checkId = (v: unknown): string => {
  if (typeof v !== 'string' || !ID_RE.test(v)) throw new RealEstateError('INVALID_INPUT', 'Identifiant de bien invalide');
  return v;
};
const checkUuid = (v: unknown): string => {
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
  return v;
};
export const cleanName = (v: unknown): string => {
  if (typeof v !== 'string') throw new RealEstateError('INVALID_INPUT', 'Nom invalide');
  const name = v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > WATCH_LIMITS.nameMax) throw new RealEstateError('INVALID_INPUT', `Le nom doit faire 1 à ${WATCH_LIMITS.nameMax} caractères`);
  return name;
};
const parseFilters = (raw: unknown) => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new RealEstateError('INVALID_INPUT', 'Filtres invalides');
  try { return parseSearch(raw as Record<string, unknown>); }
  catch (e) { if (e instanceof SearchInputError) throw new RealEstateError('INVALID_INPUT', e.message); throw e; }
};

const placesOf = async () => Object.fromEntries((await source().listCities()).map((c) => [c.id, { cityName: c.name, region: c.region }]));

export const realEstateWatchService = {
  // Favoris de l'année de jeu en cours (les identifiants d'annonces sont réutilisés chaque année : on garde l'année avec le favori).
  async listFavorites(userId: string) {
    const game = await requireGame(userId);
    const rows = (await query('SELECT listing_id, year FROM re_favorites WHERE user_id = $1 ORDER BY created_at DESC', [userId])).rows;
    const current = new Set(rows.filter((r: any) => r.year === game.simulated_year).map((r: any) => r.listing_id));
    // Un seul passage dans le catalogue ; on écarte les biens déjà possédés (ils ne sont plus dans les résultats de recherche).
    const owned = new Set((await query(`SELECT listing_id FROM re_properties WHERE game_id = $1 AND status <> 'sold'`, [game.id])).rows.map((r: any) => r.listing_id));
    const byId = new Map((await source().listListings(game.simulated_year)).map((l) => [l.id, l]));
    const order = rows.filter((r: any) => r.year === game.simulated_year).map((r: any) => r.listing_id);
    const listings = order.filter((id: string) => current.has(id) && !owned.has(id) && byId.has(id)).map((id: string) => decorateListing(byId.get(id)!));
    return { year: game.simulated_year, ids: listings.map((l) => l.id), listings, pastCount: rows.length - current.size };
  },

  async addFavorite(userId: string, listingIdRaw: unknown) {
    const id = checkId(listingIdRaw);
    const game = await requireGame(userId);
    if (!(await source().getListing(id, game.simulated_year))) throw new RealEstateError('UNKNOWN_LISTING', 'Bien introuvable');
    const count = Number((await query('SELECT COUNT(*) AS n FROM re_favorites WHERE user_id = $1 AND year = $2', [userId, game.simulated_year])).rows[0].n);
    const res = await query('INSERT INTO re_favorites (user_id, listing_id, year) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING listing_id', [userId, id, game.simulated_year]);
    if (res.rows.length === 0) return { favorite: true, already: true };
    if (count >= WATCH_LIMITS.favorites) {
      await query('DELETE FROM re_favorites WHERE user_id = $1 AND listing_id = $2 AND year = $3', [userId, id, game.simulated_year]);
      throw new RealEstateError('INVALID_INPUT', `Tu as atteint la limite de ${WATCH_LIMITS.favorites} favoris : retire-en pour en ajouter.`);
    }
    return { favorite: true, already: false };
  },

  async removeFavorite(userId: string, listingIdRaw: unknown) {
    const id = checkId(listingIdRaw);
    const game = await requireGame(userId);
    await query('DELETE FROM re_favorites WHERE user_id = $1 AND listing_id = $2 AND year = $3', [userId, id, game.simulated_year]);
    return { favorite: false };
  },

  // Chaque recherche enregistrée indique combien d'annonces correspondantes n'ont pas encore été vues (« nouvelles »).
  async listSavedSearches(userId: string) {
    const game = await requireGame(userId);
    const rows = (await query('SELECT id, name, filters, seen_year, seen_ids, created_at FROM re_saved_searches WHERE user_id = $1 ORDER BY created_at DESC', [userId])).rows;
    if (rows.length === 0) return { year: game.simulated_year, searches: [] };
    const all = await source().listListings(game.simulated_year);
    const owned = new Set((await query(`SELECT listing_id FROM re_properties WHERE game_id = $1 AND status <> 'sold'`, [game.id])).rows.map((r: any) => r.listing_id));
    const available = all.filter((l) => !owned.has(l.id));
    const places = await placesOf();
    return {
      year: game.simulated_year,
      searches: rows.map((r: any) => {
        // Des filtres enregistrés autrefois peuvent ne plus être acceptés (règles resserrées) : la recherche est signalée, pas toute la liste.
        let params; try { params = parseSearch(r.filters); } catch { return { id: r.id, name: r.name, filters: r.filters, count: 0, newCount: 0, invalid: true, createdAt: r.created_at }; }
        const matching = searchListings(available, params, places);
        const seen = new Set(r.seen_year === game.simulated_year ? r.seen_ids : []);
        return { id: r.id, name: r.name, filters: r.filters, count: matching.length, newCount: matching.filter((l) => !seen.has(l.id)).length, createdAt: r.created_at };
      }),
    };
  },

  async saveSearch(userId: string, body: any) {
    const name = cleanName(body?.name);
    const params = parseFilters(body?.filters);
    const game = await requireGame(userId);
    const count = Number((await query('SELECT COUNT(*) AS n FROM re_saved_searches WHERE user_id = $1', [userId])).rows[0].n);
    if (count >= WATCH_LIMITS.savedSearches) throw new RealEstateError('INVALID_INPUT', `Tu as atteint la limite de ${WATCH_LIMITS.savedSearches} recherches enregistrées.`);
    // Les annonces qui correspondent AUJOURD'HUI sont considérées comme déjà vues : l'alerte ne signale que les suivantes.
    const all = await source().listListings(game.simulated_year);
    const seenIds = searchListings(all, params, await placesOf()).map((l) => l.id);
    const res = await query(
      'INSERT INTO re_saved_searches (user_id, name, filters, seen_year, seen_ids) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, name, JSON.stringify(toStoredFilters(params)), game.simulated_year, seenIds]
    );
    return { id: res.rows[0].id, name, filters: toStoredFilters(params) };
  },

  async markSeen(userId: string, idRaw: unknown) {
    const id = checkUuid(idRaw);
    const game = await requireGame(userId);
    const row = (await query('SELECT filters FROM re_saved_searches WHERE id = $1 AND user_id = $2', [id, userId])).rows[0];
    if (!row) throw new RealEstateError('NOT_FOUND', 'Recherche introuvable');
    const all = await source().listListings(game.simulated_year);
    let params; try { params = parseSearch(row.filters); } catch { return { ok: true, invalid: true }; }
    const seenIds = searchListings(all, params, await placesOf()).map((l) => l.id);
    await query('UPDATE re_saved_searches SET seen_year = $3, seen_ids = $4 WHERE id = $1 AND user_id = $2', [id, userId, game.simulated_year, seenIds]);
    return { ok: true };
  },

  async deleteSearch(userId: string, idRaw: unknown) {
    const id = checkUuid(idRaw);
    const res = await query('DELETE FROM re_saved_searches WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (res.rows.length === 0) throw new RealEstateError('NOT_FOUND', 'Recherche introuvable');
    return { deleted: true };
  },
};
