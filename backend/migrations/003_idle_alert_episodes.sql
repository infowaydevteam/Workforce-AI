BEGIN;

CREATE TABLE IF NOT EXISTS idle_alert_episodes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  idle_started_at TIMESTAMPTZ NOT NULL,
  eligible_started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason VARCHAR(64),
  alert_attempted_at TIMESTAMPTZ,
  alert_sent_at TIMESTAMPTZ,
  mail_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (eligible_started_at >= idle_started_at),
  CHECK (ended_at IS NULL OR end_reason IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idle_alert_episodes_one_open_per_user
  ON idle_alert_episodes (user_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idle_alert_episodes_open_lookup
  ON idle_alert_episodes (id)
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS idle_alert_deliveries (
  id BIGSERIAL PRIMARY KEY,
  episode_id BIGINT NOT NULL UNIQUE REFERENCES idle_alert_episodes(id) ON DELETE CASCADE,
  recipient VARCHAR(320) NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  mail_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (NOT (sent_at IS NOT NULL AND failed_at IS NOT NULL))
);

COMMIT;
