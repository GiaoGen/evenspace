import type { ActorId, RoomId, RoomPublicId } from "@/core/domain/ids";

export type RoomLifecycleStatus =
  | "active"
  | "freezing"
  | "archiving"
  | "archived"
  | "purge_pending";

export interface RoomReadCursor {
  readonly updatedAt: string;
  readonly roomId: RoomId;
}

export interface RoomViewerMembership {
  readonly actorId: ActorId;
  readonly nickname: string;
  readonly role: "host" | "member";
  readonly state: "active" | "muted";
  readonly archiveEligible: boolean;
  readonly isFavorite: boolean;
}

export interface RoomReadModel {
  readonly id: RoomId;
  readonly publicId: RoomPublicId;
  readonly name: string;
  readonly description: string;
  readonly mode: "host-led";
  readonly status: RoomLifecycleStatus;
  readonly timeZone: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly archivedAt: string | null;
  readonly memberLimit: number;
  readonly requiresApproval: boolean;
  readonly memberListVisibility: "members" | "host";
  readonly revision: number;
  readonly updatedAt: string;
  readonly memberCount: number;
  readonly viewer: RoomViewerMembership;
}

export interface RoomReadPage {
  readonly items: readonly RoomReadModel[];
  readonly nextCursor: RoomReadCursor | null;
}

export interface RoomReadRepository {
  listCurrentViewerRooms(input?: {
    readonly limit?: number;
    readonly cursor?: RoomReadCursor;
  }): Promise<RoomReadPage>;

  findCurrentViewerRoom(publicId: RoomPublicId): Promise<RoomReadModel | null>;
}
