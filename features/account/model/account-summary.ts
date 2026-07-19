import type { MockSession } from "@/features/mock-session/model/mock-session";

export interface AccountSummary {
  readonly activeRooms: number;
  readonly memories: number;
  readonly boardItems: number;
  readonly storedRooms: number;
}

function hasActiveMembership(session: MockSession, roomIndex: number) {
  const room = session.rooms[roomIndex];
  const membership = room.membershipStates[session.viewer.actorId];
  return room.members.some((member) => member.actorId === session.viewer.actorId)
    && membership !== "removed"
    && membership !== "banned";
}

export function getAccountSummary(session: MockSession): AccountSummary {
  const visibleRooms = session.rooms.filter((_, index) => hasActiveMembership(session, index));
  return {
    activeRooms: visibleRooms.filter((room) => room.lifecycle === "active").length,
    memories: visibleRooms.filter((room) => room.lifecycle === "archived" && room.archiveActorIds.includes(session.viewer.actorId) && !room.archiveRemovedBy.includes(session.viewer.actorId)).length,
    boardItems: visibleRooms.reduce((total, room) => total + room.boardItems.length, 0),
    storedRooms: visibleRooms.length,
  };
}

export function isDisplayNameAvailable(session: MockSession, displayName: string) {
  const normalized = displayName.trim().toLocaleLowerCase();
  if (!normalized) return false;
  return !session.rooms.some((room) => room.lifecycle === "active" && room.members.some((member) => {
    const membership = room.membershipStates[member.actorId];
    return member.actorId !== session.viewer.actorId
      && membership !== "removed"
      && membership !== "banned"
      && member.displayName.toLocaleLowerCase() === normalized;
  }));
}
