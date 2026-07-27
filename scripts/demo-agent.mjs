import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const configPath = path.join(rootDir, "IWF-Agent", "IWF-Agent", "config.json");

const readConfig = () => {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    token: config.agent_token,
    apiBaseUrl: config.api_base_url || "http://localhost:5001",
  };
};

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
};

const getJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
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

const getMonitoringState = (organizationPolicy) => {
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
      status: "Paused",
      reason: `outside configured working days (${now.weekday})`,
    };
  }

  if (holidays.includes(now.date)) {
    return {
      status: "Paused",
      reason: `company holiday (${now.date})`,
    };
  }

  const start = normalizeTime(policy.working_start, "09:00");
  const end = normalizeTime(policy.working_end, "17:00");

  if (!isTimeWithinRange(now.time, start, end)) {
    return {
      status: "Paused",
      reason: `outside configured working hours (${start}-${end})`,
    };
  }

  return {
    status: "Online",
    reason: "inside configured working policy",
  };
};

const main = async () => {
  const { token, apiBaseUrl } = readConfig();

  if (!token) {
    throw new Error(`Missing agent_token in ${configPath}`);
  }

  const verify = await postJson(`${apiBaseUrl}/api/agent/verify`, {
    agent_token: token,
  });

  if (!verify.success) {
    throw new Error("Agent token is invalid.");
  }

  console.log(`Demo Agent Started for ${verify.name} (${verify.email})`);
  console.log("This Mac demo updates status only; real app/url capture runs on Windows.");

  let lastStatus = "";

  const tick = async () => {
    const config = await getJson(
      `${apiBaseUrl}/api/agent/config?agent_token=${encodeURIComponent(token)}`
    );

    const state = getMonitoringState(config.organization_policy);

    await postJson(`${apiBaseUrl}/api/employee/status`, {
      user_id: verify.user_id,
      status: state.status,
    });

    if (state.status !== lastStatus) {
      console.log(`Status => ${state.status}: ${state.reason}`);
      lastStatus = state.status;
    } else {
      console.log(`Still ${state.status}: ${state.reason}`);
    }
  };

  await tick();
  setInterval(() => {
    tick().catch((error) => {
      console.error(`Demo Agent Error: ${error.message}`);
    });
  }, 5000);
};

main().catch((error) => {
  console.error(`Demo Agent Failed: ${error.message}`);
  process.exit(1);
});
