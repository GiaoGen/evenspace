import type { ItineraryItem } from "@/core/domain/room";

export type ItineraryVisualStatus = "ended" | "current" | "upcoming";

export interface ItineraryGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly ItineraryItem[];
}

export function getItineraryStatus(item: ItineraryItem, now: number): ItineraryVisualStatus {
  if (now >= Date.parse(item.endsAt)) return "ended";
  if (now >= Date.parse(item.startsAt)) return "current";
  return "upcoming";
}

export function getItineraryScrollTarget(items: readonly ItineraryItem[], now: number) {
  return items.find((item) => getItineraryStatus(item, now) === "current")
    ?? items.find((item) => getItineraryStatus(item, now) === "upcoming")
    ?? items.at(-1)
    ?? null;
}

export function groupItinerary(items: readonly ItineraryItem[], timeZone: string, now: number): readonly ItineraryGroup[] {
  const dayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone });
  const today = dayKey.format(new Date(now));
  const tomorrow = dayKey.format(new Date(now + 24 * 60 * 60_000));
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone });
  const groups = new Map<string, ItineraryItem[]>();

  [...items].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)).forEach((item) => {
    const key = dayKey.format(new Date(item.startsAt));
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return [...groups].map(([key, groupedItems]) => ({
    key,
    label: key === today ? "Today" : key === tomorrow ? "Tomorrow" : label.format(new Date(groupedItems[0].startsAt)),
    items: groupedItems,
  }));
}

export function formatItineraryTimeRange(item: ItineraryItem, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  return `${formatter.format(new Date(item.startsAt))} - ${formatter.format(new Date(item.endsAt))}`;
}

export function formatItineraryDistance(item: ItineraryItem, now: number) {
  const status = getItineraryStatus(item, now);
  const boundary = status === "current" ? Date.parse(item.endsAt) : Date.parse(item.startsAt);
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

export function overlapsItinerary(candidate: Pick<ItineraryItem, "id" | "startsAt" | "endsAt">, items: readonly ItineraryItem[]) {
  const start = Date.parse(candidate.startsAt);
  const end = Date.parse(candidate.endsAt);
  return items.some((item) => item.id !== candidate.id && start < Date.parse(item.endsAt) && end > Date.parse(item.startsAt));
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
