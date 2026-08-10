import { beforeEach, describe, expect, it, vi } from "vitest";

import { hideRoomAction, setRoomFavoriteAction } from "@/app/rooms/actions";
import {
  RoomPreferenceError,
  setCurrentUserRoomFavorite,
  setCurrentUserRoomHidden,
} from "@/data/supabase/room-preferences";
import { revalidatePath } from "next/cache";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data/supabase/room-preferences", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/supabase/room-preferences")>();
  return {
    ...original,
    setCurrentUserRoomFavorite: vi.fn(),
    setCurrentUserRoomHidden: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setCurrentUserRoomFavorite).mockResolvedValue({
    roomId: "32000000-0000-4000-8000-000000000001",
    isFavorite: true,
  });
  vi.mocked(setCurrentUserRoomHidden).mockResolvedValue({
    roomId: "32000000-0000-4000-8000-000000000001",
    hiddenAt: "2026-08-10T00:00:00Z",
  });
});

describe("Rooms preference actions", () => {
  it("updates favorites and revalidates the collection", async () => {
    const result = await setRoomFavoriteAction({
      roomPublicId: "room_preferences_001",
      isFavorite: true,
    });

    expect(result).toEqual({ status: "ok" });
    expect(setCurrentUserRoomFavorite).toHaveBeenCalledWith({
      roomPublicId: "room_preferences_001",
      isFavorite: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/rooms");
  });

  it("hides a room only from the current collection", async () => {
    const result = await hideRoomAction({ roomPublicId: "room_preferences_001" });

    expect(result).toEqual({ status: "ok" });
    expect(setCurrentUserRoomHidden).toHaveBeenCalledWith({
      roomPublicId: "room_preferences_001",
      hidden: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/rooms");
  });

  it("rejects invalid input before calling the preference layer", async () => {
    await expect(setRoomFavoriteAction({ roomPublicId: "invalid", isFavorite: true }))
      .resolves.toEqual({ status: "error", code: "invalid_input" });
    expect(setCurrentUserRoomFavorite).not.toHaveBeenCalled();
  });

  it("returns a safe error and does not revalidate failed writes", async () => {
    vi.mocked(setCurrentUserRoomHidden).mockRejectedValue(new RoomPreferenceError("forbidden"));

    await expect(hideRoomAction({ roomPublicId: "room_preferences_001" }))
      .resolves.toEqual({ status: "error", code: "forbidden" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
