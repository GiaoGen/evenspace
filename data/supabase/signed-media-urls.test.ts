import { describe, expect, it, vi } from "vitest";

import { createSignedMediaUrls } from "./signed-media-urls";

vi.mock("server-only", () => ({}));

describe("createSignedMediaUrls", () => {
  it("batches display and thumbnail paths while preserving the asset lookup", async () => {
    const createSignedUrls = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ path: "display-a.jpg", signedUrl: "https://signed/display-a" }], error: null })
      .mockResolvedValueOnce({ data: [{ path: "thumbnail-a.jpg", signedUrl: "https://signed/thumbnail-a" }], error: null });
    const supabase = { storage: { from: vi.fn(() => ({ createSignedUrls })) } };

    const urls = await createSignedMediaUrls(supabase as never, [{
      id: "asset-a",
      object_key: "display-a.jpg",
      thumbnail_object_key: "thumbnail-a.jpg",
    }]);

    expect(createSignedUrls).toHaveBeenCalledTimes(2);
    expect(createSignedUrls).toHaveBeenNthCalledWith(1, ["display-a.jpg"], 1800);
    expect(createSignedUrls).toHaveBeenNthCalledWith(2, ["thumbnail-a.jpg"], 1800);
    expect(urls.display.get("asset-a")).toBe("https://signed/display-a");
    expect(urls.thumbnail.get("asset-a")).toBe("https://signed/thumbnail-a");
  });
});
