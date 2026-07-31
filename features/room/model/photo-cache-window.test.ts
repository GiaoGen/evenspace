import { describe, expect, it } from "vitest";

import { PHOTO_CACHE_LIMIT, getPhotoCacheWindow } from "./photo-cache-window";

const photos = Array.from({ length: 10 }, (_, index) => ({ id: `photo-${index}` })) as never;

describe("getPhotoCacheWindow", () => {
  it("keeps the selected photo and its three neighbors on either side", () => {
    expect(getPhotoCacheWindow(photos, "photo-5").map((photo) => photo.id))
      .toEqual(["photo-5", "photo-4", "photo-6", "photo-3", "photo-7", "photo-2", "photo-8"]);
    expect(getPhotoCacheWindow(photos, "photo-5")).toHaveLength(PHOTO_CACHE_LIMIT);
  });

  it("uses the available photos when selection is near an edge", () => {
    expect(getPhotoCacheWindow(photos, "photo-0").map((photo) => photo.id))
      .toEqual(["photo-0", "photo-1", "photo-2", "photo-3"]);
  });
});
