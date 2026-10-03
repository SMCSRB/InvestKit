-- Taux de change EUR/USD de la BCE (un taux par jour ouvré). Rejouée à chaque démarrage : tout est idempotent.
-- `demo` = taux fictif des données de démonstration (jamais présenté comme réel). Un import réel remplace un taux démo du même jour.
CREATE TABLE IF NOT EXISTS fx_rates (
  day DATE NOT NULL,
  currency CHAR(3) NOT NULL,
  per_eur NUMERIC(18, 8) NOT NULL CHECK (per_eur > 0),
  source TEXT NOT NULL,
  demo BOOLEAN NOT NULL DEFAULT FALSE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, currency)
);
