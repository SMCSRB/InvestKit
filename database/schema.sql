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
