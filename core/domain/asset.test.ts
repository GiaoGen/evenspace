import { describe, expect, it } from "vitest";

import { isAssetReference } from "./asset";

describe("isAssetReference", () => {
  it("accepts a processed image with thumbnail, placeholder, dimensions, and revision", () => {
    expect(isAssetReference({
      id: "asset_display",
      kind: "image",
      mimeType: "image/jpeg",
      byteSize: 320_000,
      thumbnail: {
        id: "asset_thumbnail",
        mimeType: "image/jpeg",
        byteSize: 42_000,
      },
      placeholderDataUrl: "data:image/jpeg;base64,AAAA",
      width: 1200,
      height: 800,
      revision: 1,
    }, "image")).toBe(true);
  });

  it("rejects image-only metadata attached to audio", () => {
    expect(isAssetReference({
      id: "asset_voice",
      kind: "audio",
      mimeType: "audio/webm",
      byteSize: 2_048,
      thumbnail: { id: "asset_thumbnail", mimeType: "image/jpeg", byteSize: 32 },
    })).toBe(false);
  });
});
