import { roomId, roomPublicId } from "@/core/domain/ids";
import { createCompactId, createUuid } from "@/core/domain/uuid";
import { createRoomFromDraft, type MockViewer } from "@/features/mock-session/model/mock-session";
import type { CreateRoomDraft } from "../model/create-room-machine";

export function createLocalRoom(draft: CreateRoomDraft, viewer: MockViewer, nowIso: string) {
  const publicId = roomPublicId(`room_${createCompactId(12)}`);
  return {
    publicId,
    room: createRoomFromDraft(draft, viewer, { id: roomId(createUuid()), publicId }, nowIso),
  };
}
