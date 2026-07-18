import type { RoomCapabilities, RoomStatus, ViewerContext } from "@/core/domain/room";
import type { RoomId } from "@/core/domain/ids";

const DENIED: RoomCapabilities = {
  canRead: false,
  canChat: false,
  canVote: false,
  canAddBoardItem: false,
  canCreateItinerary: false,
  canModerate: false,
  canChangeDuration: false,
  canEndRoom: false,
};

export function deriveRoomCapabilities(
  viewer: ViewerContext,
  room: { readonly id: RoomId; readonly status: RoomStatus; readonly endsAt: string | null },
  serverNow: number,
): RoomCapabilities {
  const membership = viewer.memberships.find((item) => item.roomId === room.id);
  if (!membership || membership.state === "removed") return DENIED;

  const hasNotExpired = room.endsAt !== null && Number.isFinite(Date.parse(room.endsAt)) && Date.parse(room.endsAt) > serverNow;
  const isWritable = room.status === "active" && hasNotExpired;
  const isSignedIn = viewer.authState === "signed-in";
  const isHost = membership.role === "host";
  const isAdmin = membership.role === "admin";
  const canRead = room.status === "active" || (membership.archiveEligible && isSignedIn);

  return {
    canRead,
    canChat: canRead && isWritable && membership.state !== "muted",
    canVote: canRead && isWritable && isSignedIn,
    canAddBoardItem: canRead && isWritable && isSignedIn && membership.state !== "muted",
    canCreateItinerary: canRead && isWritable && (isHost || isAdmin),
    canModerate: canRead && isWritable && (isHost || isAdmin),
    canChangeDuration: canRead && isWritable && isHost,
    canEndRoom: canRead && isWritable && isHost,
  };
}
