import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  RoomPreferenceError,
  setCurrentUserRoomFavorite,
  setCurrentUserRoomHidden,
} from "@/data/supabase/room-preferences";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

vi.mock("server-only", () => ({}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe("room preferences", () => {
  it("persists a favorite preference through the scoped RPC", async () => {
    rpc.mockResolvedValue({
      data: [{ room_id: "32000000-0000-4000-8000-000000000001", is_favorite: true }],
      error: null,
    });

    await expect(setCurrentUserRoomFavorite({
      roomPublicId: "room_preferences_001",
      isFavorite: true,
    })).resolves.toMatchObject({ isFavorite: true });
    expect(rpc).toHaveBeenCalledWith("set_current_user_room_favorite", {
      requested_public_id: "room_preferences_001",
      requested_is_favorite: true,
    });
  });

  it("persists personal list visibility without exposing provider details", async () => {
    rpc.mockResolvedValue({
      data: [{ room_id: "32000000-0000-4000-8000-000000000001", hidden_at: "2026-08-10T00:00:00Z" }],
      error: null,
    });

    await expect(setCurrentUserRoomHidden({
      roomPublicId: "room_preferences_001",
      hidden: true,
    })).resolves.toMatchObject({ hiddenAt: "2026-08-10T00:00:00Z" });

    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "provider-secret" } });
    const request = setCurrentUserRoomHidden({ roomPublicId: "room_preferences_001", hidden: true });
    await expect(request).rejects.toEqual(new RoomPreferenceError("unavailable"));
    await expect(request).rejects.not.toThrow("provider-secret");
  });

  it("rejects invalid input before creating a backend client", async () => {
    await expect(setCurrentUserRoomFavorite({
      roomPublicId: "invalid",
      isFavorite: true,
    })).rejects.toMatchObject({ code: "invalid_input" });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("fails closed on an invalid RPC response", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(setCurrentUserRoomHidden({
      roomPublicId: "room_preferences_001",
      hidden: true,
    })).rejects.toMatchObject({ code: "unavailable" });
  });
});
