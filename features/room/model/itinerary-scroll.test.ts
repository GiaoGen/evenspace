import { describe, expect, it } from "vitest";

import { getCenteredScrollTop } from "./itinerary-scroll";

describe("getCenteredScrollTop", () => {
  it("centers a target using only the itinerary panel's vertical offset", () => {
    expect(getCenteredScrollTop({
      scrollTop: 120,
      containerTop: 80,
      containerHeight: 600,
      targetTop: 530,
      targetHeight: 100,
    })).toBe(320);
  });

  it("never scrolls above the beginning of the itinerary", () => {
    expect(getCenteredScrollTop({
      scrollTop: 0,
      containerTop: 100,
      containerHeight: 600,
      targetTop: 120,
      targetHeight: 80,
    })).toBe(0);
  });
});
