import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssetReference } from "@/core/domain/asset";

const repository = vi.hoisted(() => ({
  cacheLocalAsset: vi.fn(),
  getCachedLocalAssetBlob: vi.fn(),
  getLocalAssetBlob: vi.fn(),
}));

vi.mock("./local-asset-repository", () => ({
  ...repository,
  getCachedAssetKey: (
    reference: AssetReference,
    options: { readonly scope: string; readonly variant: "display" | "thumbnail" },
  ) => `cache:${options.scope}:${reference.id}:${options.variant}:r${reference.revision ?? 1}`,
}));

import {
  getImageVariantReference,
  readBestCachedImage,
  resolveCachedImage,
} from "./cached-image-resolver";

const asset: AssetReference = {
  id: "asset-display",
  kind: "image",
  mimeType: "image/jpeg",
  byteSize: 1_000,
  remoteUrl: "https://example.test/display",
  revision: 3,
  thumbnail: {
    id: "asset-thumbnail",
    mimeType: "image/jpeg",
    byteSize: 100,
    remoteUrl: "https://example.test/thumbnail",
  },
};

beforeEach(() => {
  repository.cacheLocalAsset.mockReset();
  repository.getCachedLocalAssetBlob.mockReset();
  repository.getLocalAssetBlob.mockReset();
});

describe("cached image variant resolution", () => {
  it("keeps rendition identity while carrying the media revision", () => {
    expect(getImageVariantReference(asset, "display")).toBe(asset);
    expect(getImageVariantReference(asset, "thumbnail")).toMatchObject({
      id: "asset-thumbnail",
      remoteUrl: "https://example.test/thumbnail",
      revision: 3,
    });
  });

  it("uses a cached display rendition to satisfy a thumbnail request", async () => {
    const display = new Blob(["display"], { type: "image/jpeg" });
    repository.getCachedLocalAssetBlob.mockResolvedValueOnce(display);

    const result = await readBestCachedImage(asset, "actor-a");

    expect(result).toMatchObject({
      blob: display,
      key: "cache:actor-a:asset-display:display:r3",
      variant: "display",
    });
    expect(repository.getCachedLocalAssetBlob).toHaveBeenCalledTimes(1);
  });

  it("falls back to a cached thumbnail while display bytes are unavailable", async () => {
    const thumbnail = new Blob(["thumbnail"], { type: "image/jpeg" });
    repository.getCachedLocalAssetBlob
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(thumbnail);

    const result = await readBestCachedImage(asset, "actor-a");

    expect(result).toMatchObject({
      blob: thumbnail,
      key: "cache:actor-a:asset-thumbnail:thumbnail:r3",
      variant: "thumbnail",
    });
  });

  it("never starts a remote request when persistent bytes already exist", async () => {
    const cached = new Blob(["cached-display"], { type: "image/jpeg" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    repository.getCachedLocalAssetBlob.mockResolvedValueOnce(cached);

    await expect(resolveCachedImage(
      asset,
      { scope: "actor-a", variant: "display" },
      "https://example.test/display",
    )).resolves.toEqual({ blob: cached, expiredRemoteUrl: false });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
