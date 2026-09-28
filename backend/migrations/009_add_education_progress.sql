-- Phase 2B (roadmap v6) - suivi réel de la progression éducative, pour
-- récompenser les quiz en InvestCoins. La table courses/user_progress
-- existante (schema.sql d'origine) correspond à un catalogue générique
-- jamais réellement branché au contenu (data/education.js utilise ses
-- propres identifiants domainId/chapterId) : plutôt que de forcer un
-- mauvais raccord, cette table suit directement ce schéma-là.
CREATE TABLE IF NOT EXISTS education_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id VARCHAR(50) NOT NULL,
  -- '__domain_complete__' = complétion du domaine entier (pas NULL : la
  -- contrainte UNIQUE ci-dessous ne bloquerait pas les doublons sur NULL)
  chapter_id VARCHAR(50) NOT NULL DEFAULT '__domain_complete__',
  score INT,
  xp_earned INT NOT NULL DEFAULT 0,
  coins_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, domain_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_education_progress_user_id ON education_progress(user_id);
