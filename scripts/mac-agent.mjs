import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, "..");
const configPath = path.join(rootDir, "IWF-Agent", "IWF-Agent", "config.json");

const TICK_MS = 5000;
const ACTIVE_CHUNK_SECONDS = 30;
const POLICY_REFRESH_MS = 30000;

const state = {
  user: null,
  policyConfig: null,
  restrictedItems: { apps: [], sites: [] },
  lastWindow: "",
  lastTitle: "",
  lastActivityStart: new Date(),
  isIdle: false,
  idleStart: null,
  monitoringPaused: false,
  lastStatus: "",
  lastPolicyFetch: 0,
  restrictedRunning: false,
  restrictedName: "",
  restrictedStart: null,
  restrictedAlertSent: false,
};

const readConfig = () => {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    token: config.agent_token,
    apiBaseUrl: config.api_base_url || "http://localhost:5001",
  };
};

const jsonRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || data.error || `${response.status} ${response.statusText}`);
  }

  return data;
};

const postJson = (url, body) =>
  jsonRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });

const runAppleScript = async (script) => {
  const args = script.flatMap((line) => ["-e", line]);
  const { stdout } = await execFileAsync("osascript", args, { timeout: 3000 });
  return stdout.trim();
};

const getFrontmostApp = async () => {
  try {
    return await runAppleScript([
      'tell application "System Events"',
      'set frontApp to name of first application process whose frontmost is true',
      "end tell",
      "return frontApp",
    ]);
  } catch {
    console.warn(
      "Could not read frontmost app. Give Terminal Accessibility permission in System Settings."
    );
    return "Unknown";
  }
};

const getFrontmostTitle = async () => {
  try {
    return await runAppleScript([
      'tell application "System Events"',
      'set frontProc to first application process whose frontmost is true',
      'set windowTitle to ""',
      "try",
      "set windowTitle to name of front window of frontProc",
      "end try",
      "end tell",
      "return windowTitle",
    ]);
  } catch {
    return "";
  }
};

const getBrowserContext = async (appName) => {
  if (appName === "Google Chrome") {
    try {
      const output = await runAppleScript([
        'tell application "Google Chrome"',
        'if not (exists front window) then return ""',
        'set tabTitle to title of active tab of front window',
        'set tabUrl to URL of active tab of front window',
        "end tell",
        'return tabTitle & "\\n" & tabUrl',
      ]);
      const [title = "", url = ""] = output.split("\n");
      return { title, url };
    } catch {
      return { title: "", url: "" };
    }
  }

  if (appName === "Safari") {
    try {
      const output = await runAppleScript([
        'tell application "Safari"',
        'if not (exists front document) then return ""',
        'set tabTitle to name of front document',
        'set tabUrl to URL of front document',
        "end tell",
        'return tabTitle & "\\n" & tabUrl',
      ]);
      const [title = "", url = ""] = output.split("\n");
      return { title, url };
    } catch {
      return { title: "", url: "" };
    }
  }

  return { title: "", url: "" };
};

const getActiveWindow = async () => {
  const appName = await getFrontmostApp();
  const fallbackTitle = await getFrontmostTitle();
  const browser = await getBrowserContext(appName);
  const title = browser.title || fallbackTitle;
  const url = browser.url || "";
  const displayName = url ? `${appName} - ${url}` : appName;

  return {
    appName,
    title,
    url,
    displayName,
  };
};

const getIdleSeconds = async () => {
  try {
    const { stdout } = await execFileAsync("ioreg", ["-c", "IOHIDSystem"], {
      timeout: 3000,
      maxBuffer: 1024 * 1024,
    });
    const match = stdout.match(/"HIDIdleTime"\s*=\s*(\d+)/);

    if (!match) return 0;

    return Math.floor(Number(match[1]) / 1_000_000_000);
  } catch {
    return 0;
  }
};

const getPolicyNow = (timezone) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const value = (type) => parts.find((part) => part.type === type)?.value;

    return {
      weekday: value("weekday"),
      date: `${value("year")}-${value("month")}-${value("day")}`,
      time: `${value("hour")}:${value("minute")}:${value("second")}`,
    };
  } catch {
    const now = new Date();

    return {
      weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
    };
  }
};

const normalizeTime = (value, fallback) => {
  if (!value) return fallback;
  return String(value).slice(0, 5);
};

const isTimeWithinRange = (time, start, end) => {
  const current = time.slice(0, 5);

  if (start <= end) {
    return current >= start && current <= end;
  }

  return current >= start || current <= end;
};

