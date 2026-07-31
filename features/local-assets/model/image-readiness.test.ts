import { describe, expect, it } from "vitest";
import type { AssetReference } from "@/core/domain/asset";
import { getImageReadinessKey, isImageDecoded, markImageDecoded } from "./image-readiness";

const asset: AssetReference = {
  id: "asset_display",
  kind: "image",
  mimeType: "image/jpeg",
  byteSize: 1_000,
  revision: 4,
  thumbnail: {
    id: "asset_thumbnail",
    mimeType: "image/jpeg",
    byteSize: 200,
  },
};

describe("image readiness", () => {
  it("stays stable across URL changes while separating renditions and revisions", () => {
    expect(getImageReadinessKey(asset, "display", "actor_a")).toBe("actor_a:asset_display:display:r4");
    expect(getImageReadinessKey(asset, "thumbnail", "actor_a")).toBe("actor_a:asset_thumbnail:thumbnail:r4");
    expect(getImageReadinessKey({ ...asset, revision: 5 }, "display", "actor_a")).not.toBe(getImageReadinessKey(asset, "display", "actor_a"));
  });

  it("shares decoded state between component instances", () => {
    const key = getImageReadinessKey(asset, "thumbnail", "actor_test_readiness");
    expect(isImageDecoded(key)).toBe(false);
    markImageDecoded(key);
    expect(isImageDecoded(key)).toBe(true);
  });
});
