-- Domaine Crypto : échanges crypto contre crypto (sans impôt), journal des événements, effets d'événements.
ALTER TABLE crypto_orders DROP CONSTRAINT IF EXISTS crypto_orders_type_check;
ALTER TABLE crypto_orders ADD CONSTRAINT crypto_orders_type_check CHECK (type IN ('market', 'limit', 'stop_loss', 'take_profit', 'swap'));
ALTER TABLE crypto_orders ADD COLUMN IF NOT EXISTS to_asset_id INTEGER REFERENCES crypto_assets(id);
ALTER TABLE crypto_fills ADD COLUMN IF NOT EXISTS swap BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS crypto_event_log (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_key VARCHAR(80) NOT NULL,
  sim_date DATE NOT NULL,                      -- date SIMULÉE de l'événement (toujours ≤ date simulée du joueur)
  origin VARCHAR(10) NOT NULL CHECK (origin IN ('historic', 'random')),
  kind VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  lesson TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_crypto_event_log_date ON crypto_event_log(user_id, sim_date DESC);
