import "server-only";

import type { AssetReference } from "@/core/domain/asset";
import { avatarTextFor, type AvatarVariant } from "@/core/domain/avatar";
import { parseActorId } from "@/core/domain/ids";
import type { RoomReadPage } from "@/data/contracts/room-read-repository";
import { getMediaAssetRows } from "@/data/supabase/media-variant-compat";
import { createSignedMediaUrls } from "@/data/supabase/signed-media-urls";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import type { RoomMemberPreview } from "@/features/rooms/model/room-member-preview";

function avatarVariant(value: string): AvatarVariant {
  return value === "single" || value === "ring" ? value : "initials";
}

/** Reads every card's permitted member preview in one RLS-protected batch. */
export async function getRoomCardMembers(
  page: RoomReadPage,
): Promise<ReadonlyMap<string, readonly RoomMemberPreview[]>> {
  const roomIds = page.items.map((room) => room.id);
  if (roomIds.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_members")
    .select("room_id,actor_id,nickname,role,state,joined_at,avatar_variant,avatar_asset_id")
    .in("room_id", roomIds)
    .in("state", ["active", "muted"])
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });
  if (error) throw new Error("Room card members unavailable");

  const rows = data ?? [];
  const assetIds = [...new Set(rows.flatMap((member) => member.avatar_asset_id ? [member.avatar_asset_id] : []))];
  const assetsResult = assetIds.length
    ? await getMediaAssetRows(supabase, assetIds)
    : { data: [], error: null };
  const readyAssets = (assetsResult.data ?? []).filter((asset) => asset.status === "ready" && asset.object_key);
  const signedUrls = await createSignedMediaUrls(supabase, readyAssets);
  const avatarUrls = new Map(readyAssets.flatMap((asset) => {
    const url = signedUrls.thumbnail.get(asset.id) ?? signedUrls.display.get(asset.id);
    return url ? [[asset.id, url] as const] : [];
  }));
  const avatarAssets = new Map(readyAssets.flatMap((asset) => {
    if (!asset.mime_type || asset.byte_size === null) return [];
    const displayUrl = signedUrls.display.get(asset.id);
    if (!displayUrl) return [];
    const reference: AssetReference = {
      id: asset.id,
      kind: "image",
      mimeType: asset.mime_type,
      byteSize: asset.byte_size,
      remoteUrl: displayUrl,
      ...(asset.thumbnail_object_key && asset.thumbnail_byte_size !== null
        ? {
          thumbnail: {
            id: asset.id,
            mimeType: "image/jpeg",
            byteSize: asset.thumbnail_byte_size,
            remoteUrl: signedUrls.thumbnail.get(asset.id) ?? displayUrl,
          },
        }
        : {}),
      ...(asset.placeholder_data_url ? { placeholderDataUrl: asset.placeholder_data_url } : {}),
      ...(asset.image_width && asset.image_height
        ? { width: asset.image_width, height: asset.image_height, revision: asset.media_revision }
        : { revision: asset.media_revision }),
    };
    return [[asset.id, reference] as const];
  }));

  const result = new Map<string, readonly RoomMemberPreview[]>();
  page.items.forEach((room) => {
    const visibleMembers = rows
      .filter((member) => member.room_id === room.id)
      .flatMap((member) => {
        const actorId = parseActorId(member.actor_id);
        if (!actorId) return [];
        return [{
          actorId,
          displayName: member.nickname,
          initials: avatarTextFor(member.nickname, avatarVariant(member.avatar_variant)),
          avatarUrl: member.avatar_asset_id ? avatarUrls.get(member.avatar_asset_id) ?? null : null,
          avatarAsset: member.avatar_asset_id ? avatarAssets.get(member.avatar_asset_id) ?? null : null,
        } satisfies RoomMemberPreview];
      })
      .slice(0, 5);

    if (visibleMembers.length > 0) {
      result.set(room.id, visibleMembers);
      return;
    }

    result.set(room.id, [{
      actorId: room.viewer.actorId,
      displayName: room.viewer.nickname,
      initials: avatarTextFor(room.viewer.nickname),
      avatarUrl: null,
    }]);
  });
  return result;
}
