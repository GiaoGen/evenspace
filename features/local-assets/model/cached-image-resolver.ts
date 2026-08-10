import type { AssetReference } from "@/core/domain/asset";
import {
  cacheLocalAsset,
  getCachedAssetKey,
  getCachedLocalAssetBlob,
  getLocalAssetBlob,
  type CachedAssetOptions,
  type CachedImageVariant,
} from "./local-asset-repository";

export type CachedImageResolution = {
  readonly blob: Blob | null;
  readonly expiredRemoteUrl: boolean;
};

export type CachedImageMatch = {
  readonly blob: Blob;
  readonly key: string;
  readonly reference: AssetReference;
  readonly variant: CachedImageVariant;
};

const pendingDownloads = new Map<string, Promise<CachedImageResolution>>();

export function getImageVariantReference(
  asset: AssetReference,
  variant: CachedImageVariant,
): AssetReference {
  if (variant !== "thumbnail" || !asset.thumbnail) return asset;
  return {
    id: asset.thumbnail.id,
    kind: "image",
    mimeType: asset.thumbnail.mimeType,
    byteSize: asset.thumbnail.byteSize,
    remoteUrl: asset.thumbnail.remoteUrl,
    revision: asset.revision,
  };
}

/** Reads one rendition without starting a network request. */
export async function readCachedImageVariant(
  asset: AssetReference,
  scope: string,
  variant: CachedImageVariant,
): Promise<CachedImageMatch | null> {
  const reference = getImageVariantReference(asset, variant);
  const options = { scope, variant } as const;
  let blob = await getCachedLocalAssetBlob(reference, options);
  // Freshly prepared uploads still use their temporary local rendition ids.
  if (!blob && !reference.remoteUrl) blob = await getLocalAssetBlob(reference);
  return blob
    ? { blob, key: getCachedAssetKey(reference, options), reference, variant }
    : null;
}

/** A display rendition satisfies every smaller image request. */
export async function readBestCachedImage(
  asset: AssetReference,
  scope: string,
): Promise<CachedImageMatch | null> {
  const display = await readCachedImageVariant(asset, scope, "display");
  if (display || !asset.thumbnail) return display;
  return readCachedImageVariant(asset, scope, "thumbnail");
}

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
  if (cached) {
    return { blob: cached, expiredRemoteUrl: false };
  }
  if (!remoteUrl) {
    return { blob: null, expiredRemoteUrl: false };
  }

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
