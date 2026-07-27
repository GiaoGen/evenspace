import type { RoomSummary } from "@/core/domain/room";
import type {
  RoomReadModel,
  RoomReadPage,
} from "@/data/contracts/room-read-repository";
import type { RoomCollectionItem } from "@/features/rooms/model/room-collection";

const backgrounds: readonly RoomSummary["boardBackground"][] = [
  "stone",
  "linen",
  "clover",
  "bluebell",
];

function backgroundFor(room: RoomReadModel) {
  const seed = [...room.id].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return backgrounds[seed % backgrounds.length];
}

export function presentRoomSummary(room: RoomReadModel): RoomSummary {
  const active = room.status === "active";

  return {
    id: room.id,
    publicId: room.publicId,
    name: room.name,
    description: room.description,
    mode: room.mode,
    status: active ? "active" : "archived",
    timeZone: room.timeZone,
    endsAt: room.endsAt,
    archivedAt: active ? null : room.archivedAt ?? room.endsAt,
    memberCount: room.memberCount,
    photoCount: 0,
    boardPreview: [],
    boardNote: "",
    boardBackground: backgroundFor(room),
    isFavorite: false,
  };
}

export function presentRoomCollection(
  page: RoomReadPage,
): readonly RoomCollectionItem[] {
  return page.items.map((room) => ({
    room: presentRoomSummary(room),
    boardItems: [],
  }));
}
