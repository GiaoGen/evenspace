import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRoomInvite,
  previewRoomInvite,
  resolveRoomInviteCode,
  RoomInviteError,
} from "@/data/supabase/room-invites";
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

describe("room invite service", () => {
  it("creates an invite and validates the returned row", async () => {
    rpc.mockResolvedValue({
      data: [{
        room_id: "31000000-0000-4000-8000-000000000010",
        public_id: "room_launch_010",
        invite_revision: 1,
      }],
      error: null,
    });

    await expect(createRoomInvite({
      publicId: "room_launch_010",
      token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      code: "JOIN012A",
    })).resolves.toMatchObject({ invite_revision: 1 });
  });

  it("returns null for a valid but inactive invitation", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(previewRoomInvite({
      publicId: "room_launch_010",
      token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    })).resolves.toBeNull();
  });

  it("resolves a global short code", async () => {
    rpc.mockResolvedValue({
      data: [{
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
      }],
      error: null,
    });

    await expect(resolveRoomInviteCode("JOIN012A")).resolves.toMatchObject({
      public_id: "room_launch_010",
    });
  });

  it("rejects malformed secrets before calling Supabase", async () => {
    await expect(resolveRoomInviteCode("short")).rejects.toEqual(
      expect.objectContaining<Partial<RoomInviteError>>({ code: "invalid_input" }),
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
