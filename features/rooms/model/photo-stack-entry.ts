export const PHOTO_STACK_ENTRY_LEAD_MS = 70;
export const PHOTO_STACK_ENTRY_STAGGER_MS = 110;

export interface PhotoStackEntryCandidate {
  readonly id: string;
  readonly offset: number;
}

export interface ScheduledPhotoStackEntry {
  readonly id: string;
  readonly delayMs: number;
}

const enteredPhotoStackEntries = new Set<string>();

/** Builds a physical stack from the back layers inward, with the main photo last. */
export function orderPhotoStackEntryCandidates(
  candidates: readonly PhotoStackEntryCandidate[],
) {
  return [...candidates].toSorted((left, right) =>
    Math.abs(right.offset) - Math.abs(left.offset) || left.offset - right.offset,
  );
}

export function schedulePhotoStackEntryBatch({
  candidates,
  nowMs,
  nextSlotAtMs,
}: {
  readonly candidates: readonly PhotoStackEntryCandidate[];
  readonly nowMs: number;
  readonly nextSlotAtMs: number;
}): {
  readonly entries: readonly ScheduledPhotoStackEntry[];
  readonly nextSlotAtMs: number;
} {
  let slotAtMs = Math.max(nextSlotAtMs, nowMs + PHOTO_STACK_ENTRY_LEAD_MS);
  const entries = orderPhotoStackEntryCandidates(candidates).map((candidate) => {
    const entry = {
      id: candidate.id,
      delayMs: Math.max(0, Math.round(slotAtMs - nowMs)),
    };
    slotAtMs += PHOTO_STACK_ENTRY_STAGGER_MS;
    return entry;
  });
  return { entries, nextSlotAtMs: slotAtMs };
}

export function hasEnteredPhotoStack(key: string) {
  return enteredPhotoStackEntries.has(key);
}

export function markPhotoStackEntered(key: string) {
  enteredPhotoStackEntries.add(key);
}

export function getPhotoStackEntryKey(scope: string | undefined, roomId: string, photoId: string) {
  return `${scope ?? "device"}:${roomId}:${photoId}`;
}
