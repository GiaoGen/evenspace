import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBackendRoomSession } from "@/data/supabase/backend-room-session";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  findCurrentViewerRoom: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/data/supabase/supabase-room-read-repository", () => ({
  SupabaseRoomReadRepository: class {
    findCurrentViewerRoom = mocks.findCurrentViewerRoom;
  },
}));
vi.mock("@/data/supabase/server-client", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

function query(result: unknown) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findCurrentViewerRoom.mockResolvedValue({
    id: "31000000-0000-4000-8000-000000000001",
    publicId: "room_wiring_main",
    name: "Backend room",
    description: "Authoritative room",
    mode: "host-led",
    status: "active",
    timeZone: "America/New_York",
    startsAt: "2026-07-27T10:00:00.000Z",
    endsAt: "2099-07-27T14:00:00.000Z",
    archivedAt: null,
    memberLimit: 8,
    requiresApproval: true,
    memberListVisibility: "members",
    revision: 3,
    updatedAt: "2026-07-27T11:00:00.000Z",
    memberCount: 1,
    viewer: {
      actorId: "21000000-0000-4000-8000-000000000001",
      nickname: "Host User",
      role: "host",
      state: "active",
      archiveEligible: true,
    },
  });
  const rows: Record<string, unknown> = {
    room_members: { data: [{
      actor_id: "21000000-0000-4000-8000-000000000001",
      nickname: "Host User",
      role: "host",
      state: "active",
      archive_eligible: true,
    }], error: null },
    messages: { data: [{
      id: "51000000-0000-4000-8000-000000000001",
      author_actor_id: "21000000-0000-4000-8000-000000000001",
      kind: "text",
      body: "Cloud message",
      asset_id: null,
      reply_to_message_id: null,
      created_at: "2026-07-27T11:05:00.000Z",
      recalled_at: null,
      moderated_at: null,
    }], error: null },
    message_reactions: { data: [], error: null },
    message_pins: { data: null, error: null },
    itineraries: { data: [], error: null },
    photos: { data: [], error: null },
    photo_comments: { data: [], error: null },
    assets: { data: [], error: null },
  };
  mocks.createSupabaseServerClient.mockResolvedValue({
    from: (table: string) => query(rows[table]),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: { getClaims: vi.fn().mockResolvedValue({
      data: { claims: { email: "host@example.com" } },
      error: null,
    }) },
  });
});

describe("getBackendRoomSession", () => {
  it("maps the RLS-protected cloud snapshot into the unchanged RoomExperience contract", async () => {
    const result = await getBackendRoomSession("room_wiring_main" as never);

    expect(result?.room).toMatchObject({
      name: "Backend room",
      messages: [{ body: "Cloud message", isOwn: true }],
      boardItems: [],
      itinerary: [],
    });
    expect(result?.capabilities).toMatchObject({
      canRead: true,
      canChat: true,
      canModerate: true,
      canVote: false,
      canAddBoardItem: true,
    });
    expect(result?.realtimeTopic)
      .toBe("room:31000000-0000-4000-8000-000000000001:events");
  });
});
