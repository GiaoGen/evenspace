import { afterEach, describe, expect, it, vi } from "vitest";

import { createBrowserClient } from "@supabase/ssr";
import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ kind: "browser-client" })),
}));

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

afterEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
});

describe("Supabase browser client", () => {
  it("uses only the public project URL and publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_example-key";

    const client = createSupabaseBrowserClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_example-key",
    );
    expect(client).toEqual({ kind: "browser-client" });
  });
});
