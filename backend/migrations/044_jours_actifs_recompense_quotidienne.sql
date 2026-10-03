-- Jours actifs (compteur sans pénalité) et récompense quotidienne sans série.
-- Rejouée à chaque démarrage : tout est idempotent.

-- 1) Jours actifs : nombre de jours (UTC) où le joueur a utilisé le site. Il ne baisse JAMAIS (garde-fou en base).
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_day DATE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_active_days_nonneg') THEN
    ALTER TABLE users ADD CONSTRAINT users_active_days_nonneg CHECK (active_days >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION users_active_days_never_decrease() RETURNS trigger AS $$
BEGIN
  IF NEW.active_days < OLD.active_days THEN
    RAISE EXCEPTION 'Le compteur de jours actifs ne peut pas baisser (% -> %)', OLD.active_days, NEW.active_days;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_active_days_monotonic ON users;
CREATE TRIGGER trg_users_active_days_monotonic
  BEFORE UPDATE OF active_days ON users
  FOR EACH ROW EXECUTE FUNCTION users_active_days_never_decrease();

-- 2) Récompense quotidienne : une ligne par jour payé (semaine du lundi au dimanche, UTC).
--    La série (users.daily_streak) n'est plus utilisée : la colonne est conservée, sans effet.
CREATE TABLE IF NOT EXISTS daily_reward_claims (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_day DATE NOT NULL,
  week_start DATE NOT NULL,
  coins INTEGER NOT NULL CHECK (coins > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, claim_day)
);
CREATE INDEX IF NOT EXISTS idx_daily_reward_claims_week ON daily_reward_claims (user_id, week_start);
