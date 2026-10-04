-- Périodes (scénarios de départ) déjà jouées en mode Histoire : elles débloquent le Bac à sable pour un compte gratuit (6c, décision d'Andreja).
-- Écrit uniquement par le serveur quand l'horloge Histoire avance ; le navigateur n'écrit jamais ici.
CREATE TABLE IF NOT EXISTS played_periods (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id VARCHAR(20) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, scenario_id)
);
