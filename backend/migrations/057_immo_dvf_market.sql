-- Immobilier réel (étape 3, PRÉPARATION) : médianes de prix au m² issues des DVF (DGFiP, Licence Ouverte 2.0), par quartier, type de bien et mois.
-- Source marquée « dvf ». NON activée pour les joueurs (DVF_MARKET_ENABLED = false) : rien dans le jeu ne lit encore ces tables.
-- Aucune adresse, aucune coordonnée, aucun numéro de rue : seulement le code du quartier (commune ou arrondissement), le mois, le type et les prix.
-- Règle d'or : la ligne du mois M n'a été calculée qu'avec des ventes datées au plus tard à la fin de M (jamais le futur).
CREATE TABLE IF NOT EXISTS immo_dvf_imports (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'dvf' CHECK (source = 'dvf'),
  range_from DATE NOT NULL,
  range_to DATE NOT NULL,
  window_months INT NOT NULL CHECK (window_months > 0),
  min_sales INT NOT NULL CHECK (min_sales > 0),
  row_count INT NOT NULL CHECK (row_count >= 0),
  checksum TEXT NOT NULL UNIQUE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS immo_dvf_market (
  zone_code TEXT NOT NULL CHECK (zone_code ~ '^[0-9]{5}$'),
  month DATE NOT NULL CHECK (month = date_trunc('month', month)::date),
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house')),
  sales_count INT NOT NULL CHECK (sales_count >= 0),
  median_eur_m2 NUMERIC(10, 2) NOT NULL CHECK (median_eur_m2 > 0),
  p25_eur_m2 NUMERIC(10, 2) NOT NULL CHECK (p25_eur_m2 > 0),
  p75_eur_m2 NUMERIC(10, 2) NOT NULL CHECK (p75_eur_m2 > 0),
  scope TEXT NOT NULL CHECK (scope IN ('zone', 'city')),          -- 'city' : trop peu de ventes dans le quartier, repli sur la ville entière
  import_id BIGINT NOT NULL REFERENCES immo_dvf_imports(id),
  PRIMARY KEY (zone_code, month, property_type),
  CHECK (p25_eur_m2 <= median_eur_m2 AND median_eur_m2 <= p75_eur_m2)
);
CREATE INDEX IF NOT EXISTS idx_immo_dvf_market_lookup ON immo_dvf_market (zone_code, property_type, month DESC);
