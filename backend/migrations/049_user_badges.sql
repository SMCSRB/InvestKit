-- Badges attribués par le serveur (6a, PR 2). Un badge ne s'obtient qu'une fois (clé unique) ; la ligne garde la référence du fait déclencheur.
-- Aucune récompense en pièces n'est liée aux badges à ce stade : seulement de l'XP, via le journal d'XP (clé « badge:<id> »).
CREATE TABLE IF NOT EXISTS user_badges (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id VARCHAR(40) NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fact_ref VARCHAR(120),
  UNIQUE (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
