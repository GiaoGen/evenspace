import type { RoomPublicId } from "@/core/domain/ids";
import type { RoomDetail, RoomSummary, ViewerContext } from "@/core/domain/room";

export interface RoomRepository {
  listForViewer(viewer: ViewerContext): Promise<readonly RoomSummary[]>;
  findDetailForViewer(publicId: RoomPublicId, viewer: ViewerContext): Promise<RoomDetail | null>;
}
