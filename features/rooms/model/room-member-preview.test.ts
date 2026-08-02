import { describe, expect, it } from "vitest";

import { actorId } from "@/core/domain/ids";
import { getRoomMemberPreviewSlots, type RoomMemberPreview } from "./room-member-preview";

const members: readonly RoomMemberPreview[] = Array.from({ length: 6 }, (_, index) => ({
  actorId: actorId(`22000000-0000-4000-8000-00000000000${index + 1}`),
  displayName: `Member ${index + 1}`,
  initials: `M${index + 1}`,
}));

describe("room member preview slots", () => {
  it("shows every member when the room fits five slots", () => {
    expect(getRoomMemberPreviewSlots(members.slice(0, 5), 5)).toEqual({
      members: members.slice(0, 5),
      overflowCount: 0,
    });
  });

  it("uses the fifth slot for the remaining member count", () => {
    expect(getRoomMemberPreviewSlots(members.slice(0, 5), 6)).toEqual({
      members: members.slice(0, 4),
      overflowCount: 2,
    });
  });

  it("keeps hidden member identities private while preserving the count", () => {
    expect(getRoomMemberPreviewSlots(members.slice(0, 1), 4)).toEqual({
      members: members.slice(0, 1),
      overflowCount: 3,
    });
  });
});
