const pool = require("../db");

const productiveApps = [
  "visual studio",
  "vscode",
  "code",
  "github",
  "gitlab",
  "jira",
  "notion",
  "figma",
  "excel",
  "sheets",
  "docs",
  "postman",
  "terminal",
  "slack huddle",
  "zoom",
  "teams meeting",
];

const collaborationApps = [
  "slack",
  "microsoft teams",
  "gmail",
  "outlook",
  "calendar",
  "meet",
];

const unproductiveApps = [
  "youtube",
  "netflix",
  "instagram",
  "facebook",
  "twitter",
  "x.com",
  "reddit",
  "spotify",
  "game",
];

const normalizeAppName = (appName = "") => appName.toLowerCase().trim();

const includesAny = (value, terms) => terms.some((term) => value.includes(term));

const classifyActivity = (appName = "") => {
  const normalized = normalizeAppName(appName);

  if (!normalized) {
    return {
      activity_category: "uncategorized",
      productivity_score: 0,
    };
  }

  if (includesAny(normalized, productiveApps)) {
    return {
      activity_category: "productive",
      productivity_score: 100,
    };
  }

  if (includesAny(normalized, collaborationApps)) {
    return {
      activity_category: "collaboration",
      productivity_score: 75,
    };
  }

  if (includesAny(normalized, unproductiveApps)) {
    return {
      activity_category: "unproductive",
      productivity_score: 15,
    };
  }

  return {
    activity_category: "neutral",
    productivity_score: 50,
  };
};

const calculateProductivityScore = ({
  weightedSeconds = 0,
  measuredSeconds = 0,
}) => {
  const measured = Number(measuredSeconds || 0);

  if (measured <= 0) return 0;

  return Math.round((Number(weightedSeconds || 0) / measured) * 100);
};

const ensureLevel1Schema = async () => {
  await pool.query(`
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
  `);
};

module.exports = {
  calculateProductivityScore,
  classifyActivity,
  ensureLevel1Schema,
};
