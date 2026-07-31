import { describe, expect, it } from "vitest";

import type { BoardPhoto } from "@/core/domain/room";
import { getRoomPhotoCachePlan } from "./photo-cache-plan";

function photo(index: number): BoardPhoto {
  return {
    id: `photo-${index}`,
    kind: "photo",
    ownerActorId: "actor_test" as BoardPhoto["ownerActorId"],
    variant: "one",
    asset: {
      id: `asset-${index}`,
      kind: "image",
      mimeType: "image/jpeg",
      byteSize: 100,
      remoteUrl: `https://example.test/display-${index}`,
      thumbnail: {
        id: `asset-${index}`,
        mimeType: "image/jpeg",
        byteSize: 10,
        remoteUrl: `https://example.test/thumbnail-${index}`,
      },
      revision: 1,
    },
    note: null,
    x: 0,
    y: 0,
    rotation: 0,
    width: 24,
  };
}

describe("getRoomPhotoCachePlan", () => {
  it("keeps the seven-photo window ahead of the rest of the room", () => {
    const plan = getRoomPhotoCachePlan(Array.from({ length: 10 }, (_, index) => photo(index)), "photo-5");

    expect(plan.priority.map((resource) => `${resource.asset.id}:${resource.variant}`)).toEqual([
      "asset-5:display",
      "asset-4:display",
      "asset-6:display",
      "asset-3:display",
      "asset-7:display",
      "asset-2:display",
      "asset-8:display",
      "asset-0:thumbnail",
      "asset-1:thumbnail",
      "asset-2:thumbnail",
      "asset-3:thumbnail",
      "asset-4:thumbnail",
      "asset-5:thumbnail",
      "asset-6:thumbnail",
      "asset-7:thumbnail",
      "asset-8:thumbnail",
      "asset-9:thumbnail",
    ]);
    expect(plan.background.map((resource) => `${resource.asset.id}:${resource.variant}`))
      .toEqual(["asset-0:display", "asset-1:display", "asset-9:display"]);
  });

  it("prioritizes visible thumbnails when no photo is currently selected", () => {
    const plan = getRoomPhotoCachePlan([photo(0), photo(1)], null);

    expect(plan.priority.map((resource) => `${resource.asset.id}:${resource.variant}`))
      .toEqual(["asset-0:thumbnail", "asset-1:thumbnail"]);
    expect(plan.background.map((resource) => `${resource.asset.id}:${resource.variant}`))
      .toEqual(["asset-0:display", "asset-1:display"]);
  });
});
