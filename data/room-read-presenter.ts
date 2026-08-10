import type { RoomSummary } from "@/core/domain/room";
import type {
  RoomReadModel,
  RoomReadPage,
} from "@/data/contracts/room-read-repository";
import type { RoomCollectionItem } from "@/features/rooms/model/room-collection";
import type { RoomCardMedia } from "@/data/supabase/room-card-media";
import type { RoomMemberPreview } from "@/features/rooms/model/room-member-preview";

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

export function presentRoomSummary(room: RoomReadModel, media?: RoomCardMedia): RoomSummary {
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
    photoCount: media?.photoCount ?? 0,
    boardPreview: media?.boardItems.filter((item) => item.kind === "photo").map((item) => item.variant) ?? [],
    boardNote: "",
    boardBackground: backgroundFor(room),
    isFavorite: room.viewer.isFavorite,
  };
}

export function presentRoomCollection(
  page: RoomReadPage,
  mediaByRoom: ReadonlyMap<string, RoomCardMedia> = new Map(),
  membersByRoom: ReadonlyMap<string, readonly RoomMemberPreview[]> = new Map(),
): readonly RoomCollectionItem[] {
  return page.items.map((room) => ({
    room: presentRoomSummary(room, mediaByRoom.get(room.id)),
    boardItems: mediaByRoom.get(room.id)?.boardItems ?? [],
    memberPreviews: membersByRoom.get(room.id) ?? [],
  }));
}
