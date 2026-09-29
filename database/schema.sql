-- ============================================
-- InvestKit Database Schema
-- ============================================

-- NOTE: ce script tourne à CHAQUE démarrage du serveur (voir executeSchema()).
-- Il ne doit donc JAMAIS supprimer les tables existantes (DROP TABLE) sous peine
-- d'effacer tous les comptes utilisateurs à chaque redémarrage/déploiement.
-- Toute évolution de schéma doit passer par une migration idempotente dans
-- backend/migrations/ (ALTER TABLE ... IF NOT EXISTS).

-- ============================================
-- 🎟️ INVITATION CODES (inscription sur invitation)
-- ============================================
-- Inscription sur invitation : codes à nombre d'utilisations limité, date
-- d'expiration optionnelle, révocables. Chaque compte garde le code utilisé.
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  uses INT NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at TIMESTAMP,          -- NULL = n'expire pas
  revoked_at TIMESTAMP,          -- non NULL = révoqué
  note VARCHAR(200),             -- ex : "pour Julien"
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT invitation_codes_uses_le_max CHECK (uses <= max_uses)
);


-- ============================================
-- 👥 USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  username VARCHAR(30) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- user, admin
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro
  free_domain VARCHAR(50), -- domaine débloqué gratuitement (Dashboard Pro limité à 1 domaine en free)
  stripe_customer_id VARCHAR(255) UNIQUE,
  free_domain_change_allowed BOOLEAN NOT NULL DEFAULT FALSE, -- 1 changement de domaine gratuit accordé aux comptes existants
  pro_override BOOLEAN NOT NULL DEFAULT FALSE, -- passage manuel en Pro (testeurs) : indépendant de Stripe
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(10),
  verification_code_expires_at TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expires_at TIMESTAMP,
  account_type VARCHAR(50),
  interests VARCHAR(500),
  language VARCHAR(10) DEFAULT 'fr',
  enable_2fa BOOLEAN DEFAULT FALSE,
  totp_secret VARCHAR(255),
  totp_backup_codes JSONB,
  daily_streak INT NOT NULL DEFAULT 0,
  last_daily_claim_at TIMESTAMP,
  referral_code VARCHAR(20) UNIQUE,
  referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invitation_code_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL, -- code d'invitation utilisé à l'inscription
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- ============================================
-- 📊 INVESTOR PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  risk_tolerance VARCHAR(50), -- low, medium, high
  investment_goals TEXT,
  portfolio_value DECIMAL(15,2) DEFAULT 0,
  investment_experience VARCHAR(50), -- beginner, intermediate, expert
  preferred_markets TEXT[], -- Array of markets: immobilier, crypto, stocks, bonds, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id ON investor_profiles(user_id);

-- ============================================
-- 💼 INVESTMENT PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investment_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_type VARCHAR(50), -- real_estate, crypto, stocks, bonds, etf, etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  initial_investment DECIMAL(15,2) NOT NULL,
  expected_return DECIMAL(5,2),
  investment_horizon_months INT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, abandoned
  tags TEXT[], -- étiquettes libres posées par l'utilisateur
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  parent_project_id UUID REFERENCES investment_projects(id) ON DELETE SET NULL, -- versioning: pointe vers la version précédente
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_projects_user_id ON investment_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_projects_status ON investment_projects(status);
CREATE INDEX IF NOT EXISTS idx_investment_projects_type ON investment_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_investment_projects_parent ON investment_projects(parent_project_id);

-- ============================================
-- 🛡️ RISK ANALYSIS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES investment_projects(id) ON DELETE CASCADE,
  current_risk_score DECIMAL(5,2), -- 0-100
  future_risk_score DECIMAL(5,2), -- 0-100
  risk_level VARCHAR(50), -- low, medium, high, critical
  risk_factors JSONB, -- JSON array of risk factors
  recommendations TEXT, -- AI recommendations
  confidence_score DECIMAL(3,2), -- 0-1
  analysis_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_analysis_project_id ON risk_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_analysis_date ON risk_analysis(analysis_date);

-- ============================================
-- 📚 COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- stocks, crypto, real_estate, bonds, etf, etc.
  level VARCHAR(50), -- beginner, intermediate, expert
  duration_minutes INT,
  content TEXT,
  content_html TEXT,
  order_index INT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

-- ============================================
-- 🎓 USER PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completion_percentage DECIMAL(5,2) DEFAULT 0, -- 0-100
  xp_earned INT DEFAULT 0,
  level INT DEFAULT 1,
  quiz_score DECIMAL(5,2),
  last_accessed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completion ON user_progress(completion_percentage);

