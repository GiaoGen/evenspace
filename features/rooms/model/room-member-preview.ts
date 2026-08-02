import type { ActorId } from "@/core/domain/ids";
import type { AssetReference } from "@/core/domain/asset";

export interface RoomMemberPreview {
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly initials: string;
  readonly avatarUrl?: string | null;
  readonly avatarAsset?: AssetReference | null;
}

export function getRoomMemberPreviewSlots(
  previews: readonly RoomMemberPreview[],
  memberCount: number,
) {
  const total = Math.max(0, memberCount, previews.length);
  const needsOverflow = total > 5 || previews.length < total;
  const members = previews.slice(0, needsOverflow ? 4 : 5);
  return {
    members,
    overflowCount: Math.max(0, total - members.length),
  };
}
