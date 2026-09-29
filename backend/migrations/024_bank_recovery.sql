-- Banque : procédure de rétablissement après défaut. Ajouts de colonnes et de table ; le statut « written_off » (dette effacée) est ajouté aux prêts.
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMP;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS written_off_coins NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE bank_loans ADD COLUMN IF NOT EXISTS written_off_h BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_loans_status_check')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_loans_status_check' AND pg_get_constraintdef(oid) LIKE '%written_off%') THEN
    ALTER TABLE bank_loans DROP CONSTRAINT bank_loans_status_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_loans_status_check') THEN
    ALTER TABLE bank_loans ADD CONSTRAINT bank_loans_status_check CHECK (status IN ('active', 'repaid', 'defaulted', 'liquidated', 'written_off'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bank_recoveries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(30) NOT NULL,
  written_off_coins NUMERIC(14,2) NOT NULL DEFAULT 0,
  seized_coins INT NOT NULL DEFAULT 0,
  grant_coins INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_recoveries_user ON bank_recoveries(user_id, id DESC);
