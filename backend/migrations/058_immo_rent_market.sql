-- Immobilier réel (loyers, PRÉPARATION) : « Carte des loyers » (ANIL, Licence Ouverte 2.0), loyers d'annonce par commune, série de bien et millésime.
-- Source marquée « anil ». NON activée pour les joueurs (RENT_MARKET_ENABLED = false) : rien dans le jeu ne lit encore ces tables.
-- Aucune adresse, aucune coordonnée : seulement le code commune (ou arrondissement), la série (tous appartements, T1-T2, T3 et plus, maisons), le millésime et les loyers.
-- Un millésime décrit les biens mis en location au 3e trimestre de son année : snapshot_date = 30 septembre de ce millésime (règle « aucun futur »).
CREATE TABLE IF NOT EXISTS immo_rent_imports (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'anil' CHECK (source = 'anil'),
  vintage_year INT NOT NULL CHECK (vintage_year >= 2022),
  snapshot_date DATE NOT NULL,
  row_count INT NOT NULL CHECK (row_count >= 0),
  checksum TEXT NOT NULL UNIQUE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS immo_rent_market (
  commune_code TEXT NOT NULL CHECK (commune_code ~ '^[0-9]{5}$'),
  property_group TEXT NOT NULL CHECK (property_group IN ('all', 't12', 't3', 'house')),
  vintage_year INT NOT NULL CHECK (vintage_year >= 2022),
  snapshot_date DATE NOT NULL,
  rent_eur_m2 NUMERIC(8, 2) NOT NULL CHECK (rent_eur_m2 > 0),          -- €/m²/mois, charges comprises, loyer d'annonce
  low_eur_m2 NUMERIC(8, 2) NOT NULL CHECK (low_eur_m2 > 0),
  high_eur_m2 NUMERIC(8, 2) NOT NULL,
  estimate_kind TEXT NOT NULL CHECK (estimate_kind IN ('commune', 'maille')),   -- 'maille' : trop peu d'annonces dans la commune, estimation sur un groupe de communes voisines
  observations INT CHECK (observations IS NULL OR observations >= 0),
  import_id BIGINT NOT NULL REFERENCES immo_rent_imports(id),
  PRIMARY KEY (commune_code, property_group, vintage_year),
  CHECK (low_eur_m2 <= rent_eur_m2 AND rent_eur_m2 <= high_eur_m2)
);
CREATE INDEX IF NOT EXISTS idx_immo_rent_market_lookup ON immo_rent_market (commune_code, property_group, snapshot_date DESC);
