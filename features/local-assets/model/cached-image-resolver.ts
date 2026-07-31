import type { AssetReference } from "@/core/domain/asset";
import {
  cacheLocalAsset,
  getCachedAssetKey,
  getCachedLocalAssetBlob,
  type CachedAssetOptions,
} from "./local-asset-repository";

export type CachedImageResolution = {
  readonly blob: Blob | null;
  readonly expiredRemoteUrl: boolean;
};

const pendingDownloads = new Map<string, Promise<CachedImageResolution>>();

async function downloadAndCache(
  reference: AssetReference,
  options: CachedAssetOptions,
  remoteUrl: string,
): Promise<CachedImageResolution> {
  const response = await fetch(remoteUrl, { cache: "force-cache" });
  if (response.status === 401 || response.status === 403) {
    return { blob: null, expiredRemoteUrl: true };
  }
  if (!response.ok) return { blob: null, expiredRemoteUrl: false };

  const blob = await response.blob();
  if (!blob.size || !blob.type.startsWith("image/")) {
    return { blob: null, expiredRemoteUrl: false };
  }
  await cacheLocalAsset(reference, blob, options);
  return { blob, expiredRemoteUrl: false };
}

/**
 * The only cloud-image read-through path used by both visible images and room
 * prefetching. A stable asset/revision key deduplicates downloads even when a
 * signed URL changes.
 */
export async function resolveCachedImage(
  reference: AssetReference,
  options: CachedAssetOptions,
  remoteUrl?: string,
): Promise<CachedImageResolution> {
  const cached = await getCachedLocalAssetBlob(reference, options);
  if (cached) return { blob: cached, expiredRemoteUrl: false };
  if (!remoteUrl) return { blob: null, expiredRemoteUrl: false };

  const key = getCachedAssetKey(reference, options);
  const existing = pendingDownloads.get(key);
  if (existing) return existing;

  const request = downloadAndCache(reference, options, remoteUrl)
    .catch(() => ({ blob: null, expiredRemoteUrl: false }))
    .finally(() => {
      pendingDownloads.delete(key);
    });
  pendingDownloads.set(key, request);
  return request;
}
