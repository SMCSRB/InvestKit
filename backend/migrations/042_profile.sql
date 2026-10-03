-- Profil : bio, photo de profil (stockée en base, jamais sur le disque de l'application) et changement d'adresse e-mail sécurisé.
-- Migration rejouée à chaque démarrage : tout est « IF NOT EXISTS ».

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
-- Identifiant aléatoire (non devinable) de la photo actuelle ; NULL = pas de photo. Il change à chaque envoi et à chaque suppression :
-- une ancienne adresse d'image cesse de fonctionner. Il n'est communiqué que dans les réponses de l'API qui affichent déjà ce joueur.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_avatar_id ON users (avatar_id) WHERE avatar_id IS NOT NULL;

-- Image déjà redimensionnée (256 x 256), recompressée et sans métadonnées : quelques ko par joueur.
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  image BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demande de changement d'adresse e-mail : une seule en attente par compte, code stocké haché, durée courte, essais limités.
CREATE TABLE IF NOT EXISTS email_change_requests (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
