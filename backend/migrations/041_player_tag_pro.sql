-- Identifiant « Pseudo#tag » et badge Pro visible par les autres.
-- Chaque joueur a un # automatique (4 chiffres) ; un joueur Pro peut choisir le sien (règles dans config/tagRules.ts, vérifiées par le serveur).
-- L'unicité de l'identité (pseudo + #, sans tenir compte de la casse ni des ressemblances 0/o, 1/i/l, 5/s…) est garantie PAR LA BASE (index unique).

-- Pliage des ressemblances (même idée que engine/playerTag.ts : fold). IMMUTABLE pour servir dans un index.
CREATE OR REPLACE FUNCTION ik_fold(t text) RETURNS text AS $$
  SELECT translate(lower(coalesce(t, '')), '01i|5$3@4', 'olllsseaa')
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS player_tag VARCHAR(12);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tag_custom BOOLEAN NOT NULL DEFAULT FALSE;      -- # choisi par un Pro (sinon automatique)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tag_changed_at TIMESTAMPTZ;                      -- dernier changement (1 par mois)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tag_grace_until TIMESTAMPTZ;                     -- fin du Pro constatée : # choisi gardé jusque-là
ALTER TABLE users ADD COLUMN IF NOT EXISTS tag_restore VARCHAR(12);                         -- # choisi remis en automatique : rendu si re-abonnement
ALTER TABLE users ADD COLUMN IF NOT EXISTS tag_restore_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_pro_badge BOOLEAN NOT NULL DEFAULT TRUE;    -- option de confidentialité : masquer le badge Pro aux autres

-- Historique (conservé) : chaque changement ; l'ancien # reste réservé à son ancien propriétaire jusqu'à held_until, puis il est libéré.
CREATE TABLE IF NOT EXISTS player_tag_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_tag VARCHAR(12),
  new_tag VARCHAR(12) NOT NULL,
  reason VARCHAR(12) NOT NULL CHECK (reason IN ('auto', 'custom', 'expired', 'restored')),
  username_key TEXT,
  old_tag_key TEXT,
  held_until TIMESTAMPTZ,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tag_history_user ON player_tag_history (user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_history_hold ON player_tag_history (username_key, old_tag_key, held_until);

-- # automatiques pour les joueurs existants (tirés de l'identifiant : stables). Les rares doublons sont corrigés avant de poser l'index.
UPDATE users SET player_tag = lpad((('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 10000)::text, 4, '0')
WHERE player_tag IS NULL AND username IS NOT NULL;

DO $$
DECLARE n INT := 1; i INT := 0;
BEGIN
  WHILE n > 0 AND i < 50 LOOP
    UPDATE users u SET player_tag = lpad((floor(random() * 10000))::int::text, 4, '0')
    FROM (SELECT id, row_number() OVER (PARTITION BY ik_fold(username), ik_fold(player_tag) ORDER BY created_at, id) AS rn
          FROM users WHERE username IS NOT NULL AND player_tag IS NOT NULL) d
    WHERE u.id = d.id AND d.rn > 1;
    GET DIAGNOSTICS n = ROW_COUNT;
    i := i + 1;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_identity ON users (ik_fold(username), ik_fold(player_tag))
  WHERE username IS NOT NULL AND player_tag IS NOT NULL;
