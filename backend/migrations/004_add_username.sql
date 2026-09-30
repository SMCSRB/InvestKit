-- Ajoute la colonne username (introduite après coup, manquait alors que le
-- code frontend/backend l'utilisait déjà : le pseudo n'était jamais sauvegardé)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
