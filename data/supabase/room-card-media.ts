import "server-only";

import type { AssetReference } from "@/core/domain/asset";
import { parseActorId } from "@/core/domain/ids";
import type { BoardItem, BoardPhoto } from "@/core/domain/room";
import type { RoomReadPage } from "@/data/contracts/room-read-repository";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { createSignedMediaUrls } from "@/data/supabase/signed-media-urls";

export interface RoomCardMedia {
  readonly photoCount: number;
  readonly boardItems: readonly BoardItem[];
}

interface RoomCardMediaRow {
  readonly photo_id: string;
  readonly room_id: string;
  readonly asset_id: string;
  readonly owner_actor_id: string;
  readonly original_name: string;
  readonly aspect_ratio: number;
  readonly note: string | null;
  readonly photo_count: number;
  readonly kind: string;
  readonly status: string;
  readonly object_key: string;
  readonly mime_type: string;
  readonly byte_size: number;
  readonly thumbnail_object_key: string | null;
  readonly thumbnail_byte_size: number | null;
  readonly placeholder_data_url: string | null;
  readonly image_width: number | null;
  readonly image_height: number | null;
  readonly media_revision: number;
}

function roomMediaRpc<T>(
  client: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  name: string,
  args: Record<string, unknown>,
) {
  return (client.rpc as unknown as (
    rpcName: string,
    rpcArgs: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: { message: string } | null }>)(name, args);
}

/**
 * Fetches the complete private photo projection for Rooms cards. The client
 * keeps the rendered stack bounded while retaining every signed,
 * room-authorized thumbnail for finite swipe navigation.
 */
export async function getRoomCardMedia(
  page: RoomReadPage,
): Promise<ReadonlyMap<string, RoomCardMedia>> {
  const roomIds = page.items.map((room) => room.id);
  if (roomIds.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await roomMediaRpc<readonly RoomCardMediaRow[]>(supabase, "list_room_card_media", {
    requested_room_ids: roomIds,
  });
  if (error) throw new Error("Room card media unavailable");
  const rows = data ?? [];
  // Room cards only ever render thumbnails. For modern media, avoid also
  // signing the display original; legacy rows without a thumbnail retain the
  // display URL as their safe fallback.
  const signedUrls = await createSignedMediaUrls(supabase, rows.map((row) => ({
    id: row.asset_id,
    object_key: row.thumbnail_object_key ? null : row.object_key,
    thumbnail_object_key: row.thumbnail_object_key,
  })));

  const media = new Map<string, RoomCardMedia>();
  for (const roomId of roomIds) {
    const roomPhotos = rows.filter((photo) => photo.room_id === roomId);
    const boardItems: BoardPhoto[] = roomPhotos.flatMap((photo, index) => {
      const ownerActorId = parseActorId(photo.owner_actor_id);
      const thumbnailUrl = photo.thumbnail_object_key
        ? signedUrls.thumbnail.get(photo.asset_id)
        : signedUrls.display.get(photo.asset_id);
      if (!ownerActorId || !thumbnailUrl) return [];
      const assetReference: AssetReference = {
        id: photo.asset_id,
        kind: "image",
        mimeType: photo.mime_type,
        byteSize: photo.byte_size,
        ...(photo.thumbnail_object_key ? {} : { remoteUrl: thumbnailUrl }),
        ...(photo.thumbnail_object_key && photo.thumbnail_byte_size !== null
          ? {
            thumbnail: {
              id: photo.asset_id,
              mimeType: "image/jpeg",
              byteSize: photo.thumbnail_byte_size,
              remoteUrl: thumbnailUrl,
            },
          }
          : {}),
        ...(photo.placeholder_data_url ? { placeholderDataUrl: photo.placeholder_data_url } : {}),
        ...(photo.image_width && photo.image_height ? { width: photo.image_width, height: photo.image_height, revision: photo.media_revision } : {}),
      };
      return [{
        id: photo.photo_id,
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
    media.set(roomId, { photoCount: roomPhotos[0]?.photo_count ?? 0, boardItems });
  }
  return media;
}
