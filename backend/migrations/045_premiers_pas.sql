-- Bonus « premiers pas » : un par clé et par compte (clé primaire), jamais plus de trois par compte.
-- Rejouée à chaque démarrage : tout est idempotent.
CREATE TABLE IF NOT EXISTS first_step_bonuses (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL CHECK (step_key IN ('first_investment', 'first_lesson', 'first_quiz')),
  coins INTEGER NOT NULL CHECK (coins > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, step_key)
);
