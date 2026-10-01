-- Immobilier façon portail : favoris et recherches enregistrées (avec alerte « nouvelles annonces »).
-- Chaque ligne appartient à UN joueur (user_id) : toutes les requêtes filtrent sur lui (anti-IDOR).
CREATE TABLE IF NOT EXISTS re_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id VARCHAR(80) NOT NULL,
  year INTEGER NOT NULL,                       -- année de jeu de l'annonce (les identifiants sont réutilisés d'une année à l'autre)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id, year)
);

CREATE TABLE IF NOT EXISTS re_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,   -- filtres validés et normalisés (voir engine/immo/listingSearch.ts)
  seen_year INTEGER,                            -- année de jeu à laquelle les annonces vues ont été notées
  seen_ids TEXT[] NOT NULL DEFAULT '{}',        -- annonces déjà vues pour cette recherche : le reste est « nouveau »
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_re_saved_searches_user ON re_saved_searches (user_id);
