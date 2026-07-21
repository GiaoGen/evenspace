import { afterEach, describe, expect, it, vi } from "vitest";
import { createUuid } from "./uuid";

describe("createUuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("works when randomUUID is unavailable in an insecure mobile context", () => {
    vi.stubGlobal("crypto", {
      getRandomValues(bytes: Uint8Array) {
        bytes.forEach((_, index) => { bytes[index] = index + 1; });
        return bytes;
      },
    });

    expect(createUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
