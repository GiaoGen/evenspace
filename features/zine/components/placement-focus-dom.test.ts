import { describe, expect, it } from "vitest";
import {
  getPlacementImageSelector,
  syncVisiblePlacementFocus,
} from "./placement-focus-dom";

describe("Placement focus DOM synchronization", () => {
  it("updates both rendered halves of a cross-page placement during drag", () => {
    const images = [
      { style: { objectPosition: "50% 50%", transform: "scale(1)", transformOrigin: "50% 50%" } },
      { style: { objectPosition: "50% 50%", transform: "scale(1)", transformOrigin: "50% 50%" } },
    ];
    let selector = "";
    const viewport = {
      querySelectorAll: (value: string) => {
        selector = value;
        return images;
      },
    } as unknown as Pick<HTMLElement, "querySelectorAll">;

    syncVisiblePlacementFocus(viewport, "placement:cross-photo", 18, 82, 1.25);

    expect(selector).toBe(getPlacementImageSelector("placement:cross-photo"));
    expect(images).toEqual([
      { style: { objectPosition: "18% 82%", transform: "scale(1.25)", transformOrigin: "18% 82%" } },
      { style: { objectPosition: "18% 82%", transform: "scale(1.25)", transformOrigin: "18% 82%" } },
    ]);
  });
});
