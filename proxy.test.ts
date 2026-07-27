import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

describe("Next.js Supabase Proxy matcher", () => {
  it("runs for pages and API routes that can carry auth cookies", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/rooms",
      }),
    ).toBe(true);

    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/api/auth/callback",
      }),
    ).toBe(true);
  });

  it("does not intercept Next.js or public UI assets", () => {
    for (const url of [
      "/_next/static/chunks/app.js",
      "/_next/image?url=%2Fhero.png&w=640&q=75",
      "/favicon.ico",
      "/images/room-cover.webp",
      "/fonts/eventspace.woff2",
    ]) {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          nextConfig: {},
          url,
        }),
      ).toBe(false);
    }
  });
});
