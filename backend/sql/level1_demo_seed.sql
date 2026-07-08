ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tenant_slug VARCHAR(120),
  ADD COLUMN IF NOT EXISTS company_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS setup_status VARCHAR(40) DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS organizations_tenant_slug_idx
  ON organizations (tenant_slug)
  WHERE tenant_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, name)
);

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(40) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS agent_installed_at TIMESTAMP;

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS activity_category VARCHAR(60) DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS productivity_score INTEGER DEFAULT 50;

CREATE TABLE IF NOT EXISTS report_reviews (
  id SERIAL PRIMARY KEY,
  report_scope VARCHAR(60) DEFAULT 'employee',
  subject_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewer_role VARCHAR(40) NOT NULL,
  status VARCHAR(40) DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_onboarding_settings (
  organization_id INTEGER PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_plan VARCHAR(60) NOT NULL DEFAULT 'starter',
  timezone VARCHAR(120) NOT NULL DEFAULT 'America/Los_Angeles',
  working_days JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
  working_start TIME NOT NULL DEFAULT '09:00',
  working_end TIME NOT NULL DEFAULT '17:00',
  break_minutes INTEGER NOT NULL DEFAULT 60,
  attendance_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_status VARCHAR(40) NOT NULL DEFAULT 'draft',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_holidays (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_type VARCHAR(60) NOT NULL DEFAULT 'company',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, holiday_date, name)
);

DO $$
DECLARE
  demo_password TEXT := '$2b$10$pAdvSBqNGmmQPpmqBIMPnOig/iZ5MAHJgayaB9oPxLusnrRzumQh2';
  org_id INTEGER;
  engineering_id INTEGER;
  operations_id INTEGER;
  platform_team_id INTEGER;
  support_team_id INTEGER;
  admin_id INTEGER;
  manager_id INTEGER;
  hr_id INTEGER;
  executive_id INTEGER;
  employee_one_id INTEGER;
  employee_two_id INTEGER;
BEGIN
  SELECT id INTO org_id
  FROM organizations
  WHERE tenant_slug = 'acme-workforce-demo'
  LIMIT 1;

  IF org_id IS NULL THEN
    INSERT INTO organizations (name, description, tenant_slug, company_domain, setup_status)
    VALUES (
      'Acme Workforce Demo',
      'Demo tenant for the complete Level 1 platform flow',
      'acme-workforce-demo',
      'acme.example',
      'active'
    )
    RETURNING id INTO org_id;
  ELSE
    UPDATE organizations
    SET
      name = 'Acme Workforce Demo',
      description = 'Demo tenant for the complete Level 1 platform flow',
      company_domain = 'acme.example',
      setup_status = 'active'
    WHERE id = org_id;
  END IF;

  INSERT INTO departments (name, organization_id, description)
  VALUES ('Engineering', org_id, 'Product and platform delivery')
  ON CONFLICT (organization_id, name)
  DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO engineering_id;

  INSERT INTO departments (name, organization_id, description)
  VALUES ('Operations', org_id, 'Customer operations and delivery quality')
  ON CONFLICT (organization_id, name)
  DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO operations_id;

  INSERT INTO organization_onboarding_settings (
    organization_id,
    subscription_plan,
    timezone,
    working_days,
    working_start,
    working_end,
    break_minutes,
    attendance_rules,
    onboarding_status,
    completed_at,
    updated_at
  )
  VALUES (
    org_id,
    'growth',
    'America/Los_Angeles',
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]'::jsonb,
    '09:00',
    '17:30',
    60,
    '{
      "grace_period_minutes": 10,
      "half_day_hours": 4,
      "full_day_hours": 8,
      "overtime_enabled": true,
      "auto_checkout_enabled": true,
      "allow_remote_check_in": false
    }'::jsonb,
    'complete',
    NOW(),
    NOW()
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    subscription_plan = EXCLUDED.subscription_plan,
    timezone = EXCLUDED.timezone,
    working_days = EXCLUDED.working_days,
    working_start = EXCLUDED.working_start,
    working_end = EXCLUDED.working_end,
    break_minutes = EXCLUDED.break_minutes,
    attendance_rules = EXCLUDED.attendance_rules,
    onboarding_status = EXCLUDED.onboarding_status,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  DELETE FROM organization_holidays
  WHERE organization_id = org_id;

  INSERT INTO organization_holidays (organization_id, name, holiday_date, holiday_type)
  VALUES
    (org_id, 'New Year''s Day', DATE '2026-01-01', 'public'),
    (org_id, 'Independence Day', DATE '2026-07-04', 'public'),
    (org_id, 'Company Wellness Day', DATE '2026-09-04', 'company'),
    (org_id, 'Christmas Day', DATE '2026-12-25', 'public');

  SELECT id INTO platform_team_id
  FROM teams
  WHERE organization_id = org_id AND name = 'Platform Ops'
  LIMIT 1;

  IF platform_team_id IS NULL THEN
    INSERT INTO teams (name, organization_id, department_id)
    VALUES ('Platform Ops', org_id, engineering_id)
    RETURNING id INTO platform_team_id;
  ELSE
    UPDATE teams
    SET department_id = engineering_id
    WHERE id = platform_team_id;
  END IF;

  SELECT id INTO support_team_id
  FROM teams
  WHERE organization_id = org_id AND name = 'Customer Support'
  LIMIT 1;

  IF support_team_id IS NULL THEN
    INSERT INTO teams (name, organization_id, department_id)
    VALUES ('Customer Support', org_id, operations_id)
    RETURNING id INTO support_team_id;
  ELSE
    UPDATE teams
    SET department_id = operations_id
    WHERE id = support_team_id;
  END IF;

  INSERT INTO users (
    name, email, password, role, organization_id, status, last_active,
    agent_token, invitation_status, invited_at
  )
  VALUES (
    'Admin Demo', 'admin.demo@acme.example', demo_password, 'admin',
    org_id, 'Online', NOW(), '00000000-0000-4000-8000-000000000001',
    'active', NOW()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    status = EXCLUDED.status,
    last_active = NOW(),
    invitation_status = EXCLUDED.invitation_status
  RETURNING id INTO admin_id;

  INSERT INTO users (
    name, email, password, role, organization_id, department_id, team_id,
    status, last_active, agent_token, invitation_status, invited_at, agent_installed_at
  )
  VALUES (
    'Maya Manager', 'manager.demo@acme.example', demo_password, 'manager',
    org_id, engineering_id, platform_team_id, 'Online', NOW(),
    '00000000-0000-4000-8000-000000000002', 'accepted', NOW(), NOW()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    department_id = EXCLUDED.department_id,
    team_id = EXCLUDED.team_id,
    status = EXCLUDED.status,
    last_active = NOW(),
    invitation_status = EXCLUDED.invitation_status,
    agent_installed_at = EXCLUDED.agent_installed_at
  RETURNING id INTO manager_id;

  INSERT INTO users (
    name, email, password, role, organization_id, department_id, team_id,
    status, last_active, agent_token, invitation_status, invited_at
  )
  VALUES (
    'Harper HR', 'hr.demo@acme.example', demo_password, 'hr',
    org_id, operations_id, support_team_id, 'Online', NOW(),
    '00000000-0000-4000-8000-000000000003', 'active', NOW()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    department_id = EXCLUDED.department_id,
    team_id = EXCLUDED.team_id,
    status = EXCLUDED.status,
    last_active = NOW(),
    invitation_status = EXCLUDED.invitation_status
  RETURNING id INTO hr_id;

  INSERT INTO users (
    name, email, password, role, organization_id, status, last_active,
    agent_token, invitation_status, invited_at
  )
  VALUES (
    'Evan Executive', 'executive.demo@acme.example', demo_password, 'executive',
    org_id, 'Online', NOW(), '00000000-0000-4000-8000-000000000004',
    'active', NOW()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    status = EXCLUDED.status,
    last_active = NOW(),
    invitation_status = EXCLUDED.invitation_status
  RETURNING id INTO executive_id;

  INSERT INTO users (
    name, email, password, role, organization_id, department_id, team_id,
    manager_id, status, last_active, agent_token, invitation_status,
    invited_at, agent_installed_at
  )
  VALUES (
    'Ava Analyst', 'ava.employee@acme.example', demo_password, 'employee',
    org_id, engineering_id, platform_team_id, manager_id, 'Online', NOW(),
    '00000000-0000-4000-8000-000000000005', 'accepted', NOW(), NOW()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    department_id = EXCLUDED.department_id,
    team_id = EXCLUDED.team_id,
    manager_id = EXCLUDED.manager_id,
    status = EXCLUDED.status,
    last_active = NOW(),
    invitation_status = EXCLUDED.invitation_status,
    agent_installed_at = EXCLUDED.agent_installed_at
  RETURNING id INTO employee_one_id;

  INSERT INTO users (
    name, email, password, role, organization_id, department_id, team_id,
    manager_id, status, last_active, agent_token, invitation_status,
    invited_at, agent_installed_at
  )
  VALUES (
    'Ben Builder', 'ben.employee@acme.example', demo_password, 'employee',
    org_id, operations_id, support_team_id, manager_id, 'Idle', NOW(),
    '00000000-0000-4000-8000-000000000006', 'accepted', NOW(), NOW()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    department_id = EXCLUDED.department_id,
    team_id = EXCLUDED.team_id,
    manager_id = EXCLUDED.manager_id,
    status = EXCLUDED.status,
    last_active = NOW(),
    invitation_status = EXCLUDED.invitation_status,
    agent_installed_at = EXCLUDED.agent_installed_at
  RETURNING id INTO employee_two_id;

  UPDATE teams
  SET manager_id = (SELECT id FROM users WHERE email = 'manager.demo@acme.example')
  WHERE id IN (platform_team_id, support_team_id);

  DELETE FROM report_reviews
  WHERE subject_user_id IN (manager_id, hr_id, executive_id, employee_one_id, employee_two_id);

  DELETE FROM activity_logs
  WHERE user_id IN (manager_id, hr_id, executive_id, employee_one_id, employee_two_id);

  DELETE FROM idle_logs
  WHERE user_id IN (manager_id, hr_id, executive_id, employee_one_id, employee_two_id);

  DELETE FROM sessions
  WHERE user_id IN (manager_id, hr_id, executive_id, employee_one_id, employee_two_id);

  INSERT INTO sessions (user_id, login_time, logout_time, total_duration)
  VALUES
    (manager_id, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '20 minutes', 16800),
    (employee_one_id, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '20 minutes', 16800),
    (employee_two_id, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '20 minutes', 16800);

  INSERT INTO activity_logs (
    user_id, app_name, start_time, end_time, duration,
    activity_category, productivity_score
  )
  VALUES
    (employee_one_id, 'Visual Studio Code', NOW() - INTERVAL '345 minutes', NOW() - INTERVAL '250 minutes', 5700, 'productive', 100),
    (employee_one_id, 'GitHub', NOW() - INTERVAL '195 minutes', NOW() - INTERVAL '150 minutes', 2700, 'productive', 100),
    (employee_one_id, 'Slack', NOW() - INTERVAL '120 minutes', NOW() - INTERVAL '95 minutes', 1500, 'collaboration', 75),
    (employee_two_id, 'Zendesk', NOW() - INTERVAL '305 minutes', NOW() - INTERVAL '235 minutes', 4200, 'neutral', 50),
    (employee_two_id, 'YouTube', NOW() - INTERVAL '170 minutes', NOW() - INTERVAL '150 minutes', 1200, 'unproductive', 15),
    (manager_id, 'Google Meet', NOW() - INTERVAL '160 minutes', NOW() - INTERVAL '125 minutes', 2100, 'collaboration', 75);

  INSERT INTO idle_logs (user_id, start_time, end_time, duration)
  VALUES
    (employee_one_id, NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '65 minutes', 900),
    (employee_two_id, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', 900);

  INSERT INTO report_reviews (
    report_scope, subject_user_id, reviewer_id, reviewer_role, status, notes
  )
  VALUES
    ('employee', employee_one_id, manager_id, 'manager', 'approved', 'Manager reviewed Level 1 productivity report.'),
    ('employee', employee_one_id, hr_id, 'hr', 'approved', 'HR reviewed attendance and activity summary.');
END $$;