const getMonitoringState = () => {
  const organizationPolicy = state.policyConfig?.organization_policy || {};
  const policy = {
    timezone: "America/Los_Angeles",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    working_start: "09:00",
    working_end: "17:00",
    holidays: [],
    ...organizationPolicy,
  };

  const now = getPolicyNow(policy.timezone);
  const workingDays = policy.working_days || [];
  const holidays = (policy.holidays || []).map((holiday) =>
    String(holiday).slice(0, 10)
  );

  if (!workingDays.includes(now.weekday)) {
    return {
      allowed: false,
      reason: `outside configured working days (${now.weekday})`,
    };
  }

  if (holidays.includes(now.date)) {
    return {
      allowed: false,
      reason: `company holiday (${now.date})`,
    };
  }

  const start = normalizeTime(policy.working_start, "09:00");
  const end = normalizeTime(policy.working_end, "17:00");

  if (!isTimeWithinRange(now.time, start, end)) {
    return {
      allowed: false,
      reason: `outside configured working hours (${start}-${end})`,
    };
  }

  return {
    allowed: true,
    reason: "inside configured working policy",
  };
};

const getMonitoringPolicy = () => ({
  screenshot_interval_seconds: 0,
  idle_threshold_seconds: 300,
  url_tracking_enabled: true,
  app_tracking_enabled: true,
  keyboard_activity_tracking_enabled: false,
  mouse_activity_tracking_enabled: false,
  ...(state.policyConfig?.monitoring_policy || {}),
});

const getProductivityCategory = (windowInfo) => {
  const rules = state.policyConfig?.productivity_rules || [];
  const appTarget = `${windowInfo.appName} ${windowInfo.displayName} ${windowInfo.title}`;
  const siteTarget = `${windowInfo.url} ${windowInfo.title}`;

  for (const rule of rules) {
    const target = rule.rule_type === "site" ? siteTarget : appTarget;

    if (target.toLowerCase().includes(String(rule.pattern).toLowerCase())) {
      return rule.category || "neutral";
    }
  }

  return "neutral";
};

const sendActivity = async (windowName, startTime, endTime, category = "neutral") => {
  if (!windowName || windowName === "Unknown") return;

  await postJson(`${config.apiBaseUrl}/api/activity/log`, {
    user_id: state.user.user_id,
    app_name: windowName,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    productivity_category: category,
  });
};

const sendIdle = async (startTime, endTime) => {
  await postJson(`${config.apiBaseUrl}/api/idle/log`, {
    user_id: state.user.user_id,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
  });
};

const updateStatus = async (status) => {
  if (state.lastStatus === status) return;

  await postJson(`${config.apiBaseUrl}/api/employee/status`, {
    user_id: state.user.user_id,
    status,
  });

  state.lastStatus = status;
  console.log(`Status => ${status}`);
};

const fetchPolicy = async (force = false) => {
  const now = Date.now();

  if (!force && now - state.lastPolicyFetch < POLICY_REFRESH_MS) {
    return;
  }

  state.policyConfig = await jsonRequest(
    `${config.apiBaseUrl}/api/agent/config?agent_token=${encodeURIComponent(config.token)}`
  );
  state.lastPolicyFetch = now;
};

const fetchRestrictedItems = async () => {
  try {
    const data = await jsonRequest(`${config.apiBaseUrl}/api/restricted-items`);
    state.restrictedItems = {
      apps: data.apps || [],
      sites: data.sites || [],
    };
  } catch {
    state.restrictedItems = { apps: [], sites: [] };
  }
};

const findRestrictedName = (windowInfo, policy) => {
  if (policy.app_tracking_enabled) {
    const app = state.restrictedItems.apps.find((item) =>
      `${windowInfo.appName} ${windowInfo.displayName}`
        .toLowerCase()
        .includes(String(item).toLowerCase())
    );

    if (app) return app;
  }

  if (policy.url_tracking_enabled) {
    const site = state.restrictedItems.sites.find((item) =>
      `${windowInfo.url} ${windowInfo.title}`
        .toLowerCase()
        .includes(String(item).toLowerCase())
    );

    if (site) return site;
  }

  return "";
};

const handleRestricted = async (windowInfo, policy) => {
  const restrictedName = findRestrictedName(windowInfo, policy);

  if (!restrictedName) {
    state.restrictedRunning = false;
    state.restrictedName = "";
    state.restrictedStart = null;
    state.restrictedAlertSent = false;
    return;
  }

  if (!state.restrictedRunning || state.restrictedName !== restrictedName) {
    state.restrictedRunning = true;
    state.restrictedName = restrictedName;
    state.restrictedStart = new Date();
    state.restrictedAlertSent = false;
    console.log(`Restricted item detected: ${restrictedName}`);
    return;
  }

  const minutes = (Date.now() - state.restrictedStart.getTime()) / 60000;

  if (minutes >= 0.2 && !state.restrictedAlertSent) {
    state.restrictedAlertSent = true;
    await postJson(`${config.apiBaseUrl}/api/alerts/send`, {
      userId: state.user.user_id,
      website: restrictedName,
      duration: Math.max(1, Math.ceil(minutes)),
    });
    console.log(`Restricted alert sent: ${restrictedName}`);
  }
};

