function getLocalParts(now, timezone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const values = Object.fromEntries(
      formatter.formatToParts(now)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      day: values.weekday,
      seconds: Number(values.hour) * 3600 + Number(values.minute) * 60 + Number(values.second),
    };
  } catch {
    return null;
  }
}

function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, hours, minutes, seconds = "0"] = match;
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  return Number(hours) < 24 && Number(minutes) < 60 && Number(seconds) < 60 ? total : null;
}

function previousDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

function evaluateWorkingTime(policy, now) {
  if (!policy || !policy.timezone || !Array.isArray(policy.working_days) || policy.working_days.length === 0) {
    return { eligible: false, reason: "invalid_policy" };
  }

  const start = parseTime(policy.working_start);
  const end = parseTime(policy.working_end);
  if (start === null || end === null || start === end) {
    return { eligible: false, reason: "invalid_working_window" };
  }

  const local = getLocalParts(now, policy.timezone);
  if (!local) return { eligible: false, reason: "invalid_timezone" };

  const overnight = start > end;
  const insideWindow = overnight
    ? local.seconds >= start || local.seconds < end
    : local.seconds >= start && local.seconds < end;
  if (!insideWindow) return { eligible: false, reason: "outside_working_hours", local };

  const shiftDate = overnight && local.seconds < end ? previousDate(local.date) : local.date;
  const shiftDay = overnight && local.seconds < end
    ? getLocalParts(new Date(`${shiftDate}T12:00:00Z`), "UTC").day
    : local.day;
  const isWorkingDay = policy.working_days.some(
    (day) => String(day).trim().toLowerCase() === shiftDay.toLowerCase()
  );
  if (!isWorkingDay) return { eligible: false, reason: "non_working_day", local, shiftDate };

  const holidayDates = new Set((policy.holidays || []).map((holiday) => String(holiday).slice(0, 10)));
  if (holidayDates.has(shiftDate)) {
    return { eligible: false, reason: "holiday", local, shiftDate };
  }

  return { eligible: true, local, shiftDate, overnight, workingStart: policy.working_start, workingEnd: policy.working_end };
}

module.exports = { evaluateWorkingTime, parseTime };
