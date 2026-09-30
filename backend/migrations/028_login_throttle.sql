-- Anti credential-stuffing : compteur d'échecs de connexion PAR COMPTE (clé = empreinte de l'e-mail, même pour un e-mail inconnu,
-- pour ne pas révéler quels comptes existent) et verrouillage temporaire progressif.
CREATE TABLE IF NOT EXISTS login_throttle (
  key_hash VARCHAR(64) PRIMARY KEY,
  failures INT NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lock_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
