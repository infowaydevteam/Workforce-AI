-- Level 1 Migration: Complete Platform Flow
-- Run this against your IWF database

-- Tenants (Company / multi-tenant root)
CREATE TABLE IF NOT EXISTS public.tenants (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments (under Organizations)
CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER REFERENCES public.organizations(id) ON DELETE CASCADE,
    manager_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    organization_id INTEGER,
    team_id INTEGER,
    department_id INTEGER,
    invited_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App Activity Classification (productive / unproductive)
CREATE TABLE IF NOT EXISTS public.app_categories (
    id SERIAL PRIMARY KEY,
    app_name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'Uncategorized',
    is_productive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add tenant_id to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Seed default productive/unproductive app classifications
INSERT INTO public.app_categories (app_name, category, is_productive) VALUES
  ('Microsoft Word', 'Office', true),
  ('Microsoft Excel', 'Office', true),
  ('Microsoft PowerPoint', 'Office', true),
  ('Visual Studio Code', 'Development', true),
  ('IntelliJ IDEA', 'Development', true),
  ('Slack', 'Communication', true),
  ('Microsoft Teams', 'Communication', true),
  ('Zoom', 'Communication', true),
  ('Google Chrome', 'Browser', true),
  ('Firefox', 'Browser', true),
  ('YouTube', 'Entertainment', false),
  ('Netflix', 'Entertainment', false),
  ('Facebook', 'Social Media', false),
  ('Twitter', 'Social Media', false),
  ('Instagram', 'Social Media', false)
ON CONFLICT (app_name) DO NOTHING;
