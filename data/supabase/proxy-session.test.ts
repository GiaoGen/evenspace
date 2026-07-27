import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createServerClient } from "@supabase/ssr";
import { refreshSupabaseAuth } from "@/data/supabase/proxy-session";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_example-key";
});

afterEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
});

describe("Supabase Proxy session refresh", () => {
  it("forwards refreshed cookies and anti-cache headers", async () => {
    const getClaims = vi.fn().mockResolvedValue({
      data: { claims: null },
      error: null,
    });

    vi.mocked(createServerClient).mockImplementation(
      (_url, _key, options) => {
        options.cookies.setAll?.(
          [
            {
              name: "sb-example-auth-token",
              value: "refreshed",
              options: {
                httpOnly: false,
                path: "/",
                sameSite: "lax",
                secure: true,
              },
            },
          ],
          {
            "Cache-Control":
              "private, no-cache, no-store, must-revalidate, max-age=0",
            Expires: "0",
            Pragma: "no-cache",
          },
        );

        return { auth: { getClaims } } as never;
      },
    );

    const request = new NextRequest("https://eventspace.example/rooms");
    const response = await refreshSupabaseAuth(request);

    expect(getClaims).toHaveBeenCalledOnce();
    expect(request.cookies.get("sb-example-auth-token")?.value).toBe(
      "refreshed",
    );
    expect(response.cookies.get("sb-example-auth-token")?.value).toBe(
      "refreshed",
    );
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
