// Durations arrive from the API in seconds, but reports never show seconds:
// the smallest unit we render is a minute. Sub-minute values collapse to "<1m"
// rather than "0m" so a short-but-nonzero span is not mistaken for nothing.
//
// Minutes are truncated, not rounded, so the parts of a duration never add up
// to more than the duration itself (59m 45s stays "59m", it does not become
// "1h 0m").
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));

  if (total === 0) return "0m";
  if (total < SECONDS_PER_MINUTE) return "<1m";

  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export default formatDuration;
