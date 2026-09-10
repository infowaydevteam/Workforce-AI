/**
 * IWF Agent / Backend READ-ONLY diagnostic
 *
 * Run from backend folder:
 *   node test.js
 *
 * Optional:
 *   $env:AGENT_TOKEN="<running agent token>"
 *   $env:API_BASE_URL="http://localhost:5000"
 *   $env:TEST_USER_ID="123"
 *   $env:AGENT_SOURCE_DIR="C:\\path\\to\\IWF-Agent"
 *   $env:LAUNCHER_SOURCE_DIR="C:\\path\\to\\IWF-Agent-Launcher - Copy"
 *
 * IMPORTANT:
 *   - NO INSERT
 *   - NO UPDATE
 *   - NO DELETE
 *   - NO ALTER
 *   - NO API POST/PUT/PATCH/DELETE
 *   - Only HTTP GET/HEAD, PostgreSQL SELECT, and local source-file reading
 */

try {
  require("dotenv").config();
} catch {
  // dotenv is optional
}

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const API_BASE_URL = (
  process.env.API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const TOKEN =
  process.env.AGENT_TOKEN ||
  process.env.AGENT_TOKEN_TEST ||
  "";

const USER_ID = process.env.TEST_USER_ID
  ? Number(process.env.TEST_USER_ID)
  : null;

const LOOKBACK_MINUTES = Math.max(
  5,
  Number(process.env.TEST_LOOKBACK_MINUTES || 60)
);

// -----------------------------------------------------------------------------
// Possible locations for the source code
// -----------------------------------------------------------------------------

const DEFAULT_AGENT_DIRS = [
  process.env.AGENT_SOURCE_DIR,

  path.resolve(__dirname, "../../agent/IWF-Agent"),
  path.resolve(__dirname, "../../IWF-Agent"),
  path.resolve(process.cwd(), "../IWF-Agent"),

  // useful when test.js is directly beside source folder
  path.resolve(__dirname, "IWF-Agent"),
];

const DEFAULT_LAUNCHER_DIRS = [
  process.env.LAUNCHER_SOURCE_DIR,

  path.resolve(
    __dirname,
    "../../launcher/IWF-Agent-Launcher - Copy"
  ),

  path.resolve(
    __dirname,
    "../../IWF-Agent-Launcher - Copy"
  ),

  path.resolve(
    process.cwd(),
    "../IWF-Agent-Launcher - Copy"
  ),

  path.resolve(
    __dirname,
    "IWF-Agent-Launcher - Copy"
  ),
].filter(Boolean);

let failures = 0;
let warnings = 0;
let checks = 0;

// -----------------------------------------------------------------------------
// Output helpers
// -----------------------------------------------------------------------------

function section(title) {
  console.log(
    `\n${"=".repeat(78)}\n${title}\n${"=".repeat(78)}`
  );
}

function check(label, ok, detail = "") {
  checks++;

  const mark = ok ? "PASS" : "FAIL";

  if (!ok) {
    failures++;
  }

  console.log(
    `[${mark}] ${label}${detail ? ` — ${detail}` : ""}`
  );
}

function warn(label, detail = "") {
  warnings++;

  console.log(
    `[WARN] ${label}${detail ? ` — ${detail}` : ""}`
  );
}

function info(label, detail = "") {
  console.log(
    `[INFO] ${label}${detail ? ` — ${detail}` : ""}`
  );
}

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

function fmtDate(value) {
  if (!value) {
    return "null";
  }

  const d = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toISOString();
}

function sec(seconds) {
  const x = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = x % 60;

  if (h) {
    return `${h}h ${m}m ${s}s`;
  }

  return `${m}m ${s}s`;
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function findFirstExisting(candidates) {
  return candidates.find(
    (p) => p && fs.existsSync(p)
  );
}

// -----------------------------------------------------------------------------
// Recursive source discovery
// -----------------------------------------------------------------------------

function walk(dir, out = []) {
  if (!dir || !fs.existsSync(dir)) {
    return out;
  }

  let entries = [];

  try {
    entries = fs.readdirSync(dir, {
      withFileTypes: true,
    });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (
      [
        "bin",
        "obj",
        "node_modules",
        ".git",
      ].includes(entry.name)
    ) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }

  return out;
}

// -----------------------------------------------------------------------------
// Static agent audit
// -----------------------------------------------------------------------------

function staticAgentAudit(root, label) {
  section(`${label} SOURCE AUDIT: ${root}`);

  const files = walk(root);

  check(
    `${label} directory exists`,
    files.length > 0,
    `${files.length} source files found`
  );

  if (!files.length) {
    return {
      root,
      files: [],
    };
  }

  const cs = files.filter(
    (f) => f.toLowerCase().endsWith(".cs")
  );

  const activity = findFirstExisting([
    path.join(root, "Services", "ActivityService.cs"),

    ...cs.filter(
      (f) => /ActivityService\.cs$/i.test(f)
    ),
  ]);

  const idle = findFirstExisting([
    path.join(root, "Helpers", "IdleHelper.cs"),

    ...cs.filter(
      (f) => /IdleHelper\.cs$/i.test(f)
    ),
  ]);

  const api = findFirstExisting([
    path.join(root, "Services", "ApiService.cs"),

    ...cs.filter(
      (f) => /ApiService\.cs$/i.test(f)
    ),
  ]);

  const activityText = activity
    ? readText(activity)
    : null;

  const idleText = idle
    ? readText(idle)
    : null;

  const apiText = api
    ? readText(api)
    : null;

  // ---------------------------------------------------------------------------
  // ActivityService
  // ---------------------------------------------------------------------------

  if (activity && activityText) {
    const thresholdPatterns = [
      /IdleThresholdSeconds/g,

      /idleSeconds\s*>=/g,

      /idleStartTime\s*=\s*now\s*;/g,

      /idleStartTime\s*=\s*now\.AddSeconds\(\-idleSeconds\)/g,

      /SendIdle\s*\(/g,

      /UpdateStatus\(\s*["']Idle["']/g,
    ];

    const names = [
      "IdleThresholdSeconds references",

      "idleSeconds threshold comparisons",

      "BUG PATTERN: idleStartTime = now",

      "FIX PATTERN: idleStartTime = now.AddSeconds(-idleSeconds)",

      "SendIdle calls",

      "Idle status updates",
    ];

    thresholdPatterns.forEach((regex, index) => {
      const count =
        activityText.match(regex)?.length || 0;

      info(
        names[index],
        String(count)
      );
    });

    const detectionTimeBug =
      /idleStartTime\s*=\s*now\s*;/.test(
        activityText
      );

    const correctedTimestamp =
      /idleStartTime\s*=\s*now\.AddSeconds\(\-idleSeconds\)/
        .test(activityText);

    if (detectionTimeBug && !correctedTimestamp) {
      warn(
        "Idle start timestamp is set to detection time",
        "this discards the pre-threshold idle interval"
      );
    }

    if (correctedTimestamp) {
      info(
        "Idle start timestamp",
        "agent appears to account for actual Windows idle duration"
      );
    }

    // Timer search
    const timerMatch = activityText.match(
      /new\s+System\.Timers\.Timer\s*\(\s*([0-9]+)\s*\)/
    );

    if (timerMatch) {
      info(
        "Agent polling timer",
        `${timerMatch[1]} ms`
      );
    }

    // Default threshold search
    const defaultThresholdMatch =
      activityText.match(
        /IdleThresholdSeconds\s*=\s*([0-9]+)/
      );

    if (defaultThresholdMatch) {
      info(
        "Fallback idle threshold in ActivityService",
        `${defaultThresholdMatch[1]} seconds`
      );
    }

    if (/GetIdleTime\s*\(/.test(activityText)) {
      info(
        "ActivityService",
        "calls IdleHelper/GetIdleTime-style idle calculation"
      );
    }
  } else {
    warn(
      `${label} ActivityService.cs not found`,
      "cannot statically inspect idle state handling"
    );
  }

  // ---------------------------------------------------------------------------
  // IdleHelper
  // ---------------------------------------------------------------------------

  if (idleText) {
    const native =
      /GetLastInputInfo/.test(idleText);

    check(
      `${label} IdleHelper uses Windows GetLastInputInfo`,
      native
    );

    if (/Environment\.TickCount/.test(idleText)) {
      info(
        `${label} IdleHelper`,
        "uses Environment.TickCount for elapsed idle duration"
      );
    }

    if (/GetLastInputInfo/.test(idleText)) {
      info(
        `${label} IdleHelper`,
        "reads Windows last-input timestamp"
      );
    }
  } else {
    warn(
      `${label} IdleHelper.cs not found`
    );
  }

  // ---------------------------------------------------------------------------
  // ApiService
  // ---------------------------------------------------------------------------

  if (apiText) {
    const sendsToIdleLog =
      /api\/idle\/log/.test(apiText);

    check(
      `${label} references /api/idle/log`,
      sendsToIdleLog
    );

    const sendIdle =
      /SendIdle\s*\(/.test(apiText);

    info(
      `${label} ApiService has SendIdle()`,
      String(sendIdle)
    );
  } else {
    warn(
      `${label} ApiService.cs not found`
    );
  }

  return {
    root,
    files,
    activity,
    idle,
    api,
  };
}

// -----------------------------------------------------------------------------
// Show relevant source lines
// -----------------------------------------------------------------------------

function showRelevantSnippet(file, patterns, radius = 4) {
  if (!file) {
    return false;
  }

  const text = readText(file);

  if (!text) {
    return false;
  }

  const lines = text.split(/\r?\n/);

  let shown = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (
      patterns.some(
        (pattern) => pattern.test(line)
      )
    ) {
      shown = true;

      const from = Math.max(
        0,
        index - radius
      );

      const to = Math.min(
        lines.length,
        index + radius + 1
      );

      console.log(
        `\n--- ${path.basename(
          file
        )}:${from + 1}-${to} ---`
      );

      for (
        let i = from;
        i < to;
        i++
      ) {
        console.log(
          `${String(i + 1).padStart(4)} | ${lines[i]}`
        );
      }
    }
  }

  return shown;
}

// -----------------------------------------------------------------------------
// HTTP helper
// -----------------------------------------------------------------------------

function request(method, url) {
  return new Promise((resolve) => {
    let parsed;

    try {
      parsed = new URL(url);
    } catch (err) {
      resolve({
        ok: false,
        error: `Invalid URL: ${err.message}`,
      });
      return;
    }

    const lib =
      parsed.protocol === "https:"
        ? https
        : http;

    const req = lib.request(
      {
        method,

        hostname: parsed.hostname,

        port:
          parsed.port ||
          undefined,

        path:
          `${parsed.pathname}${parsed.search}`,

        timeout: 5000,

        headers: {
          "User-Agent":
            "iwf-read-only-diagnostic",
        },
      },

      (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;

          if (body.length > 20000) {
            body = body.slice(
              0,
              20000
            );
          }
        });

        res.on("end", () => {
          resolve({
            ok: true,
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(
        new Error("timeout")
      );
    });

    req.on("error", (err) => {
      resolve({
        ok: false,
        error: err.message,
      });
    });

    req.end();
  });
}

// -----------------------------------------------------------------------------
// Running backend HTTP audit
// -----------------------------------------------------------------------------

async function backendHttpAudit() {
  section(
    `RUNNING BACKEND HTTP AUDIT: ${API_BASE_URL}`
  );

  const root = await request(
    "GET",
    `${API_BASE_URL}/`
  );

  check(
    "Backend is reachable",
    root.ok,
    root.ok
      ? `HTTP ${root.status}`
      : root.error
  );

  if (
    root.ok &&
    root.status === 404
  ) {
    info(
      "Backend root",
      "HTTP 404 is okay if GET / is not defined"
    );
  }

  const endpoints = [
    "/api/dashboard",
    "/api/idle",
    "/api/heartbeat",
  ];

  for (const endpoint of endpoints) {
    const result = await request(
      "GET",
      `${API_BASE_URL}${endpoint}`
    );

    info(
      `GET ${endpoint}`,
      result.ok
        ? `HTTP ${result.status}`
        : result.error
    );
  }
}

// -----------------------------------------------------------------------------
// Database audit
// -----------------------------------------------------------------------------

async function dbAudit() {
  section(
    "RUNNING DATABASE AUDIT (SELECT ONLY)"
  );

  const config = {
    connectionString:
      process.env.DATABASE_URL,

    host:
      process.env.DB_HOST,

    port:
      Number(
        process.env.DB_PORT || 5432
      ),

    database:
      process.env.DB_NAME ||
      process.env.POSTGRES_DB,

    user:
      process.env.DB_USER ||
      process.env.POSTGRES_USER,

    password:
      process.env.DB_PASSWORD ||
      process.env.POSTGRES_PASSWORD,
  };

  let Client;

  try {
    ({ Client } = require("pg"));
  } catch {
    check(
      "PostgreSQL driver is installed",
      false,
      "run npm install in the backend"
    );

    return;
  }

  const client =
    new Client(config);

  try {
    await client.connect();

    check(
      "Database connection",
      true
    );

    // -------------------------------------------------------------------------
    // Tables
    // -------------------------------------------------------------------------

    const tables = [
      "users",
      "organizations",
      "monitoring_policies",
      "sessions",
      "idle_logs",
      "activity_logs",
      "alerts",
    ];

    for (const table of tables) {
      const result =
        await client.query(
          `
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1
          ) AS exists
          `,
          [table]
        );

      check(
        `Table ${table} exists`,
        result.rows[0].exists
      );
    }

    // -------------------------------------------------------------------------
    // Resolve user
    // -------------------------------------------------------------------------

    let user = null;

    if (TOKEN) {
      const result =
        await client.query(
          `
          SELECT
            u.id,
            u.name,
            u.email,
            u.status,
            u.last_active,
            u.team_id,
            u.organization_id,
            o.name AS organization_name,
            o.timezone,
            o.working_start,
            o.working_end,
            o.working_days,
            u.agent_token
          FROM users u
          LEFT JOIN organizations o
            ON o.id = u.organization_id
          WHERE u.agent_token = $1
          LIMIT 1
          `,
          [TOKEN]
        );

      check(
        "AGENT_TOKEN resolves to a user",
        result.rows.length === 1
      );

      if (result.rows[0]) {
        user = result.rows[0];
      }
    } else if (
      USER_ID != null &&
      Number.isInteger(USER_ID)
    ) {
      const result =
        await client.query(
          `
          SELECT
            u.id,
            u.name,
            u.email,
            u.status,
            u.last_active,
            u.team_id,
            u.organization_id,
            o.name AS organization_name,
            o.timezone,
            o.working_start,
            o.working_end,
            o.working_days,
            u.agent_token
          FROM users u
          LEFT JOIN organizations o
            ON o.id = u.organization_id
          WHERE u.id = $1
          LIMIT 1
          `,
          [USER_ID]
        );

      check(
        "TEST_USER_ID resolves to a user",
        result.rows.length === 1
      );

      if (result.rows[0]) {
        user = result.rows[0];
      }
    } else {
      warn(
        "No AGENT_TOKEN or TEST_USER_ID",
        "set one to inspect the exact running user"
      );
    }

    if (!user) {
      return;
    }

    // -------------------------------------------------------------------------
    // User info
    // -------------------------------------------------------------------------

    console.log("\nSelected user:");

    console.table([
      {
        id: user.id,

        name: user.name,

        status: user.status,

        last_active:
          fmtDate(
            user.last_active
          ),

        team_id: user.team_id,

        organization_id:
          user.organization_id,

        organization:
          user.organization_name,

        timezone:
          user.timezone,

        working_start:
          user.working_start,

        working_end:
          user.working_end,
      },
    ]);

    // -------------------------------------------------------------------------
    // Monitoring policy
    // -------------------------------------------------------------------------

    const policy =
      await client.query(
        `
        SELECT
          id,
          organization_id,
          idle_threshold_seconds,
          screenshot_interval_seconds,
          app_tracking_enabled,
          url_tracking_enabled,
          keyboard_activity_tracking_enabled,
          mouse_activity_tracking_enabled
        FROM monitoring_policies
        WHERE organization_id = $1
        ORDER BY id DESC
        LIMIT 5
        `,
        [user.organization_id]
      );

    check(
      "Monitoring policy found",
      policy.rows.length > 0
    );

    let configuredThreshold = 300;

    if (policy.rows[0]) {
      configuredThreshold = Number(
        policy.rows[0]
          .idle_threshold_seconds
      );

      console.log(
        "\nMonitoring policies:"
      );

      console.table(
        policy.rows
      );

      check(
        "Idle threshold is positive",
        configuredThreshold > 0,
        `${configuredThreshold}s`
      );

      info(
        "Configured idle threshold",
        sec(configuredThreshold)
      );
    }

    // -------------------------------------------------------------------------
    // Recent sessions
    // -------------------------------------------------------------------------

    const sessions =
      await client.query(
        `
        SELECT
          id,
          login_time,
          logout_time,
          total_duration,
          ROUND(
            EXTRACT(
              EPOCH FROM
              (
                COALESCE(logout_time, NOW())
                - login_time
              )
            )
          )::int AS computed_duration
        FROM sessions
        WHERE user_id = $1
          AND login_time >= NOW()
            - ($2::text || ' minutes')::interval
        ORDER BY login_time DESC
        LIMIT 20
        `,
        [
          user.id,
          LOOKBACK_MINUTES,
        ]
      );

    console.log(
      "\nRecent sessions:"
    );

    console.table(
      sessions.rows.map(
        (row) => ({
          id: row.id,

          login:
            fmtDate(
              row.login_time
            ),

          logout:
            fmtDate(
              row.logout_time
            ),

          stored_s:
            row.total_duration,

          computed_s:
            row.computed_duration,
        })
      )
    );

    // -------------------------------------------------------------------------
    // Recent idle logs
    // -------------------------------------------------------------------------

    const idle =
      await client.query(
        `
        SELECT
          id,
          app_name,
          start_time,
          end_time,
          duration,

          ROUND(
            EXTRACT(
              EPOCH FROM
              (NOW() - start_time)
            )
          )::int AS age_s,

          ROUND(
            EXTRACT(
              EPOCH FROM
              (end_time - start_time)
            )
          )::int AS recomputed_s

        FROM idle_logs

        WHERE user_id = $1

          AND (
            start_time >= NOW()
              - ($2::text || ' minutes')::interval

            OR end_time >= NOW()
              - ($2::text || ' minutes')::interval

            OR end_time IS NULL
          )

        ORDER BY start_time DESC

        LIMIT 50
        `,
        [
          user.id,
          LOOKBACK_MINUTES,
        ]
      );

    console.log(
      "\nRecent idle logs:"
    );

    console.table(
      idle.rows.map(
        (row) => ({
          id: row.id,

          app: row.app_name,

          start:
            fmtDate(
              row.start_time
            ),

          end:
            fmtDate(
              row.end_time
            ),

          stored_s:
            row.duration,

          recomputed_s:
            row.recomputed_s,

          state:
            row.end_time
              ? "closed"
              : "OPEN",
        })
      )
    );

    // -------------------------------------------------------------------------
    // Activity logs
    // -------------------------------------------------------------------------

    const activities =
      await client.query(
        `
        SELECT
          id,
          app_name,
          start_time,
          end_time,
          duration,
          productivity_category
        FROM activity_logs
        WHERE user_id = $1
          AND (
            start_time >= NOW()
              - ($2::text || ' minutes')::interval

            OR end_time >= NOW()
              - ($2::text || ' minutes')::interval
          )
        ORDER BY start_time DESC
        LIMIT 80
        `,
        [
          user.id,
          LOOKBACK_MINUTES,
        ]
      );

    console.log(
      "\nRecent activity logs:"
    );

    console.table(
      activities.rows.map(
        (row) => ({
          id: row.id,

          app: row.app_name,

          start:
            fmtDate(
              row.start_time
            ),

          end:
            fmtDate(
              row.end_time
            ),

          duration_s:
            row.duration,

          category:
            row.productivity_category,
        })
      )
    );

    // -------------------------------------------------------------------------
    // Idle duration reconstruction
    // -------------------------------------------------------------------------

    console.log(
      "\nIdle-threshold reconstruction:"
    );

    const meaningfulIdle =
      idle.rows.filter(
        (row) =>
          row.start_time &&
          row.end_time &&
          Number(row.duration) >= 0
      );

    if (!meaningfulIdle.length) {
      info(
        "Idle reconstruction",
        "no closed idle logs found in lookback window"
      );
    }

    for (
      const row of meaningfulIdle.slice(0, 20)
    ) {
      const stored =
        Number(row.duration);

      /*
       * If the agent begins idleStartTime only
       * when the threshold is crossed, the true
       * physical inactivity may be approximately:
       *
       *     stored duration + threshold
       */

      const likelyFullIdle =
        stored +
        configuredThreshold;

      console.log(
        `  idle #${row.id}: ` +
        `stored=${sec(stored)} | ` +
        `threshold=${sec(configuredThreshold)} | ` +
        `possible full inactivity=${sec(likelyFullIdle)}`
      );

      if (
        configuredThreshold > 0 &&
        stored < configuredThreshold
      ) {
        warn(
          `Idle log #${row.id} is shorter than configured threshold`,
          "this is consistent with idleStartTime being set when detection occurs"
        );
      }
    }

    // -------------------------------------------------------------------------
    // Stored duration vs timestamp duration
    // -------------------------------------------------------------------------

    const mismatches =
      idle.rows.filter((row) => {
        if (!row.end_time) {
          return false;
        }

        const stored =
          Number(row.duration);

        const recomputed =
          Number(row.recomputed_s);

        return (
          Math.abs(
            stored -
            recomputed
          ) > 2
        );
      });

    check(
      "Stored idle duration matches timestamps",
      mismatches.length === 0,
      mismatches.length
        ? `${mismatches.length} mismatch(es)`
        : "yes"
    );

    // -------------------------------------------------------------------------
    // Heartbeat / status
    // -------------------------------------------------------------------------

    const heartbeat =
      await client.query(
        `
        SELECT
          id,
          status,
          last_active,

          ROUND(
            EXTRACT(
              EPOCH FROM
              (NOW() - last_active)
            )
          )::int AS last_active_age_s

        FROM users

        WHERE id = $1
        `,
        [user.id]
      );

    if (heartbeat.rows[0]) {
      const row =
        heartbeat.rows[0];

      console.log(
        "\nCurrent heartbeat/status:"
      );

      console.table([
        {
          id: row.id,

          status:
            row.status,

          last_active:
            fmtDate(
              row.last_active
            ),

          age:
            sec(
              row.last_active_age_s
            ),
        },
      ]);

      if (
        row.last_active_age_s != null &&
        row.last_active_age_s > 60
      ) {
        warn(
          "last_active is over 60 seconds old",
          "backend may consider agent stale/offline"
        );
      }
    }

    // -------------------------------------------------------------------------
    // Idle alert episodes
    // -------------------------------------------------------------------------

    const episodeExists =
      await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'idle_alert_episodes'
        ) AS exists
        `
      );

    if (
      episodeExists.rows[0].exists
    ) {
      const episodes =
        await client.query(
          `
          SELECT
            id,
            user_id,
            idle_started_at,
            working_window_started_at,
            ended_at,
            email_status,
            email_sent_at,
            created_at,
            updated_at
          FROM idle_alert_episodes
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
          `,
          [user.id]
        );

      console.log(
        "\nIdle alert episodes:"
      );

      console.table(
        episodes.rows.map(
          (row) => ({
            id: row.id,

            user_id:
              row.user_id,

            idle_started:
              fmtDate(
                row.idle_started_at
              ),

            window_started:
              fmtDate(
                row.working_window_started_at
              ),

            ended:
              fmtDate(
                row.ended_at
              ),

            email_status:
              row.email_status,

            email_sent:
              fmtDate(
                row.email_sent_at
              ),

            created:
              fmtDate(
                row.created_at
              ),

            updated:
              fmtDate(
                row.updated_at
              ),
          })
        )
      );
    }

    // -------------------------------------------------------------------------
    // Alerts table
    // -------------------------------------------------------------------------

    const alertsExists =
      await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'alerts'
        ) AS exists
        `
      );

    if (
      alertsExists.rows[0].exists
    ) {
      const alerts =
        await client.query(
          `
          SELECT
            id,
            alert_type,
            message,
            is_read,
            created_at
          FROM alerts
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 20
          `,
          [user.id]
        );

      console.log(
        "\nRecent alerts:"
      );

      console.table(
        alerts.rows.map(
          (row) => ({
            id: row.id,

            type:
              row.alert_type,

            is_read:
              row.is_read,

            created:
              fmtDate(
                row.created_at
              ),

            message:
              row.message,
          })
        )
      );
    }
  } catch (err) {
    check(
      "Database audit completed",
      false,
      err.message
    );
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore DB cleanup errors
    }
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  section(
    "IWF AGENT / BACKEND READ-ONLY DIAGNOSTIC"
  );

  console.log(
    `Started: ${new Date().toISOString()}`
  );

  console.log(
    `API: ${API_BASE_URL}`
  );

  console.log(
    `Lookback: ${LOOKBACK_MINUTES} minutes`
  );

  console.log(
    "Database/API writes: NONE"
  );

  // ---------------------------------------------------------------------------
  // Find source trees
  // ---------------------------------------------------------------------------

  const agentRoot =
    findFirstExisting(
      DEFAULT_AGENT_DIRS
    );

  const launcherRoot =
    findFirstExisting(
      DEFAULT_LAUNCHER_DIRS
    );

  // ---------------------------------------------------------------------------
  // Static audit
  // ---------------------------------------------------------------------------

  const agentAudit =
    agentRoot
      ? staticAgentAudit(
          agentRoot,
          "MAIN AGENT"
        )
      : null;

  const launcherAudit =
    launcherRoot
      ? staticAgentAudit(
          launcherRoot,
          "LAUNCHER / SECOND COPY"
        )
      : null;

  if (!agentRoot) {
    warn(
      "Main agent source directory was not found",
      "set AGENT_SOURCE_DIR explicitly"
    );
  }

  if (!launcherRoot) {
    warn(
      "Launcher source directory was not found",
      "set LAUNCHER_SOURCE_DIR explicitly"
    );
  }

  // ---------------------------------------------------------------------------
  // Compare copies
  // ---------------------------------------------------------------------------

  section(
    "CROSS-CHECK: MAIN AGENT VS LAUNCHER"
  );

  if (
    agentAudit?.activity &&
    launcherAudit?.activity
  ) {
    const mainText =
      readText(
        agentAudit.activity
      ) || "";

    const launcherText =
      readText(
        launcherAudit.activity
      ) || "";

    const mainTimer =
      mainText.match(
        /new\s+System\.Timers\.Timer\s*\(\s*([0-9]+)\s*\)/
      )?.[1] ||
      "unknown";

    const launcherTimer =
      launcherText.match(
        /new\s+System\.Timers\.Timer\s*\(\s*([0-9]+)\s*\)/
      )?.[1] ||
      "unknown";

    info(
      "Main agent polling timer",
      `${mainTimer} ms`
    );

    info(
      "Launcher/second-copy polling timer",
      `${launcherTimer} ms`
    );

    const mainThreshold =
      mainText.match(
        /IdleThresholdSeconds\s*=\s*([0-9]+)/
      )?.[1] ||
      "policy-driven";

    const launcherThreshold =
      launcherText.match(
        /idleSeconds\s*>=\s*([0-9]+)/
      )?.[1] ||
      launcherText.match(
        /IsIdle\(\s*([0-9]+)\s*\)/
      )?.[1] ||
      "policy/unknown";

    info(
      "Main agent threshold evidence",
      mainThreshold
    );

    info(
      "Launcher/second-copy threshold evidence",
      launcherThreshold
    );

    const mainBug =
      /idleStartTime\s*=\s*now\s*;/
        .test(mainText);

    const launcherBug =
      /idleStartTime\s*=\s*now\s*;/
        .test(launcherText);

    info(
      "Main copy sets idleStartTime to detection time",
      String(mainBug)
    );

    info(
      "Launcher copy sets idleStartTime to detection time",
      String(launcherBug)
    );

    if (
      mainThreshold !==
      launcherThreshold
    ) {
      warn(
        "Agent copies have different idle-threshold logic",
        "verify which executable is actually running before editing anything"
      );
    }

    const mainCorrected =
      /idleStartTime\s*=\s*now\.AddSeconds\(\-idleSeconds\)/
        .test(mainText);

    const launcherCorrected =
      /idleStartTime\s*=\s*now\.AddSeconds\(\-idleSeconds\)/
        .test(launcherText);

    info(
      "Main copy compensates for actual idle duration",
      String(mainCorrected)
    );

    info(
      "Launcher copy compensates for actual idle duration",
      String(launcherCorrected)
    );
  } else {
    warn(
      "Could not compare both agent source trees",
      "set AGENT_SOURCE_DIR and LAUNCHER_SOURCE_DIR"
    );
  }

  // ---------------------------------------------------------------------------
  // Useful source snippets
  // ---------------------------------------------------------------------------

  section(
    "KEY SOURCE SNIPPETS"
  );

  if (agentAudit?.activity) {
    showRelevantSnippet(
      agentAudit.activity,
      [
        /int idleSeconds/,
        /idleSeconds\s*>=/,
        /idleStartTime\s*=/,
        /SendIdle\s*\(/,
        /IdleThresholdSeconds/,
      ]
    );
  }

  if (agentAudit?.idle) {
    showRelevantSnippet(
      agentAudit.idle,
      [
        /GetLastInputInfo/,
        /TickCount/,
        /GetIdleTime/,
      ]
    );
  }

  if (agentAudit?.api) {
    showRelevantSnippet(
      agentAudit.api,
      [
        /SendIdle\s*\(/,
        /api\/idle\/log/,
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // Backend HTTP
  // ---------------------------------------------------------------------------

  await backendHttpAudit();

  // ---------------------------------------------------------------------------
  // Database
  // ---------------------------------------------------------------------------

  await dbAudit();

  // ---------------------------------------------------------------------------
  // Final diagnosis
  // ---------------------------------------------------------------------------

  section(
    "FINAL DIAGNOSIS"
  );

  console.log(
    `Checks: ${checks} | Failures: ${failures} | Warnings: ${warnings}`
  );

  console.log(
    `
Interpretation:

1. This script does NOT modify the agent.

2. This script does NOT modify the database.

3. The important timing scenario is:

       User stops input
              |
              | actual inactivity
              v
       Windows GetLastInputInfo()
              |
              | threshold = 5 minutes
              v
       agent finally detects "idle"
              |
              | current code may do:
              | idleStartTime = now
              v
       backend stores only the time AFTER
       the threshold was already reached

4. Example:

       Actual inactivity      = 6m 40s
       Idle threshold         = 5m 00s
       Recorded idle          = 1m 40s

   That produces exactly the type of result you reported.

5. The backend may be correctly calculating:

       end_time - start_time

   while the agent is giving the backend the WRONG start_time.

6. Before changing the agent, use this script with the REAL running
   AGENT_TOKEN and compare:

       configured threshold
       idle_log.start_time
       idle_log.end_time
       idle_log.duration
       activity timestamps
       user.last_active

7. If the live database confirms the same pattern, the smallest
   possible agent fix is likely around the idleStartTime calculation,
   rather than changing the backend architecture.
`
  );

  console.log(
    "Diagnostic complete."
  );

  console.log(
    "NO DATABASE WRITES WERE PERFORMED."
  );

  console.log(
    "NO AGENT FILES WERE MODIFIED."
  );

  process.exitCode =
    failures ? 2 : 0;
}

main().catch((err) => {
  console.error(
    "\nDiagnostic crashed:"
  );

  console.error(err);

  process.exitCode = 1;
});