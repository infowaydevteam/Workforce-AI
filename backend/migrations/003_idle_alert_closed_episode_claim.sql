BEGIN;

ALTER TABLE idle_alert_episodes
  ADD COLUMN IF NOT EXISTS claimable_after_close BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idle_alert_episodes_closed_claim_lookup
  ON idle_alert_episodes (id)
  WHERE ended_at IS NOT NULL
    AND claimable_after_close = true
    AND alert_attempted_at IS NULL;

COMMIT;
