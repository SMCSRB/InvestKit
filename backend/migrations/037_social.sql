-- Amis et guildes RÉELS (remplacent les profils d'exemple gardés dans le navigateur).
-- Données minimales : nom de joueur, niveau et XP d'éducation. Jamais d'e-mail ni de nom civil.

-- Code ami : court, sans caractères ambigus, unique ; généré à la première utilisation.
ALTER TABLE users ADD COLUMN IF NOT EXISTS friend_code VARCHAR(10) UNIQUE;

-- Une ligne par paire de joueurs (user_low < user_high : jamais de doublon dans l'autre sens).
CREATE TABLE IF NOT EXISTS friendships (
  id BIGSERIAL PRIMARY KEY,
  user_low UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CHECK (user_low < user_high),
  UNIQUE (user_low, user_high)
);
CREATE INDEX IF NOT EXISTS idx_friendships_high ON friendships (user_high);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker, blocked),
  CHECK (blocker <> blocked)
);

-- Guildes : un joueur appartient à UNE guilde au plus ; le propriétaire est le membre de rôle « owner ».
CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(24) NOT NULL,
  name_key VARCHAR(24) NOT NULL UNIQUE,
  description VARCHAR(140) NOT NULL DEFAULT '',
  invite_code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS guild_members (
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(8) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_one_owner ON guild_members (guild_id) WHERE role = 'owner';
