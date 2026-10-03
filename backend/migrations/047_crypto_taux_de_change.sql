-- Crypto en InvestCoins : chaque exécution garde le taux de change utilisé (dollars pour 1 InvestCoin = 1 €, taux BCE du jour de jeu).
-- Les anciennes lignes valent 1 (à l'époque 1 InvestCoin = 1 $). Rejouée à chaque démarrage : idempotent.
ALTER TABLE crypto_fills ADD COLUMN IF NOT EXISTS fx_usd_per_coin NUMERIC(18, 8) NOT NULL DEFAULT 1;
