export const ROOM_EXTENSION_STEP_MINUTES = 5;
const MAX_ROOM_LIFETIME_MINUTES = 24 * 60;

function asTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function getMaxExtensionMinutes(endsAt: string | null, nowIso: string) {
  const now = asTime(nowIso);
  const currentEnd = Math.max(now, asTime(endsAt ?? nowIso));
  const available = Math.max(0, now + MAX_ROOM_LIFETIME_MINUTES * 60_000 - currentEnd);
  return Math.floor(available / (ROOM_EXTENSION_STEP_MINUTES * 60_000)) * ROOM_EXTENSION_STEP_MINUTES;
}

export function getExtendedEndsAt(endsAt: string | null, nowIso: string, minutes: number) {
  const now = asTime(nowIso);
  const currentEnd = Math.max(now, asTime(endsAt ?? nowIso));
  const maxMinutes = getMaxExtensionMinutes(endsAt, nowIso);
  const safeMinutes = Math.min(maxMinutes, Math.max(ROOM_EXTENSION_STEP_MINUTES, Math.round(minutes / ROOM_EXTENSION_STEP_MINUTES) * ROOM_EXTENSION_STEP_MINUTES));
  return new Date(currentEnd + safeMinutes * 60_000).toISOString();
}

export function formatExtensionDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours}h ${rest}m`;
}

export function getExtensionPollQuestion(minutes: number) {
  return `Keep this room open for ${formatExtensionDuration(minutes)} more?`;
}
