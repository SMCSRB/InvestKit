-- Mail de bienvenue : nombre d'essais d'envoi et heure du dernier essai (réessai après échec, avec délai et plafond d'essais).
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_last_attempt_at TIMESTAMPTZ;