const pauseMonitoring = async (windowInfo, reason) => {
  if (!state.monitoringPaused) {
    const now = new Date();
    const policy = getMonitoringPolicy();

    if (state.isIdle && state.idleStart) {
      await sendIdle(state.idleStart, now);
      state.isIdle = false;
      state.idleStart = null;
    } else if (policy.app_tracking_enabled) {
      await sendActivity(
        state.lastWindow,
        state.lastActivityStart,
        now,
        getProductivityCategory({
          appName: state.lastWindow,
          displayName: state.lastWindow,
          title: state.lastTitle,
          url: state.lastTitle,
        })
      );
    }

    state.monitoringPaused = true;
    state.restrictedRunning = false;
    state.lastWindow = windowInfo.displayName;
    state.lastTitle = windowInfo.title;
    state.lastActivityStart = now;
    await updateStatus("Offline");
    console.log(`Monitoring stopped by policy: ${reason}`);
  }
};

const resumeMonitoring = async (windowInfo) => {
  if (!state.monitoringPaused) return;

  state.monitoringPaused = false;
  state.lastWindow = windowInfo.displayName;
  state.lastTitle = windowInfo.title;
  state.lastActivityStart = new Date();
  await updateStatus("Online");
  console.log("Monitoring resumed.");
};

const tick = async () => {
  await fetchPolicy();

  const windowInfo = await getActiveWindow();
  const monitoringState = getMonitoringState();

  if (!monitoringState.allowed) {
    await pauseMonitoring(windowInfo, monitoringState.reason);
    return;
  }

  await resumeMonitoring(windowInfo);

  const policy = getMonitoringPolicy();
  const idleSeconds = await getIdleSeconds();
  const idle = idleSeconds >= Number(policy.idle_threshold_seconds || 300);
  const now = new Date();

  console.log(
    `Window: ${windowInfo.displayName} | Idle: ${idleSeconds}s | Policy: ${monitoringState.reason}`
  );

  if (idle) {
    if (!state.isIdle) {
      if (policy.app_tracking_enabled) {
        await sendActivity(
          state.lastWindow,
          state.lastActivityStart,
          now,
          getProductivityCategory(windowInfo)
        );
      }

      state.isIdle = true;
      state.idleStart = now;
      await updateStatus("Idle");
      console.log("Idle started.");
    }

    return;
  }

  if (state.isIdle) {
    await sendIdle(state.idleStart, now);
    state.isIdle = false;
    state.idleStart = null;
    state.lastActivityStart = now;
    await updateStatus("Online");
    console.log("Idle ended.");
  }

  if (policy.app_tracking_enabled && windowInfo.displayName !== state.lastWindow) {
    await sendActivity(
      state.lastWindow,
      state.lastActivityStart,
      now,
      getProductivityCategory({
        appName: state.lastWindow,
        displayName: state.lastWindow,
        title: state.lastTitle,
        url: state.lastTitle,
      })
    );

    state.lastWindow = windowInfo.displayName;
    state.lastTitle = windowInfo.title;
    state.lastActivityStart = now;
    return;
  }

  await handleRestricted(windowInfo, policy);

  const activeSeconds = (now.getTime() - state.lastActivityStart.getTime()) / 1000;

  if (policy.app_tracking_enabled && activeSeconds >= ACTIVE_CHUNK_SECONDS) {
    await sendActivity(
      windowInfo.displayName,
      state.lastActivityStart,
      now,
      getProductivityCategory(windowInfo)
    );
    state.lastActivityStart = now;
  }
};

const shutdown = async () => {
  try {
    const now = new Date();

    if (!state.monitoringPaused && state.isIdle && state.idleStart) {
      await sendIdle(state.idleStart, now);
    } else if (!state.monitoringPaused) {
      await sendActivity(state.lastWindow, state.lastActivityStart, now);
    }

    await postJson(`${config.apiBaseUrl}/api/session/end`, {
      user_id: state.user.user_id,
    });
  } catch (error) {
    console.error(`Shutdown warning: ${error.message}`);
  } finally {
    process.exit(0);
  }
};

const config = readConfig();

if (!config.token) {
  console.error(`Missing agent_token in ${configPath}`);
  process.exit(1);
}

state.user = await postJson(`${config.apiBaseUrl}/api/agent/verify`, {
  agent_token: config.token,
});

if (!state.user.success) {
  console.error("Agent token is invalid.");
  process.exit(1);
}

await fetchPolicy(true);
await fetchRestrictedItems();

const initialWindow = await getActiveWindow();
state.lastWindow = initialWindow.displayName;
state.lastTitle = initialWindow.title;
state.lastActivityStart = new Date();

await postJson(`${config.apiBaseUrl}/api/session/start`, {
  user_id: state.user.user_id,
});
await updateStatus("Online");

console.log(`Mac Agent Started for ${state.user.name} (${state.user.email})`);
console.log("Press Ctrl+C to stop and close the session.");

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

setInterval(() => {
  tick().catch((error) => {
    console.error(`Mac Agent Error: ${error.message}`);
  });
}, TICK_MS);

tick().catch((error) => {
  console.error(`Mac Agent Error: ${error.message}`);
});
