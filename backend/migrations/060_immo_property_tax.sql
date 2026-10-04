-- Immobilier réel (taxe foncière, PRÉPARATION) : taux global de taxe foncière bâtie par commune et par année (DGFiP, REI). Source marquée « dgfip-rei ». NON lue par le moteur actuel (PROPERTY_TAX_ENABLED = false).
-- Aucune donnée personnelle, aucune adresse : seulement (code commune, année, taux en %). La base cadastrale d'un bien n'est PAS stockée : elle est estimée à l'affichage.
CREATE TABLE IF NOT EXISTS immo_property_tax_imports (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'dgfip-rei' CHECK (source = 'dgfip-rei'),
  first_year INT NOT NULL,
  last_year INT NOT NULL,
  row_count INT NOT NULL CHECK (row_count >= 0),
  checksum TEXT NOT NULL UNIQUE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS immo_property_tax_rates (
  commune_code TEXT NOT NULL CHECK (commune_code ~ '^[0-9]{5}$'),
  year INT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  rate_pct NUMERIC(7, 3) NOT NULL CHECK (rate_pct > 0),
  import_id BIGINT NOT NULL REFERENCES immo_property_tax_imports(id),
  PRIMARY KEY (commune_code, year)
);
