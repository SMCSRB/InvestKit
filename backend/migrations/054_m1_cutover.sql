-- Migration « M1 » vers l'horloge unique et la monnaie 1 InvestCoin = 1 € (6b-fin et 6c) : une ligne par joueur migré (idempotence + rapport avant/après).
CREATE TABLE IF NOT EXISTS m1_cutover (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report JSONB NOT NULL
);
