import { describe, expect, it } from "vitest";

import type { AssetReference } from "@/core/domain/asset";
import { getCachedAssetKey } from "./local-asset-repository";

const asset: AssetReference = {
  id: "asset_123",
  kind: "image",
  mimeType: "image/jpeg",
  byteSize: 1200,
  revision: 2,
};

describe("cached local assets", () => {
  it("separates users, renditions, and media revisions", () => {
    expect(getCachedAssetKey(asset, { scope: "actor_alice", variant: "display" }))
      .toBe("cache:actor_alice:asset_123:display:r2");
    expect(getCachedAssetKey(asset, { scope: "actor_alice", variant: "thumbnail" }))
      .toBe("cache:actor_alice:asset_123:thumbnail:r2");
    expect(getCachedAssetKey(asset, { scope: "actor_bob", variant: "display" }))
      .toBe("cache:actor_bob:asset_123:display:r2");
  });
});
