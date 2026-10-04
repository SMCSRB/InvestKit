-- Immobilier réel (IRL, PRÉPARATION) : indice de référence des loyers, série trimestrielle de l'Insee. Source marquée « insee ». NON lue par le moteur actuel (IRL_ENABLED = false).
-- Aucune donnée personnelle, aucune adresse : seulement (année, trimestre, valeur de l'indice).
CREATE TABLE IF NOT EXISTS immo_irl_imports (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'insee' CHECK (source = 'insee'),
  first_quarter TEXT NOT NULL,
  last_quarter TEXT NOT NULL,
  row_count INT NOT NULL CHECK (row_count >= 0),
  checksum TEXT NOT NULL UNIQUE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS immo_irl (
  year INT NOT NULL CHECK (year BETWEEN 1999 AND 2100),
  quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  value NUMERIC(8, 3) NOT NULL CHECK (value > 0),
  import_id BIGINT NOT NULL REFERENCES immo_irl_imports(id),
  PRIMARY KEY (year, quarter)
);
