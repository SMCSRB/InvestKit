-- Checklist d'accueil gamifiée : récompense d'InvestCoins une seule fois par étape et par joueur.
CREATE TABLE IF NOT EXISTS onboarding_rewards (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step VARCHAR(40) NOT NULL,
  coins INT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, step)
);
