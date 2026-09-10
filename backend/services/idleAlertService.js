const pool = require("../db");
const { sendAutomaticIdleAlertEmail } = require("../middleware/emailService");
const {
  HEARTBEAT_STALE_AFTER_SECONDS,
  IDLE_ALERT_RECIPIENT,
  IDLE_ALERT_THRESHOLD_MS,
} = require("./idleAlertConfig");
const { evaluateWorkingTime } = require("./idleAlertPolicy");

function isIdle(status) {
  return String(status || "").toLowerCase() === "idle";
}

function isHeartbeatFresh(lastActive, now) {
  return lastActive instanceof Date && now - lastActive < HEARTBEAT_STALE_AFTER_SECONDS * 1000;
}

function hasReachedIdleAlertThreshold(eligibleStartedAt, now) {
  return now - new Date(eligibleStartedAt) >= IDLE_ALERT_THRESHOLD_MS;
}

function isEpisodeReadyForClaim(episode, now) {
  if (episode.alert_attempted_at) return false;
  const effectiveEnd = episode.ended_at ? new Date(episode.ended_at) : now;
  if (episode.ended_at && !episode.claimable_after_close) return false;
  return hasReachedIdleAlertThreshold(episode.eligible_started_at, effectiveEnd);
}

async function getDatabaseNow(client) {
  const result = await client.query("SELECT clock_timestamp() AS now");
  return result.rows[0].now;
}

async function getUserPolicy(client, userId, lockUser = false) {
  const result = await client.query(
    `SELECT u.id, u.name, u.status, u.last_active, u.organization_id, t.name AS team_name,
            o.name AS organization_name, o.timezone, o.working_days, o.working_start, o.working_end,
            COALESCE((SELECT array_agg(h.holiday_date::text) FROM holidays h WHERE h.organization_id = o.id), ARRAY[]::text[]) AS holidays
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     LEFT JOIN teams t ON t.id = u.team_id
     WHERE u.id = $1
     ${lockUser ? "FOR UPDATE OF u" : ""}`,
    [userId]
  );
  return result.rows[0] || null;
}

function policyForUser(user) {
  if (!user?.organization_id) return null;
  return {
    timezone: user.timezone,
    working_days: user.working_days,
    working_start: user.working_start,
    working_end: user.working_end,
    holidays: user.holidays,
  };
}

async function closeActiveEpisode(client, userId, reason, now = null) {
  const endedAt = now || await getDatabaseNow(client);
  const result = await client.query(
    `UPDATE idle_alert_episodes
     SET ended_at = $2,
         end_reason = $3,
         claimable_after_close = eligible_started_at + ($4 * INTERVAL '1 millisecond') <= $2,
         updated_at = $2
     WHERE user_id = $1 AND ended_at IS NULL
     RETURNING id`,
    [userId, endedAt, reason, IDLE_ALERT_THRESHOLD_MS]
  );
  return result.rows[0] || null;
}

async function syncIdleEpisode(client, userId, closeReason = "not_eligible") {
  const now = await getDatabaseNow(client);
  const user = await getUserPolicy(client, userId, true);
  if (!user) return { action: "missing_user" };

  const policyResult = evaluateWorkingTime(policyForUser(user), now);
  const fresh = isHeartbeatFresh(user.last_active, now);
  if (!isIdle(user.status) || !fresh || !policyResult.eligible) {
    const reason = !isIdle(user.status)
      ? closeReason
      : !fresh
        ? "stale_heartbeat"
        : policyResult.reason;
    await closeActiveEpisode(client, userId, reason, now);
    return { action: "closed", reason };
  }

  const existing = await client.query(
    `SELECT id FROM idle_alert_episodes
     WHERE user_id = $1 AND ended_at IS NULL
     FOR UPDATE`,
    [userId]
  );
  if (existing.rows.length > 0) return { action: "existing", episodeId: existing.rows[0].id };

  const episode = await client.query(
    `INSERT INTO idle_alert_episodes
       (user_id, organization_id, idle_started_at, eligible_started_at)
     VALUES ($1, $2, $3, $3)
     ON CONFLICT (user_id) WHERE ended_at IS NULL DO NOTHING
     RETURNING id`,
    [user.id, user.organization_id, now]
  );
  return episode.rows[0]
    ? { action: "created", episodeId: episode.rows[0].id }
    : { action: "existing" };
}

