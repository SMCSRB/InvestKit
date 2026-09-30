-- Étape 0 du domaine Immobilier : sécuriser le ledger, appliquer les
-- abonnements, alimenter le classement.

-- 1. Le solde InvestCoins ne peut jamais être négatif. NOT VALID : ne
--    revérifie pas les lignes existantes (elles ont pu être touchées par la
--    course lecture-solde/débit corrigée dans le même lot) mais s'applique à
--    toute écriture future. Ceinture et bretelles : le débit applicatif est
--    déjà conditionnel (voir investcoinsRepository).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_balance_non_negative') THEN
    ALTER TABLE investcoins_balance
      ADD CONSTRAINT investcoins_balance_non_negative CHECK (balance >= 0) NOT VALID;
  END IF;
END $$;

-- 2. Passage manuel en Pro pour les testeurs (Stripe pas encore branché).
--    Champ séparé de subscription_tier pour qu'un webhook Stripe ne l'écrase
--    jamais : accès Pro effectif = subscription_tier = 'pro' OU pro_override.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_override BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Classement : cumul des achats/ventes par portefeuille (le gain réel se
--    calcule sur ces totaux, pas sur les seules positions encore ouvertes).
ALTER TABLE virtual_portfolios ADD COLUMN IF NOT EXISTS total_bought DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE virtual_portfolios ADD COLUMN IF NOT EXISTS total_proceeds DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Rattrapage des portefeuilles existants : on ne connaît pas l'historique,
-- mais on connaît le prix de revient des positions encore ouvertes.
-- Idempotent : ne touche que les portefeuilles jamais renseignés.
UPDATE virtual_portfolios
SET total_bought = (
  SELECT COALESCE(SUM((p->>'quantity')::numeric * (p->>'avgBuyPrice')::numeric), 0)
  FROM jsonb_array_elements(positions) AS p
)
WHERE total_bought = 0 AND positions <> '[]'::jsonb;

-- Capital engagé au moment de l'instantané : sert au seuil de classement
-- (pas de classement avec un capital dérisoire, qui donnerait des % absurdes).
ALTER TABLE leaderboard_rankings ADD COLUMN IF NOT EXISTS capital_committed DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Une performance crypto peut dépasser +10 000 % (DECIMAL(8,4) plafonnait à
-- 9999,9999 et aurait fait échouer l'écriture du classement). Élargissement
-- sans perte, exécuté seulement s'il est encore nécessaire.
DO $$
BEGIN
  IF (SELECT numeric_precision FROM information_schema.columns
      WHERE table_name = 'leaderboard_rankings' AND column_name = 'performance_pct') < 14 THEN
    ALTER TABLE leaderboard_rankings ALTER COLUMN performance_pct TYPE DECIMAL(14,4);
  END IF;
END $$;
