-- Phase 2B (roadmap v6) - moteur de trading simulé, mode Accéléré/Historique.
-- Le "cash" utilisé pour trader EST le solde InvestCoins (décision produit :
-- un seul solde pour la gamification et le trading), donc la colonne
-- cash_balance de virtual_portfolios (créée en Phase 1) reste inutilisée
-- ici par choix, pas par oubli.
ALTER TABLE virtual_portfolios ADD COLUMN IF NOT EXISTS simulated_year INT NOT NULL DEFAULT 2010;
