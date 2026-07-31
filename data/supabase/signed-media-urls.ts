import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/data/supabase/database.types";

interface SignableMediaAsset {
  readonly id: string;
  readonly object_key: string | null;
  readonly thumbnail_object_key: string | null;
}

export interface SignedMediaUrls {
  readonly display: ReadonlyMap<string, string>;
  readonly thumbnail: ReadonlyMap<string, string>;
}

const SIGNED_URL_TTL_SECONDS = 60 * 30;

/** Batches private Storage signing so a room view does not issue one request per image. */
export async function createSignedMediaUrls(
  supabase: SupabaseClient<Database>,
  assets: readonly SignableMediaAsset[],
): Promise<SignedMediaUrls> {
  const displayPaths = [...new Set(assets.flatMap((asset) => asset.object_key ? [asset.object_key] : []))];
  const thumbnailPaths = [...new Set(assets.flatMap((asset) => asset.thumbnail_object_key ? [asset.thumbnail_object_key] : []))];
  if (!displayPaths.length && !thumbnailPaths.length) {
    return { display: new Map(), thumbnail: new Map() };
  }
  const storage = supabase.storage.from("room-media");
  const [displayResult, thumbnailResult] = await Promise.all([
    displayPaths.length ? storage.createSignedUrls(displayPaths, SIGNED_URL_TTL_SECONDS) : Promise.resolve({ data: [], error: null }),
    thumbnailPaths.length ? storage.createSignedUrls(thumbnailPaths, SIGNED_URL_TTL_SECONDS) : Promise.resolve({ data: [], error: null }),
  ]);
  const displayByPath = new Map((displayResult.data ?? [])
    .flatMap((entry) => entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []));
  const thumbnailByPath = new Map((thumbnailResult.data ?? [])
    .flatMap((entry) => entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []));

  return {
    display: new Map(assets.flatMap((asset) => {
      const url = asset.object_key ? displayByPath.get(asset.object_key) : null;
      return url ? [[asset.id, url] as const] : [];
    })),
    thumbnail: new Map(assets.flatMap((asset) => {
      const url = asset.thumbnail_object_key ? thumbnailByPath.get(asset.thumbnail_object_key) : null;
      return url ? [[asset.id, url] as const] : [];
    })),
  };
}
