"use client";

import Image from "next/image";
import type { AssetReference } from "@/core/domain/asset";
import { useLocalAssetUrl } from "./use-local-asset-url";

export function LocalAssetImage({ asset, alt, fill, width, height, sizes, className }: { readonly asset: AssetReference; readonly alt: string; readonly fill?: boolean; readonly width?: number; readonly height?: number; readonly sizes?: string; readonly className?: string }) {
  const url = useLocalAssetUrl(asset);
  if (!url) return null;
  return <Image src={url} alt={alt} fill={fill} width={fill ? undefined : width} height={fill ? undefined : height} sizes={sizes} className={className} unoptimized />;
}
