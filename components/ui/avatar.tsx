"use client";

import Image from "next/image";
import { useCallback, useSyncExternalStore } from "react";

import type { AssetReference } from "@/core/domain/asset";
import { LocalAssetImage, type ImageVariant } from "@/features/local-assets/components/local-asset-image";
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
  variant = "display",
}: {
  readonly src?: string | null;
  readonly asset?: AssetReference | null;
  readonly cacheScope?: string;
  readonly text: string;
  readonly displayName: string;
  readonly className?: string;
  readonly size?: number;
  readonly decorative?: boolean;
  readonly variant?: ImageVariant;
}) {
  const subscribe = useCallback((onChange: () => void) => subscribeViewerAvatar(cacheScope, onChange), [cacheScope]);
  const getSnapshot = useCallback(() => cacheScope ? readViewerAvatar(cacheScope) : null, [cacheScope]);
  const cachedAsset = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const activeAsset = asset ?? cachedAsset;
  return (
    <span
      className={`${styles.avatar} ${className}`}
      aria-hidden={decorative || undefined}
    >
      <span className={styles.fallback} aria-hidden={Boolean(activeAsset || src) || undefined}>{text}</span>
      {activeAsset ? (
        <LocalAssetImage
          asset={activeAsset}
          alt={decorative ? "" : `${displayName} avatar`}
          fill
          sizes={`${size}px`}
          variant={variant}
          preferLocal={Boolean(cacheScope)}
          cacheScope={cacheScope}
          reveal="manual"
        />
      ) : src ? (
        <Image
          src={src}
          alt={decorative ? "" : `${displayName} avatar`}
          fill
          sizes={`${size}px`}
          unoptimized
        />
      ) : null}
    </span>
  );
}
