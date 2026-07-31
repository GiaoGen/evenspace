export const PHOTO_WALL_ENTRY_STAGGER_MS = 90;
export const PHOTO_WALL_ENTRY_LEAD_MS = 60;

export type ScheduledPhotoEntry = {
  readonly id: string;
  readonly delayMs: number;
};

export function shufflePhotoIds(
  ids: readonly string[],
  random: () => number = Math.random,
): string[] {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function schedulePhotoEntryBatch({
  ids,
  nowMs,
  nextSlotAtMs,
  random = Math.random,
}: {
  readonly ids: readonly string[];
  readonly nowMs: number;
  readonly nextSlotAtMs: number;
  readonly random?: () => number;
}): {
  readonly entries: readonly ScheduledPhotoEntry[];
  readonly nextSlotAtMs: number;
} {
  let slotAtMs = Math.max(nextSlotAtMs, nowMs + PHOTO_WALL_ENTRY_LEAD_MS);
  const entries = shufflePhotoIds(ids, random).map((id) => {
    const entry = { id, delayMs: Math.max(0, Math.round(slotAtMs - nowMs)) };
    slotAtMs += PHOTO_WALL_ENTRY_STAGGER_MS;
    return entry;
  });
  return { entries, nextSlotAtMs: slotAtMs };
}
