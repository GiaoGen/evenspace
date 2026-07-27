import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import {
  joinRoomAction,
  resolveInviteCodeAction,
} from "@/app/join/actions";
import {
  joinRoomWithInvite,
  resolveRoomInviteCode,
} from "@/data/supabase/room-invites";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data/supabase/room-invites", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/data/supabase/room-invites")>();
  return {
    ...original,
    joinRoomWithInvite: vi.fn(),
    resolveRoomInviteCode: vi.fn(),
  };
});

beforeEach(() => vi.clearAllMocks());

describe("join actions", () => {
  it("resolves a valid short code without MockSession", async () => {
    vi.mocked(resolveRoomInviteCode).mockResolvedValue({
      room_id: "31000000-0000-4000-8000-000000000010",
      public_id: "room_launch_010",
      name: "Launch",
      description: "",
      ends_at: "2026-07-27T13:00:00Z",
      time_zone: "America/New_York",
      requires_approval: true,
      member_limit: 6,
      member_count: 1,
      invite_revision: 1,
    });

    await expect(resolveInviteCodeAction("join012a")).resolves.toEqual({
      status: "resolved",
      publicId: "room_launch_010",
      code: "JOIN012A",
    });
  });

  it("returns a pending outcome for Host approval rooms", async () => {
    vi.mocked(joinRoomWithInvite).mockResolvedValue({
      outcome: "pending",
      room_id: "31000000-0000-4000-8000-000000000010",
      public_id: "room_launch_010",
      actor_id: "21000000-0000-4000-8000-000000000020",
      request_id: "51000000-0000-4000-8000-000000000010",
    });

    const result = await joinRoomAction({
      publicId: "room_launch_010",
      nickname: "Avery",
      note: "",
      code: "JOIN012A",
    });

    expect(result).toEqual({ status: "pending", publicId: "room_launch_010" });
    expect(revalidatePath).toHaveBeenCalledWith("/rooms");
  });

  it("rejects malformed join input before the backend", async () => {
    const result = await joinRoomAction({
      publicId: "room_launch_010",
      nickname: "",
      note: "",
      code: "bad",
    });

    expect(result).toMatchObject({ status: "error", code: "invalid_input" });
    expect(joinRoomWithInvite).not.toHaveBeenCalled();
  });
});
