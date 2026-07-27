import { describe, expect, it } from "vitest";

import {
  createAuthCallbackUrl,
  parseAuthDestination,
  parseTrustedRequestOrigin,
} from "@/data/supabase/auth-redirect";

describe("Supabase auth redirects", () => {
  it("uses the rooms page as the default destination", () => {
    expect(parseAuthDestination(null)).toEqual({
      ok: true,
      path: "/rooms",
    });
  });

  it("allows known internal destinations with query parameters", () => {
    expect(parseAuthDestination("/join/ROOM42?from=invite")).toEqual({
      ok: true,
      path: "/join/ROOM42?from=invite",
    });
  });

  it.each([
    "https://attacker.example",
    "//attacker.example/rooms",
    "/auth/callback",
    "/admin",
    "/rooms\\@attacker.example",
    " /rooms",
  ])("rejects an unsafe destination: %s", (destination) => {
    expect(parseAuthDestination(destination)).toEqual({ ok: false });
  });

  it("accepts matching HTTPS and local development origins", () => {
    expect(
      parseTrustedRequestOrigin(
        "https://eventspace.example",
        "eventspace.example",
      ),
    ).toBe("https://eventspace.example");
    expect(
      parseTrustedRequestOrigin("http://localhost:3000", "localhost:3000"),
    ).toBe("http://localhost:3000");
  });

  it("uses a same-host referer when a Server Action omits Origin", () => {
    expect(
      parseTrustedRequestOrigin(
        null,
        "localhost:3107",
        "http",
        "http://localhost:3107/login?next=%2Frooms",
      ),
    ).toBe("http://localhost:3107");
  });

  it("derives a safe callback origin when both Origin and Referer are absent", () => {
    expect(
      parseTrustedRequestOrigin(null, "localhost:3107", "http"),
    ).toBe("http://localhost:3107");
    expect(
      parseTrustedRequestOrigin(null, "eventspace.example", "https"),
    ).toBe("https://eventspace.example");
  });

  it("rejects mismatched, insecure, and forwarded host lists", () => {
    expect(
      parseTrustedRequestOrigin(
        "https://attacker.example",
        "eventspace.example",
      ),
    ).toBeNull();
    expect(
      parseTrustedRequestOrigin(
        "http://eventspace.example",
        "eventspace.example",
      ),
    ).toBeNull();
    expect(
      parseTrustedRequestOrigin(
        "https://eventspace.example",
        "eventspace.example, proxy.internal",
      ),
    ).toBeNull();
    expect(
      parseTrustedRequestOrigin(
        null,
        "eventspace.example",
        "http",
        "http://eventspace.example/login",
      ),
    ).toBeNull();
  });

  it("builds a callback URL without string concatenation", () => {
    expect(
      createAuthCallbackUrl(
        "https://eventspace.example",
        "/rooms/example?tab=chat",
      ),
    ).toBe(
      "https://eventspace.example/auth/callback?next=%2Frooms%2Fexample%3Ftab%3Dchat",
    );
  });
});
