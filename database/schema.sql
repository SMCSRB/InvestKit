-- ============================================
-- InvestKit Database Schema
-- ============================================

-- Drop existing objects if they exist (dev only)
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS risk_analysis CASCADE;
DROP TABLE IF EXISTS investment_projects CASCADE;
DROP TABLE IF EXISTS investor_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 👥 USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(10),
  reset_token VARCHAR(255),
  reset_token_expires_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_code ON users(verification_code);

-- ============================================
-- 📊 INVESTOR PROFILES TABLE
-- ============================================
CREATE TABLE investor_profiles (
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

CREATE INDEX idx_investor_profiles_user_id ON investor_profiles(user_id);

-- ============================================
-- 💼 INVESTMENT PROJECTS TABLE
-- ============================================
CREATE TABLE investment_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_type VARCHAR(50), -- real_estate, crypto, stocks, bonds, etf, etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  initial_investment DECIMAL(15,2) NOT NULL,
  expected_return DECIMAL(5,2),
  investment_horizon_months INT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, abandoned
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investment_projects_user_id ON investment_projects(user_id);
CREATE INDEX idx_investment_projects_status ON investment_projects(status);
CREATE INDEX idx_investment_projects_type ON investment_projects(project_type);

-- ============================================
-- 🛡️ RISK ANALYSIS TABLE
-- ============================================
CREATE TABLE risk_analysis (
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

CREATE INDEX idx_risk_analysis_project_id ON risk_analysis(project_id);
CREATE INDEX idx_risk_analysis_date ON risk_analysis(analysis_date);

-- ============================================
-- 📚 COURSES TABLE
-- ============================================
CREATE TABLE courses (
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

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_courses_published ON courses(is_published);

-- ============================================
-- 🎓 USER PROGRESS TABLE
-- ============================================
CREATE TABLE user_progress (
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

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX idx_user_progress_completion ON user_progress(completion_percentage);

-- ============================================
-- ✅ INITIALIZE DATA
-- ============================================

-- Insert sample courses
INSERT INTO courses (title, description, category, level, duration_minutes, content, order_index, is_published)
VALUES
  ('Introduction aux Stocks', 'Apprenez les bases de l''investissement en actions', 'stocks', 'beginner', 30, 'Contenu du cours...', 1, TRUE),
  ('Comprendre la Crypto', 'Guide complet sur la blockchain et les cryptomonnaies', 'crypto', 'beginner', 45, 'Contenu du cours...', 1, TRUE),
  ('L''Immobilier pour Débuter', 'Les fondamentaux de l''investissement immobilier', 'real_estate', 'beginner', 50, 'Contenu du cours...', 1, TRUE),
  ('Stratégies Avancées en Bourse', 'Techniques avancées pour investisseurs expérimentés', 'stocks', 'expert', 120, 'Contenu du cours...', 2, TRUE);
