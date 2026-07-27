import { describe, expect, it } from "vitest";

import { actorId, roomId, roomPublicId } from "@/core/domain/ids";
import { presentRoomCollection } from "@/data/room-read-presenter";

const room = {
  id: roomId("32000000-0000-4000-8000-000000000001"),
  publicId: roomPublicId("room_presenter_001"),
  name: "Launch room",
  description: "Team launch",
  mode: "host-led" as const,
  status: "active" as const,
  timeZone: "UTC",
  startsAt: "2026-07-27T10:00:00Z",
  endsAt: "2026-07-27T12:00:00Z",
  archivedAt: null,
  memberLimit: 6,
  requiresApproval: true,
  memberListVisibility: "members" as const,
  revision: 1,
  updatedAt: "2026-07-27T10:30:00Z",
  memberCount: 2,
  viewer: {
    actorId: actorId("22000000-0000-4000-8000-000000000001"),
    nickname: "Host",
    role: "host" as const,
    state: "active" as const,
    archiveEligible: true,
  },
};

describe("room read presenter", () => {
  it("uses honest empty presentation fields until Photos exists", () => {
    const [item] = presentRoomCollection({
      items: [room],
      nextCursor: null,
    });

    expect(item.room).toMatchObject({
      name: "Launch room",
      status: "active",
      memberCount: 2,
      photoCount: 0,
      boardPreview: [],
      isFavorite: false,
    });
    expect(item.boardItems).toEqual([]);
  });

  it("maps non-writable lifecycle states to the existing read-only card state", () => {
    const [item] = presentRoomCollection({
      items: [{ ...room, status: "archiving" as const }],
      nextCursor: null,
    });

    expect(item.room.status).toBe("archived");
    expect(item.room.archivedAt).toBe(room.endsAt);
  });
});
