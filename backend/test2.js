/**
 * IWF Idle-Alert Feature — READ-ONLY pre-implementation diagnostic
 *
 * Purpose:
 *   Before creating idle_alert_tracking or wiring the idle alert checker,
 *   inspect exactly what data currently exists for a real running agent:
 *     - who the token belongs to
 *     - their live status / last_active (heartbeat)
 *     - their organization's timezone + working_start/end + working_days
 *     - whether "right now" would be considered inside working hours
 *     - recent idle_logs / sessions, for context
 *     - a DRY-RUN simulation of the new idle alert logic against this
 *       user's current real data (no table required, no writes)
 *
 * Run from the backend folder:
 *   node test-idle-alert.js
 *
 * Optional env vars:
 *   AGENT_TOKEN=aeacaf96-001b-4985-8986-9e3a2e34d8f0   (defaults to this)
 *   DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD (falls back to .env)
 *
 * Guarantees:
 *   - SELECT only. No INSERT / UPDATE / DELETE / ALTER / CREATE.
 *   - Does not send any email.
 *   - Safe to run against your live local DB at any time.
 */

try {
  require("dotenv").config();
} catch {
  // dotenv optional
}

const { Client } = require("pg");

const AGENT_TOKEN =
  process.env.AGENT_TOKEN || "aeacaf96-001b-4985-8986-9e3a2e34d8f0";

const IDLE_THRESHOLD_SECONDS = 60 * 60; // 1 hour, matches the proposed feature

function section(title) {
  console.log(`\n${"=".repeat(78)}\n${title}\n${"=".repeat(78)}`);
}

