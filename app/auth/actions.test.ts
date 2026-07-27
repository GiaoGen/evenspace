import { beforeEach, describe, expect, it, vi } from "vitest";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  requestEmailSignIn,
  signOutCurrentSession,
  type EmailSignInState,
} from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const signInWithOtp = vi.fn();
const signOut = vi.fn();
const initialState: EmailSignInState = {
  status: "idle",
  message: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue(
    new Headers({
      host: "eventspace.example",
      origin: "https://eventspace.example",
    }) as never,
  );
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { signInWithOtp, signOut },
  } as never);
  signInWithOtp.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
});

function emailForm(email: string, next = "/rooms") {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("next", next);
  return formData;
}

describe("Supabase auth Server Actions", () => {
  it("starts an email PKCE flow using a verified same-origin callback", async () => {
    const result = await requestEmailSignIn(
      initialState,
      emailForm("person@example.com", "/rooms/room-1"),
    );

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "person@example.com",
      options: {
        emailRedirectTo:
          "https://eventspace.example/auth/callback?next=%2Frooms%2Froom-1",
        shouldCreateUser: true,
      },
    });
    expect(result.status).toBe("sent");
  });

  it("supports local Server Actions that omit the Origin header", async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: "localhost:3107",
        referer: "http://localhost:3107/login",
        "x-forwarded-proto": "http",
      }) as never,
    );

    const result = await requestEmailSignIn(
      initialState,
      emailForm("person@example.com"),
    );

    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo:
            "http://localhost:3107/auth/callback?next=%2Frooms",
        }),
      }),
    );
    expect(result.status).toBe("sent");
  });

  it("rejects invalid input and redirects without contacting Supabase", async () => {
    const invalidEmail = await requestEmailSignIn(
      initialState,
      emailForm("not-an-email"),
    );
    const invalidRedirect = await requestEmailSignIn(
      initialState,
      emailForm("person@example.com", "https://attacker.example"),
    );

    expect(invalidEmail.status).toBe("error");
    expect(invalidRedirect.status).toBe("error");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("does not expose provider errors to callers", async () => {
    signInWithOtp.mockResolvedValue({
      error: new Error("provider-secret-detail"),
    });

    const result = await requestEmailSignIn(
      initialState,
      emailForm("person@example.com"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Unable to send a sign-in email. Please try again.",
    });
    expect(result.message).not.toContain("provider-secret-detail");
  });

  it("signs out only the current session and returns home", async () => {
    await signOutCurrentSession();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
