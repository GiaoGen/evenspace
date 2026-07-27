import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { GET } from "@/app/auth/callback/route";

vi.mock("server-only", () => ({}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();
const signOut = vi.fn();
const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { exchangeCodeForSession, getUser, signOut },
    rpc,
  } as never);
  exchangeCodeForSession.mockResolvedValue({ error: null });
  getUser.mockResolvedValue({
    data: {
      user: {
        id: "11000000-0000-4000-8000-000000000001",
        email: "event.host@example.com",
      },
    },
    error: null,
  });
  rpc.mockResolvedValue({ data: [], error: null });
  signOut.mockResolvedValue({ error: null });
});

describe("Supabase PKCE callback", () => {
  it("exchanges the code and redirects to an allowed destination", async () => {
    const response = await GET(
      new NextRequest(
        "https://eventspace.example/auth/callback?code=pkce-code&next=%2Frooms%2Froom-1",
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(rpc).toHaveBeenCalledWith("bootstrap_identity", {
      requested_display_name: "event host",
      requested_theme: "system",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://eventspace.example/rooms/room-1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects missing codes and external redirects before token exchange", async () => {
    for (const url of [
      "https://eventspace.example/auth/callback?next=%2Frooms",
      "https://eventspace.example/auth/callback?code=pkce-code&next=https%3A%2F%2Fattacker.example",
    ]) {
      const response = await GET(new NextRequest(url));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Unable to complete sign-in.",
      });
    }

    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("returns a generic error without leaking provider details", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: new Error("provider-secret-detail"),
    });

    const response = await GET(
      new NextRequest(
        "https://eventspace.example/auth/callback?code=bad-code&next=%2Frooms",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).toContain("Unable to complete sign-in.");
    expect(body).not.toContain("provider-secret-detail");
    expect(body).not.toContain("bad-code");
  });

  it("fails closed and clears the session when identity bootstrap fails", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: new Error("database-secret-detail"),
    });

    const response = await GET(
      new NextRequest(
        "https://eventspace.example/auth/callback?code=pkce-code&next=%2Frooms",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(body).not.toContain("database-secret-detail");
  });
});
