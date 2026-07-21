import { describe, expect, it } from "vitest";

import { createTestItinerary } from "@/test/factories/mock-session";

import {
  getItineraryScrollTarget,
  getItineraryStatus,
  groupItinerary,
  overlapsItinerary,
} from "./itinerary";

const NOW = Date.parse("2030-01-01T11:00:00.000Z");

describe("itinerary status", () => {
  it("distinguishes upcoming, current, scheduled-ended, and manually-ended items", () => {
    expect(getItineraryStatus(createTestItinerary({ startsAt: "2030-01-01T12:00:00.000Z", endsAt: "2030-01-01T13:00:00.000Z" }), NOW)).toBe("upcoming");
    expect(getItineraryStatus(createTestItinerary(), NOW)).toBe("current");
    expect(getItineraryStatus(createTestItinerary({ endsAt: "2030-01-01T10:45:00.000Z" }), NOW)).toBe("ended");
    expect(getItineraryStatus(createTestItinerary({ endMode: "manual", endsAt: null, endedAt: "2030-01-01T10:45:00.000Z" }), NOW)).toBe("ended");
  });

  it("orders upcoming groups before current groups and ended groups", () => {
    const groups = groupItinerary([
      createTestItinerary({ id: "ended", startsAt: "2030-01-01T09:00:00.000Z", endsAt: "2030-01-01T10:00:00.000Z" }),
      createTestItinerary({ id: "current" }),
      createTestItinerary({ id: "upcoming", startsAt: "2030-01-01T12:00:00.000Z", endsAt: "2030-01-01T13:00:00.000Z" }),
    ], "UTC", NOW);

    expect(groups.map((group) => group.status)).toEqual(["upcoming", "current", "ended"]);
  });
});

describe("itinerary navigation", () => {
  it("targets a current item before the nearest upcoming or latest ended item", () => {
    const current = createTestItinerary({ id: "current" });
    const target = getItineraryScrollTarget([
      createTestItinerary({ id: "upcoming", startsAt: "2030-01-01T11:15:00.000Z", endsAt: "2030-01-01T12:00:00.000Z" }),
      current,
      createTestItinerary({ id: "ended", startsAt: "2030-01-01T09:00:00.000Z", endsAt: "2030-01-01T10:00:00.000Z" }),
    ], NOW);

    expect(target?.id).toBe(current.id);
  });

  it("uses the nearest upcoming item when nothing is currently active", () => {
    const target = getItineraryScrollTarget([
      createTestItinerary({ id: "later", startsAt: "2030-01-01T13:00:00.000Z", endsAt: "2030-01-01T14:00:00.000Z" }),
      createTestItinerary({ id: "next", startsAt: "2030-01-01T11:15:00.000Z", endsAt: "2030-01-01T12:00:00.000Z" }),
    ], NOW);

    expect(target?.id).toBe("next");
  });
});

describe("itinerary overlap", () => {
  it("uses the room end as the boundary for a manual item", () => {
    const manual = createTestItinerary({ id: "manual", endMode: "manual", endsAt: null });
    const candidate = createTestItinerary({ id: "candidate", startsAt: "2030-01-01T12:00:00.000Z", endsAt: "2030-01-01T12:30:00.000Z" });

    expect(overlapsItinerary(candidate, [manual], "2030-01-01T13:00:00.000Z")).toBe(true);
    expect(overlapsItinerary({ ...candidate, startsAt: "2030-01-01T13:00:00.000Z", endsAt: "2030-01-01T13:30:00.000Z" }, [manual], "2030-01-01T13:00:00.000Z")).toBe(false);
  });
});
