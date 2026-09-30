-- Domaine « Crypto » (marché simulé) — lot (a) : catalogue d'actifs et historique de cours (bougies).
-- Les cours viennent UNIQUEMENT des imports (fournisseurs de données) ; rien n'est inventé. Les actifs marqués « synthetic » sont un jeu de démonstration FICTIF.
CREATE TABLE IF NOT EXISTS crypto_assets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(20) NOT NULL,
  risk SMALLINT NOT NULL CHECK (risk BETWEEN 1 AND 5),
  stable BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  launch_hint VARCHAR(7),                       -- année-mois indicatif (non sourcé) ; l'apparition réelle = first_candle_at
  synthetic BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = données FICTIVES de démonstration
  first_candle_at TIMESTAMPTZ,
  last_candle_at TIMESTAMPTZ,
  liquidity_tier SMALLINT NOT NULL DEFAULT 4 CHECK (liquidity_tier BETWEEN 1 AND 4),
  collapse_date DATE,
  collapse_title VARCHAR(120),
  collapse_explanation TEXT,
  provider_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crypto_candles (
  asset_id INT NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
  tf VARCHAR(3) NOT NULL CHECK (tf IN ('1m', '1h', '1d')),
  ts TIMESTAMPTZ NOT NULL,                      -- ouverture de la bougie (UTC)
  o DOUBLE PRECISION NOT NULL,
  h DOUBLE PRECISION NOT NULL,
  l DOUBLE PRECISION NOT NULL,
  c DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL DEFAULT 0,   -- volume en dollars (quote)
  market_cap DOUBLE PRECISION,                  -- capitalisation (si le fournisseur la donne)
  PRIMARY KEY (asset_id, tf, ts)
);

CREATE TABLE IF NOT EXISTS crypto_import_runs (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(30) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  tf VARCHAR(3) NOT NULL,
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  rows_written INT NOT NULL DEFAULT 0,
  rows_rejected INT NOT NULL DEFAULT 0,
  gaps INT NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'running',
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
