-- Administration : suspension d'un compte (réversible), avec motif. Un compte suspendu ne peut plus se connecter et ses sessions sont refusées.
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_reason TEXT;
