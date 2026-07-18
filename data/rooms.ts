import "server-only";

import type { RoomPublicId } from "@/core/domain/ids";
import type { RoomCapabilities, RoomDetail, RoomSummary } from "@/core/domain/room";
import { deriveRoomCapabilities } from "@/core/security/room-capabilities";
import { MockRoomRepository } from "@/data/mock/mock-room-repository";
import { assertMockRuntimeAllowed } from "@/data/mock/mock-runtime";
import { mockViewer } from "@/data/mock/room-fixtures";

assertMockRuntimeAllowed();

const repository = new MockRoomRepository();

export interface RoomDetailView {
  readonly room: RoomDetail;
  readonly capabilities: RoomCapabilities;
  readonly viewerActorId: string;
}

export async function listRoomsForCurrentViewer(): Promise<readonly RoomSummary[]> {
  return repository.listForViewer(mockViewer);
}

export async function getRoomForCurrentViewer(publicId: RoomPublicId): Promise<RoomDetailView | null> {
  const room = await repository.findDetailForViewer(publicId, mockViewer);
  if (!room) return null;

  return {
    room,
    capabilities: deriveRoomCapabilities(mockViewer, room, Date.now()),
    viewerActorId: mockViewer.actorId,
  };
}
