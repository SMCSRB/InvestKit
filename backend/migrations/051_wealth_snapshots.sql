-- Historique du patrimoine (6g, G1). Écrit PAR LE SERVEUR quand le portefeuille du joueur est calculé (après chaque action, à chaque lecture du solde) :
-- jamais par le navigateur. Un point par jour (UTC) au plus : le dernier du jour gagne, pour que la table reste petite.
-- L'historique COMMENCE le jour du déploiement : on n'invente pas le passé (aucun remplissage rétroactif).
-- Les dates de JEU de chaque domaine sont gardées à part (`game_clock`) : tant que les horloges ne sont pas unifiées (6c), un point « à la même date »
-- n'a pas de sens entre domaines ; la date réelle du point est l'ordre de lecture honnête.
CREATE TABLE IF NOT EXISTS wealth_snapshots (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  liquidity BIGINT NOT NULL,
  stocks BIGINT NOT NULL,
  crypto BIGINT NOT NULL,
  real_estate_net BIGINT NOT NULL,
  debts BIGINT NOT NULL,
  financial BIGINT NOT NULL,
  total BIGINT NOT NULL,
  game_clock JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
