import { describe, expect, it, vi } from "vitest";

import { getMediaAssetRows } from "@/data/supabase/media-variant-compat";

vi.mock("server-only", () => ({}));

const legacyAsset = {
  id: "51000000-0000-4000-8000-000000000001",
  kind: "image",
  status: "ready",
  object_key: "rooms/example/display.jpg",
  mime_type: "image/jpeg",
  byte_size: 1200,
  duration_ms: null,
};

function clientWithResults(...results: unknown[]) {
  const select = vi.fn(() => ({
    in: vi.fn(() => Promise.resolve(results.shift())),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(results.shift()).then(resolve),
  }));
  return { from: vi.fn(() => ({ select })) };
}

describe("getMediaAssetRows", () => {
  it("retries with legacy columns when the deployed schema lacks rendition metadata", async () => {
    const supabase = clientWithResults(
      { data: null, error: { code: "PGRST204", message: "Could not find the 'thumbnail_object_key' column" } },
      { data: [legacyAsset], error: null },
    );

    const result = await getMediaAssetRows(supabase as never, [legacyAsset.id]);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{
      ...legacyAsset,
      thumbnail_object_key: null,
      thumbnail_byte_size: null,
      placeholder_data_url: null,
      image_width: null,
      image_height: null,
      media_revision: 1,
    }]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
