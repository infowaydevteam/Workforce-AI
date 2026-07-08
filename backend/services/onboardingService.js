const pool = require("../db");

const ensureOnboardingSchema = async () => {
  await pool.query(`
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
  `);
};

module.exports = {
  ensureOnboardingSchema,
};
