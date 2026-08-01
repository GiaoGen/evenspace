import { describe, expect, it } from "vitest";
import {
  PHOTO_STACK_ENTRY_LEAD_MS,
  PHOTO_STACK_ENTRY_STAGGER_MS,
  orderPhotoStackEntryCandidates,
  schedulePhotoStackEntryBatch,
} from "./photo-stack-entry";

describe("photo stack entry", () => {
  it("inserts the back layers first and the main photo last", () => {
    expect(orderPhotoStackEntryCandidates([
      { id: "main", offset: 0 },
      { id: "right-one", offset: 1 },
      { id: "left-three", offset: -3 },
      { id: "left-one", offset: -1 },
      { id: "right-three", offset: 3 },
    ]).map((candidate) => candidate.id)).toEqual([
      "left-three",
      "right-three",
      "left-one",
      "right-one",
      "main",
    ]);
  });

  it("queues decoded photos one at a time", () => {
    const result = schedulePhotoStackEntryBatch({
      candidates: [
        { id: "main", offset: 0 },
        { id: "left", offset: -1 },
        { id: "right", offset: 1 },
      ],
      nowMs: 1_000,
      nextSlotAtMs: 0,
    });

    expect(result.entries).toEqual([
      { id: "left", delayMs: PHOTO_STACK_ENTRY_LEAD_MS },
      { id: "right", delayMs: PHOTO_STACK_ENTRY_LEAD_MS + PHOTO_STACK_ENTRY_STAGGER_MS },
      { id: "main", delayMs: PHOTO_STACK_ENTRY_LEAD_MS + PHOTO_STACK_ENTRY_STAGGER_MS * 2 },
    ]);
  });

  it("appends a late decoded batch after the current sequence", () => {
    const result = schedulePhotoStackEntryBatch({
      candidates: [{ id: "late", offset: 2 }],
      nowMs: 1_000,
      nextSlotAtMs: 1_500,
    });

    expect(result.entries).toEqual([{ id: "late", delayMs: 500 }]);
    expect(result.nextSlotAtMs).toBe(1_500 + PHOTO_STACK_ENTRY_STAGGER_MS);
  });
});
