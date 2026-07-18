import type { RoomPublicId } from "@/core/domain/ids";
import type { RoomDetail, RoomSummary, ViewerContext } from "@/core/domain/room";
import { deriveRoomCapabilities } from "@/core/security/room-capabilities";
import type { RoomRepository } from "@/data/contracts/room-repository";
import { getValidatedRoomFixtures } from "./room-fixtures";

function toSummary(room: RoomDetail): RoomSummary {
  return {
    id: room.id,
    publicId: room.publicId,
    name: room.name,
    description: room.description,
    mode: room.mode,
    status: room.status,
    timeZone: room.timeZone,
    endsAt: room.endsAt,
    archivedAt: room.archivedAt,
    memberCount: room.memberCount,
    photoCount: room.photoCount,
    boardPreview: room.boardPreview,
    boardNote: room.boardNote,
    boardBackground: room.boardBackground,
    isFavorite: room.isFavorite,
  };
}

export class MockRoomRepository implements RoomRepository {
  private readonly rooms = getValidatedRoomFixtures();

  async listForViewer(viewer: ViewerContext): Promise<readonly RoomSummary[]> {
    const serverNow = Date.now();
    return this.rooms
      .filter((room) => deriveRoomCapabilities(viewer, room, serverNow).canRead)
      .map(toSummary);
  }

  async findDetailForViewer(publicId: RoomPublicId, viewer: ViewerContext): Promise<RoomDetail | null> {
    const room = this.rooms.find((item) => item.publicId === publicId);
    if (!room || !deriveRoomCapabilities(viewer, room, Date.now()).canRead) return null;
    const membership = viewer.memberships.find((item) => item.roomId === room.id);
    const canSeeMembers = room.memberListVisibility === "members" || membership?.role === "host" || membership?.role === "admin";
    return canSeeMembers ? room : { ...room, members: room.members.filter((member) => member.actorId === viewer.actorId) };
  }
}
