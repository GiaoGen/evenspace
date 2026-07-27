import { describe, expect, it } from "vitest";

describe("Supabase server-only boundary", () => {
  it("rejects loading the server secret module outside the Next.js server graph", async () => {
    await expect(import("@/data/supabase/env-server")).rejects.toThrow(
      /server-only|Client Component/i,
    );
  });

  it("rejects loading the admin client outside the Next.js server graph", async () => {
    await expect(import("@/data/supabase/admin-client")).rejects.toThrow(
      /server-only|Client Component/i,
    );
  });

  it("rejects loading the request client outside the Next.js server graph", async () => {
    await expect(import("@/data/supabase/server-client")).rejects.toThrow(
      /server-only|Client Component/i,
    );
  });

  it("rejects loading room commands outside the Next.js server graph", async () => {
    await expect(import("@/data/supabase/room-commands")).rejects.toThrow(
      /server-only|Client Component/i,
    );
  });

  it("rejects loading the Supabase room repository outside the server graph", async () => {
    await expect(
      import("@/data/supabase/supabase-room-read-repository"),
    ).rejects.toThrow(/server-only|Client Component/i);
  });
});
