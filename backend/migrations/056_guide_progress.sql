-- Visite guidée interactive : avancement de CHAQUE compte, enregistré côté serveur (pour ne pas rejouer la visite sur un autre appareil).
-- Le contenu est validé par une liste fermée (backend/src/config/guideRules.ts) ; le navigateur n'écrit jamais autre chose que ces identifiants.
CREATE TABLE IF NOT EXISTS guide_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