-- ============================================
-- 💳 SUBSCRIPTIONS TABLE (Phase 2A - historique et statut des abonnements)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL, -- free, pro
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, canceled, expired, trialing, past_due
  payment_provider VARCHAR(50), -- stripe, paypal, etc.
  external_subscription_id VARCHAR(255), -- id côté fournisseur de paiement
  started_at TIMESTAMP DEFAULT NOW(),
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 🔒 API QUOTA TABLES (quota technique interne, invisible pour l'utilisateur)
-- ============================================
CREATE TABLE IF NOT EXISTS api_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quota_type VARCHAR(50) NOT NULL, -- ex: 'simulation', 'ai_recommendation', 'export_pdf'
  used_count INT NOT NULL DEFAULT 0,
  quota_limit INT NOT NULL,
  period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  period_end TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, quota_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_api_quota_user_id ON api_quota(user_id);
CREATE INDEX IF NOT EXISTS idx_api_quota_type ON api_quota(quota_type);

CREATE TABLE IF NOT EXISTS quota_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quota_type VARCHAR(50) NOT NULL,
  amount INT NOT NULL, -- consommation (positif) ou reset/octroi (négatif ou remise à zéro)
  action VARCHAR(20) NOT NULL, -- consume, reset, grant
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_transactions_user_id ON quota_transactions(user_id);

-- ============================================
-- 🪙 INVESTCOINS TABLES (Phase 2B - économie virtuelle)
-- ============================================
CREATE TABLE IF NOT EXISTS investcoins_balance (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT investcoins_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS investcoins_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL, -- positif = gain, négatif = dépense
  reason VARCHAR(100) NOT NULL, -- quiz, streak, checklist, level_up, referral, first_simulation, daily_reward, trade...
  metadata JSONB,
  domain VARCHAR(50), -- stocks, crypto, real_estate... ; NULL = hors domaine
  nature VARCHAR(12) NOT NULL CHECK (nature IN ('creation', 'destruction', 'exchange')), -- création / destruction de pièces, ou simple échange
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investcoins_transactions_user_id ON investcoins_transactions(user_id);

-- ============================================
-- 📈 VIRTUAL PORTFOLIOS TABLE (trading simulé, par utilisateur et par mode)
-- ============================================
CREATE TABLE IF NOT EXISTS virtual_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL, -- realtime, accelerated
  domain VARCHAR(50) NOT NULL, -- crypto, stocks, real_estate, bonds, global (Pro)
  cash_balance DECIMAL(15,2) NOT NULL DEFAULT 0, -- non utilisé : le cash de trading est le solde InvestCoins
  positions JSONB NOT NULL DEFAULT '[]', -- positions ouvertes (actif, quantité, prix d'entrée...)
  simulated_year INT NOT NULL DEFAULT 2010, -- année courante du mode Accéléré/Historique
  total_bought DECIMAL(15,2) NOT NULL DEFAULT 0, -- cumul des achats (base du classement)
  total_proceeds DECIMAL(15,2) NOT NULL DEFAULT 0, -- cumul des ventes
  started_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mode, domain)
);

CREATE INDEX IF NOT EXISTS idx_virtual_portfolios_user_id ON virtual_portfolios(user_id);

-- ============================================
-- 🏆 LEADERBOARD RANKINGS TABLE (classement séparé par mode)
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL, -- realtime, accelerated
  domain VARCHAR(50) NOT NULL, -- crypto, stocks, real_estate, bonds, global
  period VARCHAR(20) NOT NULL DEFAULT 'all-time', -- week, month, all-time
  performance_pct DECIMAL(14,4) NOT NULL DEFAULT 0,
  capital_committed DECIMAL(15,2) NOT NULL DEFAULT 0, -- capital engagé à l'instantané (seuil de classement)
  rank INT,
  computed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mode, domain, period)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings_lookup ON leaderboard_rankings(mode, domain, period, rank);

-- ============================================
-- 📝 AUDIT LOGS TABLE (append-only)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL si action système
  action VARCHAR(100) NOT NULL, -- ex: 'login', 'password_reset', 'subscription_change', 'admin_impersonate'
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- 🚩 FEATURE FLAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  rollout_percentage INT NOT NULL DEFAULT 0, -- 0-100, pour un déploiement progressif
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 🎓 EDUCATION PROGRESS TABLE (suivi réel, récompenses InvestCoins)
-- ============================================
CREATE TABLE IF NOT EXISTS education_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id VARCHAR(50) NOT NULL,
  chapter_id VARCHAR(50) NOT NULL DEFAULT '__domain_complete__',
  score INT,
  xp_earned INT NOT NULL DEFAULT 0,
  coins_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, domain_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_education_progress_user_id ON education_progress(user_id);

