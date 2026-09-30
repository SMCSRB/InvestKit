-- Domaine Crypto : compte du joueur (horloge simulée décidée par le SERVEUR) et état fiscal.
CREATE TABLE IF NOT EXISTS crypto_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL DEFAULT 'accelerated',
  start_at TIMESTAMPTZ NOT NULL,
  simulated_at TIMESTAMPTZ NOT NULL,           -- « maintenant » pour le joueur ; jamais fourni par le navigateur
  tax_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
