import "server-only";

import type { AssetReference } from "@/core/domain/asset";
import { parseActorId } from "@/core/domain/ids";
import type { BoardItem, BoardPhoto } from "@/core/domain/room";
import type { RoomReadPage } from "@/data/contracts/room-read-repository";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

export interface RoomCardMedia {
  readonly photoCount: number;
  readonly boardItems: readonly BoardItem[];
}

/**
 * Fetches the small, private media projection needed by the existing Rooms
 * cards. The card UI remains unchanged; only signed, room-authorized previews
 * are supplied to it.
 */
export async function getRoomCardMedia(
  page: RoomReadPage,
): Promise<ReadonlyMap<string, RoomCardMedia>> {
  const roomIds = page.items.map((room) => room.id);
  if (roomIds.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data: photoRows, error: photosError } = await supabase
    .from("photos")
    .select("id,room_id,asset_id,owner_actor_id,original_name,aspect_ratio,note,created_at")
    .in("room_id", roomIds)
    .order("created_at", { ascending: false });
  if (photosError) throw new Error("Room card photos unavailable");

  const photos = photoRows ?? [];
  const assetIds = [...new Set(photos.map((photo) => photo.asset_id))];
  const { data: assetRows, error: assetsError } = assetIds.length === 0
    ? { data: [], error: null }
    : await supabase.from("assets")
      .select("id,kind,status,object_key,mime_type,byte_size")
      .in("id", assetIds);
  if (assetsError) throw new Error("Room card media unavailable");

  const readyAssets = (assetRows ?? []).filter((asset) =>
    asset.kind === "image" && asset.status === "ready" && asset.object_key
      && asset.mime_type && asset.byte_size !== null,
  );
  const signedUrls = new Map<string, string>();
  await Promise.all(readyAssets.map(async (asset) => {
    const { data } = await supabase.storage
      .from("room-media")
      .createSignedUrl(asset.object_key!, 60 * 30);
    if (data?.signedUrl) signedUrls.set(asset.id, data.signedUrl);
  }));
  const assetsById = new Map(readyAssets.map((asset) => [asset.id, asset]));

  const media = new Map<string, RoomCardMedia>();
  for (const roomId of roomIds) {
    const roomPhotos = photos.filter((photo) => photo.room_id === roomId);
    const boardItems: BoardPhoto[] = roomPhotos.slice(0, 5).flatMap((photo, index) => {
      const ownerActorId = parseActorId(photo.owner_actor_id);
      const asset = assetsById.get(photo.asset_id);
      const remoteUrl = signedUrls.get(photo.asset_id);
      if (!ownerActorId || !asset || !remoteUrl) return [];
      const assetReference: AssetReference = {
        id: asset.id,
        kind: "image",
        mimeType: asset.mime_type!,
        byteSize: asset.byte_size!,
        remoteUrl,
      };
      return [{
        id: photo.id,
        kind: "photo" as const,
        ownerActorId,
        variant: (["one", "two", "three", "four"] as const)[index % 4],
        asset: assetReference,
        imageName: photo.original_name,
        aspectRatio: photo.aspect_ratio,
        note: photo.note,
        x: 0,
        y: 0,
        rotation: 0,
        width: 24,
      }];
    });
    media.set(roomId, { photoCount: roomPhotos.length, boardItems });
  }
  return media;
}
