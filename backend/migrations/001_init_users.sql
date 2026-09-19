-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create investor_profiles table
CREATE TABLE IF NOT EXISTS investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  investor_type VARCHAR(50), -- beginner, intermediate, expert, professional
  risk_tolerance VARCHAR(50), -- low, medium, high
  investment_goals TEXT,
  portfolio_value DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create investment_projects table
CREATE TABLE IF NOT EXISTS investment_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_type VARCHAR(50), -- real_estate, crypto, stocks, bonds, etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  initial_investment DECIMAL(15, 2),
  expected_return DECIMAL(5, 2),
  risk_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create risk_analysis table
CREATE TABLE IF NOT EXISTS risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES investment_projects(id) ON DELETE CASCADE,
  current_risk DECIMAL(5, 2),
  future_risk DECIMAL(5, 2),
  risk_factors JSONB,
  recommendations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- stocks, crypto, real_estate, bonds, etc.
  level VARCHAR(50), -- beginner, intermediate, expert
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completion_percentage DECIMAL(3, 2) DEFAULT 0,
  xp_earned INT DEFAULT 0,
  level INT DEFAULT 1,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_investor_profiles_user_id ON investor_profiles(user_id);
CREATE INDEX idx_investment_projects_user_id ON investment_projects(user_id);
CREATE INDEX idx_risk_analysis_project_id ON risk_analysis(project_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