-- ============================================
-- ✅ INITIALIZE DATA (une seule fois, table vide uniquement)
-- ============================================

INSERT INTO courses (title, description, category, level, duration_minutes, content, order_index, is_published)
SELECT * FROM (VALUES
  ('Introduction aux Stocks', 'Apprenez les bases de l''investissement en actions', 'stocks', 'beginner', 30, 'Contenu du cours...', 1, TRUE),
  ('Comprendre la Crypto', 'Guide complet sur la blockchain et les cryptomonnaies', 'crypto', 'beginner', 45, 'Contenu du cours...', 1, TRUE),
  ('L''Immobilier pour Débuter', 'Les fondamentaux de l''investissement immobilier', 'real_estate', 'beginner', 50, 'Contenu du cours...', 1, TRUE),
  ('Stratégies Avancées en Bourse', 'Techniques avancées pour investisseurs expérimentés', 'stocks', 'expert', 120, 'Contenu du cours...', 2, TRUE)
) AS seed(title, description, category, level, duration_minutes, content, order_index, is_published)
WHERE NOT EXISTS (SELECT 1 FROM courses);

-- ============================================
-- 🏠 IMMOBILIER (étape 3) : partie, expertises, prêts, biens
-- ============================================

CREATE TABLE IF NOT EXISTS re_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  profile VARCHAR(20) NOT NULL CHECK (profile IN ('student', 'employee', 'executive')),
  data_source VARCHAR(20) NOT NULL DEFAULT 'fictive',
  simulated_year INT NOT NULL,
  simulated_month INT NOT NULL DEFAULT 1 CHECK (simulated_month BETWEEN 1 AND 12),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expertise payée avant achat : révèle les travaux réels et les défauts cachés.
CREATE TABLE IF NOT EXISTS re_expertises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  listing_id VARCHAR(80) NOT NULL,
  year INT NOT NULL,
  cost_coins INT NOT NULL CHECK (cost_coins > 0),
  real_works NUMERIC(12,2) NOT NULL,
  hidden_defects JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (game_id, listing_id, year)
);

