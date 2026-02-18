-- AI Usage Tracking Table
-- Run this SQL to add AI usage tracking to your database

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  org_id INTEGER,
  type TEXT NOT NULL,  -- 'lesson-help', 'admin-help', 'assignment-feedback', 'simplify'
  question TEXT,
  response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_usage(type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);

-- Query to check AI usage statistics
-- SELECT type, COUNT(*) as count, DATE(created_at) as date 
-- FROM ai_usage 
-- GROUP BY type, DATE(created_at) 
-- ORDER BY created_at DESC;
