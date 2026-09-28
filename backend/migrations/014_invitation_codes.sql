-- Inscription sur invitation : codes à nombre d'utilisations limité, date
-- d'expiration optionnelle, révocables. Chaque compte garde le code utilisé.
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  uses INT NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at TIMESTAMP,          -- NULL = n'expire pas
  revoked_at TIMESTAMP,          -- non NULL = révoqué
  note VARCHAR(200),             -- ex : "pour Julien"
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT invitation_codes_uses_le_max CHECK (uses <= max_uses)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_invitation_code_id ON users(invitation_code_id);
