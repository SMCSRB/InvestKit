-- Journal d'XP côté serveur (6a, PR 1) : chaque gain d'XP est une ligne ajoutée, jamais modifiée.
-- La clé d'unicité (joueur, source, clé d'événement) empêche tout double gain (deux onglets, double clic, rejeu).
-- L'XP globale et par domaine se RECALCULENT à partir de ce journal : aucune colonne « total » à tenir à jour.
CREATE TABLE IF NOT EXISTS xp_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(20) NOT NULL CHECK (domain IN ('education', 'bourse', 'crypto', 'immobilier', 'banque', 'communaute')),
  source VARCHAR(30) NOT NULL,
  event_key VARCHAR(120) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 100000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source, event_key)
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_day ON xp_events(user_id, source, created_at);

-- Import UNIQUE de l'existant, sans perte : une ligne par complétion d'éducation déjà enregistrée par le serveur,
-- avec le même montant (plafonné comme dans les classements : 500 par ligne). Rejouable : la clé d'unicité évite les doublons.
INSERT INTO xp_events (user_id, domain, source, event_key, amount, created_at)
SELECT user_id, 'education', 'legacy_import', 'ep:' || id::text, LEAST(GREATEST(xp_earned, 0), 500), COALESCE(created_at, NOW())
FROM education_progress
WHERE xp_earned > 0
ON CONFLICT (user_id, source, event_key) DO NOTHING;
