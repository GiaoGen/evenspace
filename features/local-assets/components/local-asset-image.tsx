"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { AssetReference } from "@/core/domain/asset";
import type { CachedImageVariant } from "../model/local-asset-repository";
import { useLocalAssetUrl } from "./use-local-asset-url";

export type ImageVariant = "thumbnail" | "display";

function resolveVariant(asset: AssetReference, variant: ImageVariant): AssetReference {
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

export function LocalAssetImage({ asset, alt, fill, width, height, sizes, className, variant = "display", preferLocal = false, cacheScope }: { readonly asset: AssetReference; readonly alt: string; readonly fill?: boolean; readonly width?: number; readonly height?: number; readonly sizes?: string; readonly className?: string; readonly variant?: ImageVariant; readonly preferLocal?: boolean; readonly cacheScope?: string }) {
  const cacheVariant: CachedImageVariant = variant === "thumbnail" && asset.thumbnail ? "thumbnail" : "display";
  const reference = useMemo(() => resolveVariant(asset, variant), [asset, variant]);
  const cachedOptions = useMemo(() => cacheScope ? { scope: cacheScope, variant: cacheVariant } : undefined, [cacheScope, cacheVariant]);
  const url = useLocalAssetUrl(reference, preferLocal, cachedOptions);
  const placeholderStyle = asset.placeholderDataUrl
    ? { backgroundImage: `url(${JSON.stringify(asset.placeholderDataUrl)})` }
    : undefined;
  const placeholderClassName = fill ? "localAssetPlaceholder localAssetPlaceholderFill" : "localAssetPlaceholder";

  return <>
    {asset.placeholderDataUrl ? <span aria-hidden="true" className={placeholderClassName} style={placeholderStyle} /> : null}
    {url ? <Image
      src={url}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      className={className}
      placeholder={asset.placeholderDataUrl ? "blur" : "empty"}
      blurDataURL={asset.placeholderDataUrl}
      unoptimized
    /> : null}
  </>;
}
