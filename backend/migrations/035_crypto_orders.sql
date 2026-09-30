-- Domaine Crypto : ordres, exécutions et positions. Quantités en NUMERIC(28,8) (jamais de flottant pour les avoirs).
CREATE TABLE IF NOT EXISTS crypto_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_order_id VARCHAR(64) NOT NULL,              -- idempotence : même identifiant = même ordre
  asset_id INTEGER NOT NULL REFERENCES crypto_assets(id),
  side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
  type VARCHAR(12) NOT NULL CHECK (type IN ('market', 'limit', 'stop_loss', 'take_profit')),
  quantity NUMERIC(28,8) NOT NULL CHECK (quantity > 0),
  trigger_price DOUBLE PRECISION,                    -- prix limite / seuil de déclenchement (en $)
  status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'filled', 'cancelled', 'rejected')),
  reject_reason TEXT,
  created_sim_at TIMESTAMPTZ NOT NULL,               -- date SIMULÉE de création
  closed_sim_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_order_id)
);
CREATE INDEX IF NOT EXISTS idx_crypto_orders_user ON crypto_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_orders_open ON crypto_orders(user_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS crypto_fills (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES crypto_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES crypto_assets(id),
  side VARCHAR(4) NOT NULL,
  quantity NUMERIC(28,8) NOT NULL,
  ref_price DOUBLE PRECISION NOT NULL,               -- prix de marché avant spread et glissement
  price DOUBLE PRECISION NOT NULL,                   -- prix effectif
  spread_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  slippage_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  liquidity_tier SMALLINT NOT NULL,
  maker BOOLEAN NOT NULL DEFAULT FALSE,
  notional_coins INTEGER NOT NULL,                   -- montant échangé (pièces entières)
  fee_coins INTEGER NOT NULL DEFAULT 0,
  tax_coins INTEGER NOT NULL DEFAULT 0,
  basis_coins INTEGER,                               -- prix de revient de la part vendue
  gain_coins INTEGER,                                -- plus-value brute (vente) = produit − prix de revient
  sim_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crypto_fills_user ON crypto_fills(user_id, sim_at DESC);

CREATE TABLE IF NOT EXISTS crypto_positions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES crypto_assets(id),
  quantity NUMERIC(28,8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  cost_basis_coins NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (cost_basis_coins >= 0),
  realized_gain_coins BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, asset_id)
);
