-- Disposition personnalisée du tableau de bord (6g, G4) : enregistrée côté serveur pour suivre le joueur sur tous ses appareils.
-- Le JSON est VALIDÉ par le serveur (liste blanche de blocs, taille maximale) avant d'arriver ici ; rien n'est interprété comme du HTML.
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  layout JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
