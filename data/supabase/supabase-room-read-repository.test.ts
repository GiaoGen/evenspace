import { beforeEach, describe, expect, it, vi } from "vitest";

import { roomPublicId } from "@/core/domain/ids";
import {
  RoomReadError,
  SupabaseRoomReadRepository,
} from "@/data/supabase/supabase-room-read-repository";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

vi.mock("server-only", () => ({}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const rpc = vi.fn();
const repository = new SupabaseRoomReadRepository();

const roomRow = {
  room_id: "32000000-0000-4000-8000-000000000001",
  public_id: "room_repository_test",
  name: "Launch room",
  description: "Team launch",
  mode: "host-led",
  status: "active",
  time_zone: "America/New_York",
  starts_at: "2026-07-27T10:00:00+00:00",
  ends_at: "2026-07-27T12:00:00+00:00",
  archived_at: null,
  member_limit: 6,
  requires_approval: true,
  member_list_visibility: "members",
  revision: 1,
  updated_at: "2026-07-27T10:30:00+00:00",
  viewer_actor_id: "22000000-0000-4000-8000-000000000001",
  viewer_nickname: "Host",
  viewer_role: "host",
  viewer_state: "active",
  viewer_archive_eligible: true,
  member_count: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe("SupabaseRoomReadRepository", () => {
  it("maps a current-viewer page and emits a stable keyset cursor", async () => {
    rpc.mockResolvedValue({ data: [roomRow], error: null });

    const result = await repository.listCurrentViewerRooms({ limit: 1 });

    expect(rpc).toHaveBeenCalledWith("list_current_user_rooms", {
      requested_limit: 1,
      requested_cursor_updated_at: undefined,
      requested_cursor_id: undefined,
    });
    expect(result.items[0]).toMatchObject({
      publicId: "room_repository_test",
      memberCount: 2,
      viewer: { role: "host" },
    });
    expect(result.nextCursor).toEqual({
      updatedAt: roomRow.updated_at,
      roomId: roomRow.room_id,
    });
  });

  it("passes both cursor components to the paginated RPC", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await repository.listCurrentViewerRooms({
      limit: 20,
      cursor: {
        updatedAt: roomRow.updated_at,
        roomId: roomRow.room_id as never,
      },
    });

    expect(rpc).toHaveBeenCalledWith("list_current_user_rooms", {
      requested_limit: 20,
      requested_cursor_updated_at: roomRow.updated_at,
      requested_cursor_id: roomRow.room_id,
    });
  });

  it("rejects an invalid page before creating a Supabase client", async () => {
    await expect(
      repository.listCurrentViewerRooms({ limit: 0 }),
    ).rejects.toMatchObject({ code: "invalid_input" });

    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns one readable room and null for an inaccessible room", async () => {
    rpc
      .mockResolvedValueOnce({ data: [roomRow], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const publicId = roomPublicId("room_repository_test");
    const found = await repository.findCurrentViewerRoom(publicId);
    const missing = await repository.findCurrentViewerRoom(publicId);

    expect(found?.viewer.actorId).toBe(roomRow.viewer_actor_id);
    expect(missing).toBeNull();
  });

  it("maps provider errors without exposing provider details", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "provider-secret-detail" },
    });

    const request = repository.listCurrentViewerRooms();
    await expect(request).rejects.toEqual(
      new RoomReadError("read_unavailable"),
    );
    await expect(request).rejects.not.toThrow("provider-secret-detail");
  });

  it("fails closed when the database response shape is invalid", async () => {
    rpc.mockResolvedValue({
      data: [{ ...roomRow, viewer_role: "owner" }],
      error: null,
    });

    await expect(repository.listCurrentViewerRooms()).rejects.toMatchObject({
      code: "read_unavailable",
    });
  });
});
