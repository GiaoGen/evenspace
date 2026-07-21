import type { ItineraryItem } from "@/core/domain/room";

export type ItineraryVisualStatus = "ended" | "current" | "upcoming";

export interface ItineraryGroup {
  readonly key: string;
  readonly label: string;
  readonly status: ItineraryVisualStatus;
  readonly items: readonly ItineraryItem[];
}

export function getItineraryStatus(item: ItineraryItem, now: number): ItineraryVisualStatus {
  if (item.endedAt || item.endMode === "scheduled" && item.endsAt && now >= Date.parse(item.endsAt)) return "ended";
  if (now >= Date.parse(item.startsAt)) return "current";
  return "upcoming";
}

export function getItineraryScrollTarget(items: readonly ItineraryItem[], now: number) {
  return items.find((item) => getItineraryStatus(item, now) === "current")
    ?? items.filter((item) => getItineraryStatus(item, now) === "upcoming").sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0]
    ?? items.filter((item) => getItineraryStatus(item, now) === "ended").sort((left, right) => getItineraryEndTime(right) - getItineraryEndTime(left))[0]
    ?? null;
}

export function groupItinerary(items: readonly ItineraryItem[], timeZone: string, now: number): readonly ItineraryGroup[] {
  const dayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone });
  const today = dayKey.format(new Date(now));
  const tomorrow = dayKey.format(new Date(now + 24 * 60 * 60_000));
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone });
  const groups = new Map<string, { status: ItineraryVisualStatus; items: ItineraryItem[] }>();
  const statusOrder: Record<ItineraryVisualStatus, number> = { upcoming: 0, current: 1, ended: 2 };

  [...items].sort((left, right) => {
    const leftStatus = getItineraryStatus(left, now);
    const rightStatus = getItineraryStatus(right, now);
    const statusDifference = statusOrder[leftStatus] - statusOrder[rightStatus];
    if (statusDifference) return statusDifference;
    if (leftStatus === "upcoming") return Date.parse(right.startsAt) - Date.parse(left.startsAt);
    if (leftStatus === "ended") return getItineraryEndTime(right) - getItineraryEndTime(left);
    return Date.parse(left.startsAt) - Date.parse(right.startsAt);
  }).forEach((item) => {
    const status = getItineraryStatus(item, now);
    const day = dayKey.format(new Date(item.startsAt));
    const key = `${status}:${day}`;
    groups.set(key, { status, items: [...(groups.get(key)?.items ?? []), item] });
  });

  const statusLabel: Record<ItineraryVisualStatus, string> = { upcoming: "Upcoming", current: "Happening now", ended: "Ended" };
  return [...groups].map(([key, group]) => ({
    key,
    status: group.status,
    label: `${statusLabel[group.status]} · ${key.endsWith(today) ? "Today" : key.endsWith(tomorrow) ? "Tomorrow" : label.format(new Date(group.items[0].startsAt))}`,
    items: group.items,
  }));
}

export function formatItineraryTimeRange(item: ItineraryItem, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const end = item.endedAt ?? item.endsAt;
  return end ? `${formatter.format(new Date(item.startsAt))} - ${formatter.format(new Date(end))}` : `${formatter.format(new Date(item.startsAt))} · Ends manually`;
}

export function getItineraryEndTime(item: ItineraryItem) {
  const value = item.endedAt ?? item.endsAt;
  return value ? Date.parse(value) : Number.POSITIVE_INFINITY;
}

export function formatItineraryDistance(item: ItineraryItem, now: number) {
  const status = getItineraryStatus(item, now);
  if (status === "current" && item.endMode === "manual") return "Ends manually";
  const boundary = status === "current" || status === "ended" ? getItineraryEndTime(item) : Date.parse(item.startsAt);
  const minutes = Math.max(0, Math.ceil(Math.abs(boundary - now) / 60_000));
  const value = minutes < 60 ? `${minutes} min` : minutes < 24 * 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${Math.floor(minutes / 1440)}d`;
  return status === "ended" ? `Ended ${value} ago` : status === "current" ? `${value} left` : `Starts in ${value}`;
}

export function getItinerarySummary(items: readonly ItineraryItem[], now: number) {
  const target = getItineraryScrollTarget(items, now);
  if (!target) return { label: "The schedule is open", detail: "Add the first part of the day." };
  const status = getItineraryStatus(target, now);
  if (status === "current") return { label: "Happening now", detail: `${target.title} · ${formatItineraryDistance(target, now)}` };
  if (status === "upcoming") return { label: "Up next", detail: `${target.title} · ${formatItineraryDistance(target, now)}` };
  return { label: "All wrapped up", detail: `${items.length} ${items.length === 1 ? "plan" : "plans"} completed.` };
}

export function overlapsItinerary(candidate: Pick<ItineraryItem, "id" | "startsAt" | "endsAt" | "endedAt">, items: readonly ItineraryItem[], fallbackEndsAt: string | null) {
  const start = Date.parse(candidate.startsAt);
  const end = candidate.endedAt ? Date.parse(candidate.endedAt) : candidate.endsAt ? Date.parse(candidate.endsAt) : Date.parse(fallbackEndsAt ?? "");
  return Number.isFinite(end) && items.some((item) => {
    const itemEnd = item.endedAt ? Date.parse(item.endedAt) : item.endsAt ? Date.parse(item.endsAt) : Date.parse(fallbackEndsAt ?? "");
    return item.id !== candidate.id && Number.isFinite(itemEnd) && start < itemEnd && end > Date.parse(item.startsAt);
  });
}

export function getSafeItineraryMapsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "maps.google.com" || url.hostname.endsWith(".google.com") || url.hostname === "maps.apple.com") ? url.toString() : null;
  } catch {
    return null;
  }
}
