import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidatePath } from "next/cache";
import { createRoomAction } from "@/app/rooms/new/actions";
import { createHostLedRoom } from "@/data/supabase/room-commands";
import { createRoomInvite } from "@/data/supabase/room-invites";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/data/supabase/room-commands", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/data/supabase/room-commands")>();
  return { ...original, createHostLedRoom: vi.fn() };
});
vi.mock("@/data/supabase/room-invites", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/data/supabase/room-invites")>();
  return { ...original, createRoomInvite: vi.fn() };
});
const repositoryMocks = vi.hoisted(() => ({
  findCurrentViewerRoom: vi.fn(),
}));
vi.mock("@/data/supabase/supabase-room-read-repository", () => ({
  SupabaseRoomReadRepository: class {
    findCurrentViewerRoom = repositoryMocks.findCurrentViewerRoom;
  },
}));

const findCurrentViewerRoom = repositoryMocks.findCurrentViewerRoom;
const input = {
  name: "Launch room",
  description: "Team launch",
  durationMinutes: 180,
  memberLimit: 6,
  timeZone: "America/New_York",
  idempotencyKey: "41000000-0000-4000-8000-000000000010",
  acceptedTerms: true,
  inviteToken: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  inviteCode: "JOIN012A",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createHostLedRoom).mockResolvedValue({
    room_id: "31000000-0000-4000-8000-000000000010",
    public_id: "room_launch_010",
    actor_id: "21000000-0000-4000-8000-000000000010",
    created: true,
  });
  findCurrentViewerRoom.mockResolvedValue({
    id: "31000000-0000-4000-8000-000000000010",
    publicId: "room_launch_010",
    name: "Launch room",
    startsAt: "2026-07-27T10:00:00Z",
    endsAt: "2026-07-27T13:00:00Z",
  });
  vi.mocked(createRoomInvite).mockResolvedValue({
    room_id: "31000000-0000-4000-8000-000000000010",
    public_id: "room_launch_010",
    invite_revision: 1,
  });
});

describe("createRoomAction", () => {
  it("creates through the transaction command and returns authoritative data", async () => {
    const result = await createRoomAction(input);

    expect(createHostLedRoom).toHaveBeenCalledWith({
      name: "Launch room",
      description: "Team launch",
      durationMinutes: 180,
      memberLimit: 6,
      timeZone: "America/New_York",
      requiresApproval: true,
      idempotencyKey: input.idempotencyKey,
    });
    expect(result).toMatchObject({
      status: "created",
      room: {
        publicId: "room_launch_010",
        inviteCode: "JOIN012A",
        inviteRevision: 1,
      },
    });
    expect(createRoomInvite).toHaveBeenCalledWith({
      publicId: "room_launch_010",
      token: input.inviteToken,
      code: input.inviteCode,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/rooms");
  });

  it("rejects missing legal confirmation before contacting the backend", async () => {
    const result = await createRoomAction({ ...input, acceptedTerms: false });

    expect(result).toMatchObject({ status: "error", code: "invalid_input" });
    expect(createHostLedRoom).not.toHaveBeenCalled();
  });

  it("fails closed when the committed room cannot be read back", async () => {
    findCurrentViewerRoom.mockResolvedValue(null);

    const result = await createRoomAction(input);

    expect(result).toMatchObject({ status: "error", code: "unavailable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
