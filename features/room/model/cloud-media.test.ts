import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheLocalAsset: vi.fn(),
  finalizeRoomMediaUploadAction: vi.fn(),
  prepareRoomMediaUploadAction: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock("@/app/rooms/[roomId]/media-actions", () => ({
  finalizeRoomMediaUploadAction: mocks.finalizeRoomMediaUploadAction,
  prepareRoomMediaUploadAction: mocks.prepareRoomMediaUploadAction,
}));

vi.mock("@/data/supabase/browser-client", () => ({
  createSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({ uploadToSignedUrl: mocks.uploadToSignedUrl }),
    },
  }),
}));

vi.mock("@/features/local-assets/model/local-asset-repository", () => ({
  cacheLocalAsset: mocks.cacheLocalAsset,
}));

import { uploadRoomMedia } from "./cloud-media";

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.prepareRoomMediaUploadAction.mockResolvedValue({
    ok: true,
    data: {
      assetId: "asset-cloud",
      objectKey: "display.jpg",
      token: "display-token",
      thumbnailObjectKey: "thumbnail.jpg",
      thumbnailToken: "thumbnail-token",
    },
  });
  mocks.uploadToSignedUrl.mockResolvedValue({ error: null });
  mocks.finalizeRoomMediaUploadAction.mockResolvedValue({
    ok: true,
    data: {
      id: "asset-cloud",
      kind: "image",
      mimeType: "image/jpeg",
      byteSize: 7,
      durationSeconds: 0,
      signedUrl: "https://example.test/display",
      thumbnailByteSize: 5,
      thumbnailSignedUrl: "https://example.test/thumbnail",
      placeholderDataUrl: "data:image/jpeg;base64,AA==",
    },
  });
  mocks.cacheLocalAsset.mockResolvedValue(undefined);
});

describe("uploadRoomMedia", () => {
  it("promotes prepared image bytes into the stable cloud cache keys", async () => {
    const display = new Blob(["display"], { type: "image/jpeg" });
    const thumbnail = new Blob(["thumb"], { type: "image/jpeg" });

    await uploadRoomMedia({
      roomPublicId: "room_test" as never,
      kind: "image",
      file: display,
      thumbnailFile: thumbnail,
      mimeType: "image/jpeg",
      placeholderDataUrl: "data:image/jpeg;base64,AA==",
      width: 1200,
      height: 800,
      cacheScope: "actor-a",
    });

    expect(mocks.cacheLocalAsset).toHaveBeenCalledTimes(2);
    expect(mocks.cacheLocalAsset).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: "asset-cloud", revision: 1, width: 1200, height: 800 }),
      display,
      { scope: "actor-a", variant: "display" },
    );
    expect(mocks.cacheLocalAsset).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: "asset-cloud", revision: 1 }),
      thumbnail,
      { scope: "actor-a", variant: "thumbnail" },
    );
  });
});
