import { describe, expect, it } from "vitest";
import { getPhotoStackWindow } from "./photo-stack-window";

describe("photo stack window", () => {
  it("keeps seven visible slots in the magazine layout", () => {
    const window = getPhotoStackWindow(25, 12, false);

    expect(window.visibleRadius).toBe(3);
    expect(window.offsets.filter((offset) => Math.abs(offset) <= window.visibleRadius)).toHaveLength(7);
    expect(window.offsets).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
  });

  it("keeps five visible slots in the two-column layout", () => {
    const window = getPhotoStackWindow(25, 12, true);

    expect(window.visibleRadius).toBe(2);
    expect(window.offsets.filter((offset) => Math.abs(offset) <= window.visibleRadius)).toHaveLength(5);
    expect(window.offsets).toEqual([-3, -2, -1, 0, 1, 2, 3]);
  });

  it("moves the bounded render window across the complete collection", () => {
    expect(getPhotoStackWindow(12, 0, true).offsets).toEqual([0, 1, 2, 3]);
    expect(getPhotoStackWindow(12, 11, true).offsets).toEqual([-3, -2, -1, 0]);
  });
});
