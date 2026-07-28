import { beforeEach, describe, expect, it, vi } from "vitest";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  signInWithEmailPassword,
  signOutCurrentSession,
  signUpWithEmailPassword,
  type AuthActionState,
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

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signOut = vi.fn();
const rpc = vi.fn();
const initialState: AuthActionState = {
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
    auth: { signInWithPassword, signUp, signOut },
    rpc,
  } as never);
  signInWithPassword.mockResolvedValue({ error: null });
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  signOut.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: [], error: null });
});

function authForm(
  email: string,
  password = "correct-horse-battery",
  next = "/rooms",
) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  formData.set("next", next);
  return formData;
}

function signUpForm(
  email: string,
  password = "correct-horse-battery",
  confirmPassword = password,
  next = "/rooms",
) {
  const formData = authForm(email, password, next);
  formData.set("confirmPassword", confirmPassword);
  return formData;
}

describe("Supabase auth Server Actions", () => {
  it("signs in with email and password, bootstraps identity, and redirects", async () => {
    const result = await signInWithEmailPassword(
      initialState,
      authForm("person@example.com", "correct-horse-battery", "/rooms/room-1"),
    );

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "correct-horse-battery",
    });
    expect(rpc).toHaveBeenCalledWith("bootstrap_identity", {
      requested_display_name: "person",
      requested_theme: "system",
    });
    expect(redirect).toHaveBeenCalledWith("/rooms/room-1");
    expect(result).toBeUndefined();
  });

  it("returns a generic login error for invalid credentials", async () => {
    signInWithPassword.mockResolvedValue({
      error: new Error("provider-secret-detail"),
    });

    const result = await signInWithEmailPassword(
      initialState,
      authForm("person@example.com"),
    );

    expect(result).toEqual({
      status: "error",
      message: "The email or password is incorrect.",
    });
    expect(result.message).not.toContain("provider-secret-detail");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("starts a registration flow using a verified same-origin callback", async () => {
    const result = await signUpWithEmailPassword(
      initialState,
      signUpForm("person@example.com", "correct-horse-battery", undefined, "/rooms/room-1"),
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "correct-horse-battery",
      options: {
        emailRedirectTo:
          "https://eventspace.example/auth/callback?next=%2Frooms%2Froom-1",
      },
    });
    expect(result).toEqual({
      status: "sent",
      message: "Check your email for the verification link, then sign in.",
    });
  });

  it("supports local registration when Server Actions omit the Origin header", async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: "localhost:3107",
        referer: "http://localhost:3107/login?mode=signup",
        "x-forwarded-proto": "http",
      }) as never,
    );

    const result = await signUpWithEmailPassword(
      initialState,
      signUpForm("person@example.com"),
    );

    expect(signUp).toHaveBeenCalledWith(
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
    const invalidEmail = await signInWithEmailPassword(
      initialState,
      authForm("not-an-email"),
    );
    const invalidRedirect = await signUpWithEmailPassword(
      initialState,
      signUpForm("person@example.com", "correct-horse-battery", "correct-horse-battery", "https://attacker.example"),
    );
    const mismatchedPassword = await signUpWithEmailPassword(
      initialState,
      signUpForm("person@example.com", "correct-horse-battery", "not-the-same"),
    );

    expect(invalidEmail.status).toBe("error");
    expect(invalidRedirect.status).toBe("error");
    expect(mismatchedPassword.status).toBe("error");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("does not expose registration provider errors to callers", async () => {
    signUp.mockResolvedValue({
      data: null,
      error: new Error("provider-secret-detail"),
    });

    const result = await signUpWithEmailPassword(
      initialState,
      signUpForm("person@example.com"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Unable to create this account. Please try again.",
    });
    expect(result.message).not.toContain("provider-secret-detail");
  });

  it("signs out only the current session and returns home", async () => {
    await signOutCurrentSession();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