function fmtDate(value) {
  if (!value) return "null";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function sec(seconds) {
  const x = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = x % 60;
  if (h) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

async function main() {
  section("IWF IDLE-ALERT FEATURE — PRE-IMPLEMENTATION DIAGNOSTIC");
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Using AGENT_TOKEN: ${AGENT_TOKEN}`);
  console.log("Database writes: NONE. Emails sent: NONE.");

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log("\n[OK] Connected to database.");
  } catch (err) {
    console.error("\n[FAIL] Could not connect to database:", err.message);
    process.exitCode = 1;
    return;
  }

  try {
    // -----------------------------------------------------------------
    // STEP 1: Resolve the user from the agent token
    // -----------------------------------------------------------------
    section("STEP 1: USER RESOLVED FROM AGENT_TOKEN");

    const userResult = await client.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.last_active,
        u.organization_id,
        u.team_id,
        o.name        AS organization_name,
        o.timezone,
        o.working_start,
        o.working_end,
        o.working_days
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.agent_token = $1
      LIMIT 1
      `,
      [AGENT_TOKEN]
    );

    if (userResult.rows.length === 0) {
      console.log(
        "\n[FAIL] No user found for this agent_token. Either the agent " +
          "hasn't registered yet, or the token is wrong/rotated."
      );
      return;
    }

    const user = userResult.rows[0];

    console.table([
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        last_active: fmtDate(user.last_active),
        organization_id: user.organization_id,
        organization: user.organization_name,
      },
    ]);

    console.log("\nOrganization working-hours policy for this user:");
    console.table([
      {
        timezone: user.timezone,
        working_start: user.working_start,
        working_end: user.working_end,
        working_days: Array.isArray(user.working_days)
          ? user.working_days.join(", ")
          : user.working_days,
      },
    ]);

    if (!user.organization_id) {
      console.log(
        "\n[WARN] This user has no organization_id — the new feature " +
          "would fail-safe and NEVER alert for them (no working-hours " +
          "policy to evaluate against)."
      );
    }

    if (!user.timezone || !user.working_start || !user.working_end) {
      console.log(
        "\n[WARN] Organization is missing timezone/working_start/working_end. " +
          "The new feature fails safe here too — no policy means no alert."
      );
    }

    // -----------------------------------------------------------------
    // STEP 2: Live heartbeat / staleness check
    // -----------------------------------------------------------------
    section("STEP 2: LIVE HEARTBEAT / STATUS FRESHNESS");

    const heartbeat = await client.query(
      `
      SELECT
        status,
        last_active,
        ROUND(EXTRACT(EPOCH FROM (NOW() - last_active)))::int AS age_seconds
      FROM users
      WHERE id = $1
      `,
      [user.id]
    );

    const hb = heartbeat.rows[0];
    console.table([
      {
        status: hb.status,
        last_active: fmtDate(hb.last_active),
        age: hb.age_seconds != null ? sec(hb.age_seconds) : "n/a",
      },
    ]);

    if (hb.age_seconds == null) {
      console.log("[INFO] last_active is null — agent has never heartbeat-ed.");
    } else if (hb.age_seconds > 30) {
      console.log(
        `[INFO] last_active is ${sec(hb.age_seconds)} old. Your existing ` +
          `offlineChecker.js marks users Offline after 30s of no heartbeat, ` +
          `so this user may flip to 'Offline' soon/already if the agent isn't running.`
      );
    } else {
      console.log("[OK] Heartbeat is fresh (agent appears to be actively running).");
    }

    // -----------------------------------------------------------------
    // STEP 3: Working-hours evaluation RIGHT NOW, computed two ways
    // -----------------------------------------------------------------
    section("STEP 3: IS 'RIGHT NOW' INSIDE WORKING HOURS? (org timezone)");

    if (user.organization_id) {
      const nowCheck = await client.query(
        `
        SELECT
          o.timezone,
          o.working_start,
          o.working_end,
          o.working_days,
          (NOW() AT TIME ZONE COALESCE(o.timezone, 'UTC'))::time AS org_local_time,
          EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(o.timezone, 'UTC'))) AS org_local_dow,
          CASE
            WHEN o.working_start IS NULL OR o.working_end IS NULL THEN FALSE
            WHEN o.working_start <= o.working_end THEN
              (NOW() AT TIME ZONE COALESCE(o.timezone, 'UTC'))::time
                BETWEEN o.working_start AND o.working_end
            ELSE
              (NOW() AT TIME ZONE COALESCE(o.timezone, 'UTC'))::time >= o.working_start
              OR
              (NOW() AT TIME ZONE COALESCE(o.timezone, 'UTC'))::time <= o.working_end
          END AS in_working_hours
        FROM organizations o
        WHERE o.id = $1
        `,
        [user.organization_id]
      );

      const row = nowCheck.rows[0];
      const DAY_NAMES = [
        "Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday",
      ];
      const todayName = DAY_NAMES[Number(row.org_local_dow)];
      const days = Array.isArray(row.working_days) ? row.working_days : [];
      const isWorkingDay = days.some(
        (d) => String(d).trim().toLowerCase() === String(todayName).toLowerCase()
      );

      console.table([
        {
          org_local_time_now: row.org_local_time,
          org_local_day_now: todayName,
          is_configured_working_day: isWorkingDay,
          in_working_hours_window: row.in_working_hours,
          would_be_eligible_to_alert: Boolean(row.in_working_hours) && isWorkingDay,
        },
      ]);
    } else {
      console.log("[SKIP] No organization to evaluate.");
    }

    // -----------------------------------------------------------------
    // STEP 4: Does idle_alert_tracking exist yet?
    // -----------------------------------------------------------------
    section("STEP 4: idle_alert_tracking TABLE STATUS");

    const tableExists = await client.query(
      `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'idle_alert_tracking'
      ) AS exists
      `
    );

    if (tableExists.rows[0].exists) {
      console.log("[INFO] idle_alert_tracking already exists. Showing this user's row (if any):");
      const tracking = await client.query(
        `SELECT * FROM idle_alert_tracking WHERE user_id = $1`,
        [user.id]
      );
      console.table(
        tracking.rows.map((r) => ({
          ...r,
          idle_since: fmtDate(r.idle_since),
          alerted_at: fmtDate(r.alerted_at),
        }))
      );
    } else {
      console.log(
        "[INFO] idle_alert_tracking does not exist yet (migration not applied). " +
          "This is expected before implementation — nothing to show."
      );
    }

    // -----------------------------------------------------------------
    // STEP 5: Recent idle_logs (historical idle episodes, for context)
    // -----------------------------------------------------------------
    section("STEP 5: RECENT idle_logs FOR THIS USER (last 24h)");

    const idleLogs = await client.query(
      `
      SELECT id, app_name, start_time, end_time, duration
      FROM idle_logs
      WHERE user_id = $1
        AND start_time >= NOW() - INTERVAL '24 hours'
      ORDER BY start_time DESC
      LIMIT 20
      `,
      [user.id]
    );

    if (idleLogs.rows.length === 0) {
      console.log("[INFO] No idle_logs rows in the last 24 hours for this user.");
    } else {
      console.table(
        idleLogs.rows.map((r) => ({
          id: r.id,
          app: r.app_name,
          start: fmtDate(r.start_time),
          end: fmtDate(r.end_time),
          duration_s: r.duration,
        }))
      );
    }

    // -----------------------------------------------------------------
    // STEP 6: DRY-RUN — simulate the new feature's decision right now
    // -----------------------------------------------------------------
    section("STEP 6: DRY-RUN SIMULATION (no writes, no email)");

    const isIdleNow = String(user.status || "").toLowerCase() === "idle";
    console.log(`Current status: ${user.status}`);

    if (!isIdleNow) {
      console.log(
        "[SIMULATION] User is not currently 'Idle' -> no episode would be " +
          "tracked, no email would ever be considered right now."
      );
    } else {
      console.log(
        "[SIMULATION] User IS currently 'Idle'. The real feature tracks " +
          "idle_since from the moment status first became 'Idle' " +
          "(unknown here, since idle_alert_tracking doesn't exist yet). " +
          "Once implemented, this user would only get an email once " +
          "idle_since is 1+ hour old AND the working-hours check above " +
          "(STEP 3) says 'would_be_eligible_to_alert: true'."
      );
    }

    console.log(
      "\nSummary of gating conditions the real feature will apply:\n" +
        "  1) status must be 'Idle' (continuously, not Online/Offline)\n" +
        "  2) idle streak must be >= 1 hour (60 minutes) uninterrupted\n" +
        "  3) current org-local time must be within working_start/working_end\n" +
        "  4) current org-local day must be in working_days\n" +
        "  5) email sent only ONCE per idle streak (never repeats until\n" +
        "     the user goes Online/Offline and idles again)"
    );
  } catch (err) {
    console.error("\n[FAIL] Diagnostic error:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }

  console.log("\nDiagnostic complete. NO DATA WAS WRITTEN. NO EMAIL WAS SENT.");
}

main();