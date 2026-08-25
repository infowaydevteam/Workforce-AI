BEGIN;

CREATE TABLE IF NOT EXISTS employee_screenshots (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  captured_at TIMESTAMP NOT NULL,
  storage_path TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sha256 TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_screenshots_employee_captured
  ON employee_screenshots (employee_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_screenshots_org_captured
  ON employee_screenshots (organization_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_screenshots_expires
  ON employee_screenshots (expires_at);

CREATE TABLE IF NOT EXISTS screenshot_audit_logs (
  id SERIAL PRIMARY KEY,
  viewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  screenshot_id INTEGER REFERENCES employee_screenshots(id) ON DELETE SET NULL,
  employee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('search', 'view')),
  filters JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_screenshot_audit_logs_viewer_created
  ON screenshot_audit_logs (viewer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_screenshot_audit_logs_screenshot_created
  ON screenshot_audit_logs (screenshot_id, created_at DESC);

COMMIT;
