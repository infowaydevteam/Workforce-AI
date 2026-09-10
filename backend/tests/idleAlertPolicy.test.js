const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { evaluateWorkingTime } = require("../services/idleAlertPolicy");
const { IDLE_ALERT_THRESHOLD_MINUTES, IDLE_ALERT_THRESHOLD_MS } = require("../services/idleAlertConfig");
const { hasReachedIdleAlertThreshold, isEpisodeReadyForClaim } = require("../services/idleAlertService");

const normalPolicy = {
  timezone: "America/Los_Angeles",
  working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  working_start: "09:00:00",
  working_end: "18:00:00",
  holidays: [],
};

function eligible(iso, policy = normalPolicy) {
  return evaluateWorkingTime(policy, new Date(iso));
}

assert.strictEqual(IDLE_ALERT_THRESHOLD_MINUTES, 5, "test default threshold must be five minutes");
const thresholdStart = new Date("2026-01-05T17:00:00Z");
assert.strictEqual(hasReachedIdleAlertThreshold(thresholdStart, new Date(thresholdStart.getTime() + IDLE_ALERT_THRESHOLD_MS - 1000)), false, "4m59s must not qualify");
assert.strictEqual(hasReachedIdleAlertThreshold(thresholdStart, new Date(thresholdStart.getTime() + IDLE_ALERT_THRESHOLD_MS)), true, "5m must qualify");
const closedAfterThreshold = {
  eligible_started_at: thresholdStart,
  ended_at: new Date(thresholdStart.getTime() + IDLE_ALERT_THRESHOLD_MS),
  claimable_after_close: true,
  alert_attempted_at: null,
};
assert.strictEqual(
  isEpisodeReadyForClaim(closedAfterThreshold, new Date(thresholdStart.getTime() + IDLE_ALERT_THRESHOLD_MS + 60_000)),
  true,
  "Idle -> threshold -> Online before scheduler remains claimable once"
);
assert.strictEqual(
  isEpisodeReadyForClaim({ ...closedAfterThreshold, alert_attempted_at: new Date() }, new Date()),
  false,
  "claimed closed episode cannot be claimed again"
);
const activePastThreshold = {
  eligible_started_at: thresholdStart,
  ended_at: null,
  claimable_after_close: false,
  alert_attempted_at: null,
};
assert.strictEqual(isEpisodeReadyForClaim(activePastThreshold, new Date(thresholdStart.getTime() + IDLE_ALERT_THRESHOLD_MS + 60_000)), true, "active episode past threshold is claimable");
assert.strictEqual(isEpisodeReadyForClaim({ ...activePastThreshold, alert_attempted_at: new Date() }, new Date()), false, "active episode remains at most one claim");
assert.strictEqual(eligible("2026-01-05T17:00:00Z").eligible, true, "09:00 local is included");
assert.strictEqual(eligible("2026-01-06T02:00:00Z").eligible, false, "18:00 local is excluded");
assert.strictEqual(eligible("2026-01-03T18:00:00Z").reason, "non_working_day", "Saturday is excluded");
assert.strictEqual(eligible("2026-01-05T17:00:00Z", { ...normalPolicy, holidays: ["2026-01-05"] }).reason, "holiday");
assert.strictEqual(eligible("2026-01-05T17:00:00Z", { ...normalPolicy, timezone: "not/a-timezone" }).reason, "invalid_timezone");
assert.strictEqual(eligible("2026-01-05T17:00:00Z", { ...normalPolicy, working_days: [] }).reason, "invalid_policy");

const overnight = {
  timezone: "America/Los_Angeles",
  working_days: ["Thursday"],
  working_start: "20:00:00",
  working_end: "04:00:00",
  holidays: [],
};
assert.strictEqual(eligible("2026-01-09T05:00:00Z", overnight).eligible, true, "Thursday 21:00 belongs to Thursday shift");
const overnightAfterMidnight = eligible("2026-01-09T10:00:00Z", overnight);
assert.strictEqual(overnightAfterMidnight.eligible, true, "Friday 02:00 remains in Thursday shift");
assert.strictEqual(overnightAfterMidnight.shiftDate, "2026-01-08");
assert.strictEqual(eligible("2026-01-09T12:00:00Z", overnight).reason, "outside_working_hours", "04:00 is excluded");

const dstPolicy = { ...normalPolicy, working_days: ["Sunday"], working_start: "00:00:00", working_end: "23:00:00" };
assert.strictEqual(eligible("2026-03-08T09:30:00Z", dstPolicy).eligible, true, "DST pre-jump local time evaluates");
assert.strictEqual(eligible("2026-03-08T10:30:00Z", dstPolicy).eligible, true, "DST post-jump local time evaluates");

const migration = fs.readFileSync(path.join(__dirname, "..", "migrations", "002_idle_alert_episodes.sql"), "utf8");
assert.match(migration, /idle_alert_episodes_one_open_per_user/);
assert.match(migration, /UNIQUE REFERENCES idle_alert_episodes/);
assert.doesNotMatch(migration, /idle_logs/i, "feature migration must not consume historical idle logs");
const closedClaimMigration = fs.readFileSync(path.join(__dirname, "..", "migrations", "003_idle_alert_closed_episode_claim.sql"), "utf8");
assert.match(closedClaimMigration, /claimable_after_close/);

console.log("idle-alert policy and durable-schema checks passed");
