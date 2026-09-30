-- Retours utilisateurs (bugs, idées, 👍/👎) et annonces / nouveautés gérées par l'administrateur (mini-CMS).
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('bug', 'idea', 'thumb')),
  rating SMALLINT CHECK (rating IN (-1, 1)),
  message TEXT,
  page VARCHAR(200),
  status VARCHAR(12) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'done', 'wontfix')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback (status, created_at DESC);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(12) NOT NULL DEFAULT 'info' CHECK (kind IN ('info', 'new', 'maintenance')),
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements (published, published_at DESC);
