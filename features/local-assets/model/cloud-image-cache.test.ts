import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearCloudImageBlobs,
  deleteCloudImageBlob,
  getCloudImageBlob,
  putCloudImageBlob,
} from "./cloud-image-cache";

describe("durable cloud image cache", () => {
  const entries = new Map<string, Response>();
  const cache = {
    put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
      entries.set(String(request), response.clone());
    }),
    match: vi.fn(async (request: RequestInfo | URL) => entries.get(String(request))?.clone()),
    delete: vi.fn(async (request: RequestInfo | URL) => entries.delete(String(request))),
  };
  const storage = {
    open: vi.fn(async () => cache),
    delete: vi.fn(async () => {
      entries.clear();
      return true;
    }),
  };

  beforeEach(() => {
    entries.clear();
    vi.clearAllMocks();
    vi.stubGlobal("caches", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the same bytes after the in-memory caller has gone away", async () => {
    const original = new Blob(["full-resolution-image"], { type: "image/jpeg" });

    expect(await putCloudImageBlob("cache:account:photo:display:r1", original)).toBe(true);
    const cached = await getCloudImageBlob("cache:account:photo:display:r1");

    expect(cached?.type).toBe("image/jpeg");
    expect(await cached?.text()).toBe("full-resolution-image");
    expect(storage.open).toHaveBeenCalledTimes(2);
  });

  it("deletes one rendition or the complete persistent image cache", async () => {
    await putCloudImageBlob("cache:account:photo:display:r1", new Blob(["display"]));
    await deleteCloudImageBlob("cache:account:photo:display:r1");
    expect(await getCloudImageBlob("cache:account:photo:display:r1")).toBeNull();

    await putCloudImageBlob("cache:account:photo:thumbnail:r1", new Blob(["thumbnail"]));
    await clearCloudImageBlobs();
    expect(entries.size).toBe(0);
  });
});
