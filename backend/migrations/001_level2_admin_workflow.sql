BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  max_employees INTEGER,
  price_monthly NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_plans (name, description, max_employees, price_monthly)
VALUES
  ('Free', 'Starter plan for trial organizations', 10, 0),
  ('Basic', 'Core workforce monitoring for small teams', 50, 29),
  ('Pro', 'Advanced policies and reporting for growing teams', 250, 99),
  ('Enterprise', 'Organization-wide monitoring and custom policy support', NULL, 299)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
  ADD COLUMN IF NOT EXISTS working_start TIME DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS working_end TIME DEFAULT '17:00';

UPDATE organizations
SET subscription_plan_id = COALESCE(
  subscription_plan_id,
  (SELECT id FROM subscription_plans WHERE name = 'Free')
)
WHERE subscription_plan_id IS NULL;

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, name)
);

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_token TEXT UNIQUE;

UPDATE users
SET agent_token = gen_random_uuid()::text
WHERE agent_token IS NULL;

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS productivity_category VARCHAR(20) DEFAULT 'neutral'
    CHECK (productivity_category IN ('productive', 'unproductive', 'neutral'));

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, holiday_date, name)
);

CREATE TABLE IF NOT EXISTS attendance_rules (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  late_after_minutes INTEGER DEFAULT 10,
  half_day_after_minutes INTEGER DEFAULT 240,
  minimum_hours_per_day NUMERIC(4, 2) DEFAULT 8,
  allow_weekend_work BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id)
);

CREATE TABLE IF NOT EXISTS productivity_rules (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('app', 'site')),
  pattern VARCHAR(255) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('productive', 'unproductive', 'neutral')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, rule_type, pattern)
);

CREATE TABLE IF NOT EXISTS monitoring_policies (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  screenshot_interval_seconds INTEGER DEFAULT 0,
  idle_threshold_seconds INTEGER DEFAULT 300,
  url_tracking_enabled BOOLEAN DEFAULT true,
  app_tracking_enabled BOOLEAN DEFAULT true,
  keyboard_activity_tracking_enabled BOOLEAN DEFAULT false,
  mouse_activity_tracking_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id)
);

INSERT INTO attendance_rules (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO monitoring_policies (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO productivity_rules (organization_id, rule_type, pattern, category)
SELECT o.id, seed.rule_type, seed.pattern, seed.category
FROM organizations o
CROSS JOIN (
  VALUES
    ('app', 'VS Code', 'productive'),
    ('site', 'GitHub', 'productive'),
    ('site', 'Instagram', 'unproductive'),
    ('site', 'YouTube', 'neutral')
) AS seed(rule_type, pattern, category)
ON CONFLICT (organization_id, rule_type, pattern) DO NOTHING;

COMMIT;
