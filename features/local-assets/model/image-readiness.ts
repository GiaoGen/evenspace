import type { AssetReference } from "@/core/domain/asset";
import type { CachedImageVariant } from "./local-asset-repository";

const decodedImages = new Set<string>();

/** Stable across signed-URL refreshes and component remounts. */
export function getImageReadinessKey(
  asset: AssetReference,
  variant: CachedImageVariant,
  scope?: string,
) {
  const renditionId = variant === "thumbnail" && asset.thumbnail
    ? asset.thumbnail.id
    : asset.id;
  return `${scope ?? "device"}:${renditionId}:${variant}:r${asset.revision ?? 1}`;
}

export function isImageDecoded(key: string) {
  return decodedImages.has(key);
}

export function markImageDecoded(key: string) {
  decodedImages.add(key);
}
