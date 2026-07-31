import { describe, expect, it } from "vitest";

import {
  PHOTO_WALL_ENTRY_LEAD_MS,
  PHOTO_WALL_ENTRY_STAGGER_MS,
  schedulePhotoEntryBatch,
  shufflePhotoIds,
} from "./photo-wall-entry";

describe("photo wall entry", () => {
  it("shuffles without dropping or duplicating photos", () => {
    const shuffled = shufflePhotoIds(["a", "b", "c"], () => 0);

    expect(shuffled).toEqual(["b", "c", "a"]);
    expect(shuffled.toSorted()).toEqual(["a", "b", "c"]);
  });

  it("schedules a decoded batch one photo at a time", () => {
    const result = schedulePhotoEntryBatch({
      ids: ["a", "b", "c"],
      nowMs: 1_000,
      nextSlotAtMs: 0,
      random: () => 0.999,
    });

    expect(result.entries).toEqual([
      { id: "a", delayMs: PHOTO_WALL_ENTRY_LEAD_MS },
      { id: "b", delayMs: PHOTO_WALL_ENTRY_LEAD_MS + PHOTO_WALL_ENTRY_STAGGER_MS },
      { id: "c", delayMs: PHOTO_WALL_ENTRY_LEAD_MS + PHOTO_WALL_ENTRY_STAGGER_MS * 2 },
    ]);
  });

  it("appends late decoded photos after an already scheduled queue", () => {
    const result = schedulePhotoEntryBatch({
      ids: ["late"],
      nowMs: 1_000,
      nextSlotAtMs: 1_500,
      random: () => 0.5,
    });

    expect(result.entries).toEqual([{ id: "late", delayMs: 500 }]);
    expect(result.nextSlotAtMs).toBe(1_500 + PHOTO_WALL_ENTRY_STAGGER_MS);
  });
});