CREATE TABLE IF NOT EXISTS re_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  principal NUMERIC(14,2) NOT NULL CHECK (principal > 0),
  annual_rate_pct NUMERIC(6,3) NOT NULL,
  months INT NOT NULL CHECK (months > 0),
  insurance_rate_pct NUMERIC(5,3) NOT NULL,
  monthly_payment NUMERIC(12,2) NOT NULL,      -- assurance comprise
  upfront_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  taeg_pct NUMERIC(7,4),
  months_paid INT NOT NULL DEFAULT 0,
  started_year INT NOT NULL,
  started_month INT NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS re_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  listing_id VARCHAR(80) NOT NULL,
  city_id VARCHAR(50) NOT NULL,
  neighborhood_id VARCHAR(80) NOT NULL,
  title VARCHAR(200) NOT NULL,
  property_type VARCHAR(20) NOT NULL,
  surface_sqm NUMERIC(8,2) NOT NULL,
  age VARCHAR(5) NOT NULL,
  energy_class CHAR(1) NOT NULL,
  condition VARCHAR(20) NOT NULL,
  purchase_year INT NOT NULL,
  purchase_month INT NOT NULL,
  purchase_price NUMERIC(14,2) NOT NULL,
  notary_fees NUMERIC(12,2) NOT NULL,
  works_financed NUMERIC(12,2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(14,2) NOT NULL,
  loan_id UUID REFERENCES re_loans(id) ON DELETE SET NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'let', 'sold')),
  current_rent NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_works_eur NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pending_works_eur >= 0),
  hidden_defects JSONB NOT NULL DEFAULT '[]',
  euro_remainder_cents INT NOT NULL DEFAULT 0 CHECK (euro_remainder_cents >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Un même bien ne peut pas être possédé deux fois (hors biens vendus).
CREATE UNIQUE INDEX IF NOT EXISTS uq_re_properties_owned_listing
  ON re_properties (game_id, listing_id) WHERE status <> 'sold';
CREATE INDEX IF NOT EXISTS idx_re_properties_game ON re_properties(game_id);
CREATE INDEX IF NOT EXISTS idx_re_loans_game ON re_loans(game_id);

-- ============================================
-- 🏠 IMMOBILIER (étape 4) : vie du bien
-- ============================================

ALTER TABLE re_games ADD COLUMN IF NOT EXISTS arrears_eur NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (arrears_eur >= 0);
ALTER TABLE re_games ADD COLUMN IF NOT EXISTS missed_months INT NOT NULL DEFAULT 0 CHECK (missed_months >= 0);

-- Location : loyer demandé, recherche de locataire en cours (NULL = pas mis en location), début du bail.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS asking_rent NUMERIC(10,2);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS rent_search_months_left INT CHECK (rent_search_months_left >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS lease_start_total INT;      -- année × 12 + mois du début du bail
-- État et classe énergie à l'achat (servent à la valorisation ; les colonnes condition / energy_class sont les valeurs ACTUELLES).
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS initial_condition VARCHAR(20);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS initial_energy_class CHAR(1);
UPDATE re_properties SET initial_condition = condition WHERE initial_condition IS NULL;
UPDATE re_properties SET initial_energy_class = energy_class WHERE initial_energy_class IS NULL;

-- Relevé mensuel d'un bien : lignes, explications, pièces créditées/débitées.
CREATE TABLE IF NOT EXISTS re_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status VARCHAR(12) NOT NULL,
  lines JSONB NOT NULL,
  explanations JSONB NOT NULL,
  net_cash_flow NUMERIC(12,2) NOT NULL,
  coins_delta INT NOT NULL DEFAULT 0,
  remainder_cents_after INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (property_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_re_statements_game ON re_statements(game_id, year, month);

-- ============================================
-- 🏠 IMMOBILIER : vacance mois par mois, graine
-- ============================================

-- Graine de la partie : tous les tirages (vacance, plus tard événements) en dérivent.
-- Deux parties avec la même graine et les mêmes actions donnent exactement les mêmes résultats.
ALTER TABLE re_games ADD COLUMN IF NOT EXISTS seed VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text;

-- Recherche de locataire : nombre de mois vides déjà écoulés depuis la mise en location
-- (NULL = pas de recherche en cours). Remplace rent_search_months_left (durée pré-tirée).
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS search_elapsed_months INT CHECK (search_elapsed_months >= 0);
UPDATE re_properties
SET search_elapsed_months = 0, rent_search_months_left = NULL
WHERE rent_search_months_left IS NOT NULL AND search_elapsed_months IS NULL;

-- ============================================
-- 🏠 IMMOBILIER (étape 5) : événements
-- ============================================

ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS tenant_type VARCHAR(10) CHECK (tenant_type IN ('student', 'worker', 'family'));
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS deposit_held_eur NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_held_eur >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS notice_end_total INT;          -- dernier mois payé par le locataire (année × 12 + mois)
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS notice_months INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS notice_reason VARCHAR(20);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS default_months INT NOT NULL DEFAULT 0 CHECK (default_months >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS default_months_in_lease INT NOT NULL DEFAULT 0 CHECK (default_months_in_lease >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS arrears_rent_eur NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (arrears_rent_eur >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS arrears_charges_eur NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (arrears_charges_eur >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS late_carry_rent NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_carry_rent >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS late_carry_charges NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_carry_charges >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS catch_up_pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS landlord_notice_reason VARCHAR(20);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS landlord_notice_effective_total INT;  -- dernier mois du bail
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_planned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS last_asking_ratio NUMERIC(5,3) NOT NULL DEFAULT 1;

-- Journal des événements d'une partie (expliqués après coup).
CREATE TABLE IF NOT EXISTS re_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES re_properties(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  kind VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_re_events_game ON re_events(game_id, year DESC, month DESC);

-- 🏠 IMMOBILIER : base imposable cumulée
-- déductibles − taxe foncière − intérêts d'emprunt…), réglé chaque décembre, jamais négatif.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS tax_base_ytd NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE re_events ADD COLUMN IF NOT EXISTS seq BIGSERIAL;

-- 🏠 IMMOBILIER (étape 6) : reventes
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_asking_price NUMERIC(14,2);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_search_elapsed_months INT CHECK (sale_search_elapsed_months >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sold_year INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sold_month INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sold_price NUMERIC(14,2);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_kind VARCHAR(20);
-- Argent investi APRÈS l'achat (travaux payés plus tard, rénovation) : sert au calcul de performance.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS extra_invested_eur NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Difficultés de paiement : mois (année × 12 + mois) où la banque a proposé la vente amiable.
ALTER TABLE re_games ADD COLUMN IF NOT EXISTS distress_since_total INT;

CREATE TABLE IF NOT EXISTS re_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES re_properties(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('amicable', 'distress_amicable', 'forced')),
  sale_price NUMERIC(14,2) NOT NULL,
  breakdown JSONB NOT NULL,        -- détail exact : prêt, indemnité, frais, plus-value, impôts, dépôt...
  net_proceeds NUMERIC(14,2) NOT NULL,   -- peut être négatif (solde dû à la banque)
  arrears_covered NUMERIC(14,2) NOT NULL DEFAULT 0,
  shortfall NUMERIC(14,2) NOT NULL DEFAULT 0,
  coins_credited INT NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (property_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_re_sales_game ON re_sales(game_id, year, month);

-- 021 : assurance loyers impayés (GLI), ajouts uniquement
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_since_total INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_episode_covered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_reimbursed_eur NUMERIC(14,2) NOT NULL DEFAULT 0;

-- 022 : banque (noyau)
-- Banque (module unique) : registre des dettes, crédit fléché par domaine, journal, drapeau de blocage.
-- Ajouts uniquement, sauf l'élargissement de la contrainte « nature » du registre (nouvelles valeurs 'credit' et 'repayment').

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check' AND pg_get_constraintdef(oid) LIKE '%repayment%') THEN
    ALTER TABLE investcoins_transactions DROP CONSTRAINT investcoins_transactions_nature_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check') THEN
    ALTER TABLE investcoins_transactions
      ADD CONSTRAINT investcoins_transactions_nature_check
      CHECK (nature IN ('creation', 'destruction', 'exchange', 'credit', 'repayment'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bank_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credit_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMP,
  defaults INT NOT NULL DEFAULT 0,
  recoveries INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product VARCHAR(20) NOT NULL CHECK (product IN ('personal', 'portfolio', 'mortgage')),
  domain VARCHAR(30) NOT NULL,                 -- domaine ET horloge du prêt
  repayment_type VARCHAR(15) NOT NULL DEFAULT 'annuity' CHECK (repayment_type IN ('annuity', 'interest_only')),
  principal_coins INT NOT NULL CHECK (principal_coins > 0),
  annual_rate_pct NUMERIC(6,3) NOT NULL CHECK (annual_rate_pct >= 0),
  months INT NOT NULL CHECK (months >= 1),
  accrued_instalments INT NOT NULL DEFAULT 0,  -- échéances tombées (une par mois d'horloge)
  balance_h BIGINT NOT NULL CHECK (balance_h >= 0),        -- capital restant dû, en centièmes de pièce
  remainder_h INT NOT NULL DEFAULT 0 CHECK (remainder_h >= 0 AND remainder_h < 100),
  due_principal_h BIGINT NOT NULL DEFAULT 0,   -- échéances tombées et non réglées
  due_interest_h BIGINT NOT NULL DEFAULT 0,
  missed_instalments INT NOT NULL DEFAULT 0,
  principal_paid_h BIGINT NOT NULL DEFAULT 0,
  interest_paid_h BIGINT NOT NULL DEFAULT 0,
  last_clock_total INT,                        -- dernier mois d'horloge réglé (jamais deux fois le même)
  opened_clock_total INT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'defaulted', 'liquidated')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bank_loans_user ON bank_loans(user_id, status);

-- Crédit fléché : pièces empruntées non encore dépensées, utilisables SEULEMENT dans leur domaine.
CREATE TABLE IF NOT EXISTS bank_credit_balances (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(30) NOT NULL,
  coins INT NOT NULL DEFAULT 0 CHECK (coins >= 0),
  PRIMARY KEY (user_id, domain)
);

CREATE TABLE IF NOT EXISTS bank_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES bank_loans(id) ON DELETE SET NULL,
  kind VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_events_user ON bank_events(user_id, id DESC);

-- 023 : levier affiché au classement
-- Classement : mention du levier utilisé (capital investi / capital propre). Ajout de colonne uniquement.
ALTER TABLE leaderboard_rankings ADD COLUMN IF NOT EXISTS leverage NUMERIC(6,2);

-- 024 : rétablissement après défaut
-- Banque : procédure de rétablissement après défaut. Ajouts de colonnes et de table ; le statut « written_off » (dette effacée) est ajouté aux prêts.
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMP;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS written_off_coins NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE bank_loans ADD COLUMN IF NOT EXISTS written_off_h BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_loans_status_check')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_loans_status_check' AND pg_get_constraintdef(oid) LIKE '%written_off%') THEN
    ALTER TABLE bank_loans DROP CONSTRAINT bank_loans_status_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_loans_status_check') THEN
    ALTER TABLE bank_loans ADD CONSTRAINT bank_loans_status_check CHECK (status IN ('active', 'repaid', 'defaulted', 'liquidated', 'written_off'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bank_recoveries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(30) NOT NULL,
  written_off_coins NUMERIC(14,2) NOT NULL DEFAULT 0,
  seized_coins INT NOT NULL DEFAULT 0,
  grant_coins INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_recoveries_user ON bank_recoveries(user_id, id DESC);
