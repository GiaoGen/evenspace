import { describe, expect, it } from "vitest";

import {
  parseOptionalSupabaseSecret,
  parsePublicSupabaseEnv,
  parseServerSupabaseEnv,
  SupabaseEnvironmentError,
} from "@/data/supabase/env-schema";

const validPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example-key",
};

describe("Supabase environment validation", () => {
  it("parses public browser configuration without a server secret", () => {
    expect(parsePublicSupabaseEnv(validPublicEnv)).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example-key",
    });
  });

  it("rejects insecure URLs and legacy anon keys", () => {
    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "legacy-anon-key",
      }),
    ).toThrow(SupabaseEnvironmentError);
  });

  it("requires a modern secret key for server configuration", () => {
    expect(
      parseServerSupabaseEnv({
        ...validPublicEnv,
        SUPABASE_SECRET_KEY: "sb_secret_example-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example-key",
      secretKey: "sb_secret_example-key",
    });

    expect(() =>
      parseServerSupabaseEnv({
        ...validPublicEnv,
        SUPABASE_SECRET_KEY: "service-role-jwt",
      }),
    ).toThrow(SupabaseEnvironmentError);
  });

  it("allows an absent startup secret but rejects a malformed configured one", () => {
    expect(parseOptionalSupabaseSecret(undefined)).toBeUndefined();
    expect(parseOptionalSupabaseSecret("")).toBeUndefined();
    expect(() => parseOptionalSupabaseSecret("not-a-secret-key")).toThrow(
      SupabaseEnvironmentError,
    );
  });

  it("never includes environment values in validation errors", () => {
    const leakedValue = "do-not-print-this-value";

    expect(() =>
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: leakedValue,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: leakedValue,
      }),
    ).toThrowError(
      expect.not.objectContaining({
        message: expect.stringContaining(leakedValue),
      }),
    );
  });
});
