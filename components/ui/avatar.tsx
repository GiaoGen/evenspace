"use client";

import Image from "next/image";
import { useCallback, useSyncExternalStore } from "react";

import type { AssetReference } from "@/core/domain/asset";
import { useLocalAssetUrl } from "@/features/local-assets/components/use-local-asset-url";
import { readViewerAvatar, subscribeViewerAvatar } from "@/features/account/model/viewer-avatar-cache";
import styles from "./avatar.module.css";

export function Avatar({
  src,
  asset,
  cacheScope,
  text,
  displayName,
  className = "",
  size = 64,
  decorative = false,
}: {
  readonly src?: string | null;
  readonly asset?: AssetReference | null;
  readonly cacheScope?: string;
  readonly text: string;
  readonly displayName: string;
  readonly className?: string;
  readonly size?: number;
  readonly decorative?: boolean;
}) {
  const subscribe = useCallback((onChange: () => void) => subscribeViewerAvatar(cacheScope, onChange), [cacheScope]);
  const getSnapshot = useCallback(() => cacheScope ? readViewerAvatar(cacheScope) : null, [cacheScope]);
  const cachedAsset = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const activeAsset = asset ?? cachedAsset;
  const assetUrl = useLocalAssetUrl(
    activeAsset,
    Boolean(activeAsset && cacheScope),
    activeAsset && cacheScope ? { scope: cacheScope, variant: "display" } : undefined,
  );
  const imageUrl = assetUrl ?? src;
  return (
    <span
      className={`${styles.avatar} ${className}`}
      aria-hidden={decorative || undefined}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={decorative ? "" : `${displayName} avatar`}
          fill
          sizes={`${size}px`}
          unoptimized
        />
      ) : (
        text
      )}
    </span>
  );
}