async function syncIdleEpisodeForUser(userId, closeReason) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await syncIdleEpisode(client, userId, closeReason);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordStatusTransition(userId, status) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE users SET status = $1, last_active = clock_timestamp()
       WHERE id = $2 RETURNING *`,
      [status, userId]
    );
    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    await syncIdleEpisode(client, userId, status === "Online" ? "online" : "offline");
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordHeartbeat(agentToken) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE users SET last_active = clock_timestamp()
       WHERE agent_token = $1 RETURNING id, status, last_active`,
      [agentToken]
    );
    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    await syncIdleEpisode(client, updated.rows[0].id, "status_changed");
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function claimDelivery(episodeId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const now = await getDatabaseNow(client);
    const episodeResult = await client.query(
      `SELECT e.*, u.name AS user_name, u.status AS user_status, u.last_active,
              u.organization_id AS current_organization_id, t.name AS team_name,
              o.name AS organization_name, o.timezone, o.working_days, o.working_start, o.working_end,
              COALESCE((SELECT array_agg(h.holiday_date::text) FROM holidays h WHERE h.organization_id = o.id), ARRAY[]::text[]) AS holidays
       FROM idle_alert_episodes e
       JOIN users u ON u.id = e.user_id
       JOIN organizations o ON o.id = e.organization_id
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE e.id = $1
       FOR UPDATE OF e, u SKIP LOCKED`,
      [episodeId]
    );
    const episode = episodeResult.rows[0];
    if (!episode || episode.alert_attempted_at) {
      await client.query("COMMIT");
      return null;
    }

    if (episode.ended_at) {
      if (!isEpisodeReadyForClaim(episode, now)) {
        await client.query("COMMIT");
        return null;
      }
    } else if (episode.organization_id !== episode.current_organization_id) {
      await client.query(
        `UPDATE idle_alert_episodes
         SET ended_at = $2,
             end_reason = 'organization_changed',
             claimable_after_close = eligible_started_at + ($3 * INTERVAL '1 millisecond') <= $2,
             updated_at = $2
         WHERE id = $1`,
        [episode.id, now, IDLE_ALERT_THRESHOLD_MS]
      );
      await client.query("COMMIT");
      return null;
    }

    const eligibility = episode.ended_at
      ? { workingStart: episode.working_start, workingEnd: episode.working_end }
      : evaluateWorkingTime(policyForUser(episode), now);
    if (!episode.ended_at && (!isIdle(episode.user_status) || !isHeartbeatFresh(episode.last_active, now) || !eligibility.eligible)) {
      const reason = !isIdle(episode.user_status)
        ? "status_changed"
        : !isHeartbeatFresh(episode.last_active, now)
          ? "stale_heartbeat"
          : eligibility.reason;
      await client.query(
        `UPDATE idle_alert_episodes
         SET ended_at = $2,
             end_reason = $3,
             claimable_after_close = eligible_started_at + ($4 * INTERVAL '1 millisecond') <= $2,
             updated_at = $2
         WHERE id = $1`,
        [episode.id, now, reason, IDLE_ALERT_THRESHOLD_MS]
      );
      await client.query("COMMIT");
      return null;
    }

    const effectiveEnd = episode.ended_at ? new Date(episode.ended_at) : now;
    const durationMs = effectiveEnd - new Date(episode.eligible_started_at);
    if (!isEpisodeReadyForClaim(episode, now)) {
      await client.query("COMMIT");
      return null;
    }

    const delivery = await client.query(
      `INSERT INTO idle_alert_deliveries (episode_id, recipient, claimed_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (episode_id) DO NOTHING
       RETURNING id`,
      [episode.id, IDLE_ALERT_RECIPIENT, now]
    );
    if (delivery.rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }
    await client.query(
      `UPDATE idle_alert_episodes SET alert_attempted_at = $2, updated_at = $2 WHERE id = $1`,
      [episode.id, now]
    );
    await client.query("COMMIT");
    return { episode, deliveryId: delivery.rows[0].id, now, durationMinutes: Math.floor(durationMs / 60000), eligibility };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordDeliveryOutcome(claim, error) {
  const client = await pool.connect();
  try {
    const now = await getDatabaseNow(client);
    if (error) {
      await client.query(
        `UPDATE idle_alert_deliveries SET failed_at = $2, mail_error = $3 WHERE id = $1`,
        [claim.deliveryId, now, String(error.message || error).slice(0, 4000)]
      );
      await client.query(
        `UPDATE idle_alert_episodes SET mail_error = $2, updated_at = $3 WHERE id = $1`,
        [claim.episode.id, String(error.message || error).slice(0, 4000), now]
      );
    } else {
      await client.query(`UPDATE idle_alert_deliveries SET sent_at = $2 WHERE id = $1`, [claim.deliveryId, now]);
      await client.query(`UPDATE idle_alert_episodes SET alert_sent_at = $2, updated_at = $2 WHERE id = $1`, [claim.episode.id, now]);
    }
  } finally {
    client.release();
  }
}

async function evaluateIdleAlerts() {
  const candidates = await pool.query(
    `SELECT id FROM idle_alert_episodes
     WHERE alert_attempted_at IS NULL
       AND (
         ended_at IS NULL
         OR (
           claimable_after_close = true
           AND eligible_started_at + ($1 * INTERVAL '1 millisecond') <= ended_at
         )
       )
     ORDER BY id ASC
     LIMIT 500`,
    [IDLE_ALERT_THRESHOLD_MS]
  );
  for (const candidate of candidates.rows) {
    let claim;
    try {
      claim = await claimDelivery(candidate.id);
      if (!claim) continue;
      await sendAutomaticIdleAlertEmail({
        recipient: IDLE_ALERT_RECIPIENT,
        userName: claim.episode.user_name,
        teamName: claim.episode.team_name || "No Team",
        durationMinutes: claim.durationMinutes,
        idleStartedAt: claim.episode.idle_started_at,
        organizationName: claim.episode.organization_name,
        timezone: claim.episode.timezone,
        workingStart: claim.eligibility.workingStart,
        workingEnd: claim.eligibility.workingEnd,
        episodeId: claim.episode.id,
      });
      await recordDeliveryOutcome(claim, null);
      console.log(`Idle alert sent for episode ${claim.episode.id}`);
    } catch (error) {
      console.error(`Idle alert delivery failed${claim ? ` for episode ${claim.episode.id}` : ""}:`, error.message);
      if (claim) await recordDeliveryOutcome(claim, error);
    }
  }
}

module.exports = {
  closeActiveEpisode,
  evaluateIdleAlerts,
  hasReachedIdleAlertThreshold,
  isEpisodeReadyForClaim,
  recordHeartbeat,
  recordStatusTransition,
  syncIdleEpisode,
  syncIdleEpisodeForUser,
};
