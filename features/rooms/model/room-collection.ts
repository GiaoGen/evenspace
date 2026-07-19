import type { BoardItem, RoomStatus, RoomSummary } from "@/core/domain/room";
import { selectVisibleRooms, toRoomSummary, type MockSession } from "@/features/mock-session/model/mock-session";

export type RoomFilter = "all" | RoomStatus | "favorite";

export interface RoomCollectionItem {
  readonly room: RoomSummary;
  readonly boardItems: readonly BoardItem[];
}

export const roomFilterLabels: Record<RoomFilter, string> = {
  all: "All rooms",
  active: "Active",
  archived: "Achieved",
  favorite: "Favorites",
};

export const roomFilterOptions: readonly RoomFilter[] = ["all", "active", "archived", "favorite"];

function getDisplayRoom(room: RoomSummary, nowIso: string): RoomSummary {
  const expired = room.status === "active"
    && room.endsAt !== null
    && Number.isFinite(Date.parse(room.endsAt))
    && Date.parse(room.endsAt) <= Date.parse(nowIso);
  return expired ? { ...room, status: "archived", archivedAt: room.endsAt } : room;
}

export function getRoomCollection(session: MockSession, nowIso: string): readonly RoomCollectionItem[] {
  return selectVisibleRooms(session, nowIso).map((room) => ({
    room: getDisplayRoom(toRoomSummary(room), nowIso),
    boardItems: room.boardItems,
  }));
}

export function getRoomFilterCounts(items: readonly RoomCollectionItem[]): Record<RoomFilter, number> {
  return {
    all: items.length,
    active: items.filter((item) => item.room.status === "active").length,
    archived: items.filter((item) => item.room.status === "archived").length,
    favorite: items.filter((item) => item.room.isFavorite).length,
  };
}

export function filterRoomCollection(items: readonly RoomCollectionItem[], filter: RoomFilter, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items
    .filter((item) => (filter === "all" || filter === "favorite" && item.room.isFavorite || item.room.status === filter)
      && item.room.name.toLocaleLowerCase().includes(normalizedQuery))
    .sort((left, right) => Number(right.room.status === "active") - Number(left.room.status === "active"));
}
