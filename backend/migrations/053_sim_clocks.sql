-- Horloge de jeu unique par joueur (6c). Une ligne par joueur et par mode : `history` (Histoire) est le seul mode utilisé pour l'instant ;
-- `sandbox` (Bac à sable) et `live` (En ligne) sont réservés (décision d'Andreja), pas encore créés par le jeu.
-- Seul le serveur écrit ici (fonction d'avance unique) ; le navigateur n'envoie jamais de date.
CREATE TABLE IF NOT EXISTS sim_clocks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(10) NOT NULL DEFAULT 'history' CHECK (mode IN ('history', 'sandbox', 'live')),
  start_day DATE NOT NULL,
  current_day DATE NOT NULL CHECK (current_day >= start_day),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mode)
);
