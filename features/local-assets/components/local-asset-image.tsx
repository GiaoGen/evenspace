"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import Image from "next/image";
import type { AssetReference } from "@/core/domain/asset";
import { getImageVariantReference } from "../model/cached-image-resolver";
import { getImageReadinessKey, isImageDecoded, markImageDecoded } from "../model/image-readiness";
import type { CachedImageVariant } from "../model/local-asset-repository";
import { useCachedImageUrl, useLocalAssetUrl } from "./use-local-asset-url";

export type ImageVariant = "thumbnail" | "display";
export type ImageRevealMode = "fade" | "manual";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Placeholder({ asset, fill }: { readonly asset: AssetReference; readonly fill?: boolean }) {
  if (!asset.placeholderDataUrl) return null;
  return <span
    aria-hidden="true"
    className={fill ? "localAssetPlaceholder localAssetPlaceholderFill" : "localAssetPlaceholder"}
    style={{ backgroundImage: `url(${JSON.stringify(asset.placeholderDataUrl)})` }}
  />;
}

function ReadyImage({ url, readinessKey, asset, alt, fill, width, height, sizes, className, loading, reveal, onDecoded, onError }: { readonly url: string; readonly readinessKey: string; readonly asset: AssetReference; readonly alt: string; readonly fill?: boolean; readonly width?: number; readonly height?: number; readonly sizes?: string; readonly className?: string; readonly loading?: "eager" | "lazy"; readonly reveal: ImageRevealMode; readonly onDecoded?: () => void; readonly onError?: () => void }) {
  const [loaded, setLoaded] = useState(() => isImageDecoded(readinessKey));
  const onDecodedRef = useRef(onDecoded);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onDecodedRef.current = onDecoded;
  }, [onDecoded]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useBrowserLayoutEffect(() => {
    if (loaded) onDecodedRef.current?.();
  }, [loaded]);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const finish = () => {
      markImageDecoded(readinessKey);
      setLoaded(true);
    };
    if (typeof image.decode !== "function") { finish(); return; }
    void image.decode().then(finish).catch(() => onErrorRef.current?.());
  }

  return <>
    {reveal === "fade" && !loaded ? <Placeholder asset={asset} fill={fill} /> : null}
    <Image
      src={url}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={loading}
      decoding="async"
      className={`${className ?? ""} ${reveal === "manual" ? "localAssetImageManual" : `localAssetImage ${loaded ? "localAssetImageLoaded" : ""}`}`}
      onLoad={handleLoad}
      onError={() => onErrorRef.current?.()}
      unoptimized
    />
  </>;
}

export function LocalAssetImage({ asset, alt, fill, width, height, sizes, className, variant = "display", preferLocal = false, cacheScope, loading, reveal = "fade", onDecoded, onError }: { readonly asset: AssetReference; readonly alt: string; readonly fill?: boolean; readonly width?: number; readonly height?: number; readonly sizes?: string; readonly className?: string; readonly variant?: ImageVariant; readonly preferLocal?: boolean; readonly cacheScope?: string; readonly loading?: "eager" | "lazy"; readonly reveal?: ImageRevealMode; readonly onDecoded?: () => void; readonly onError?: () => void }) {
  const cacheVariant: CachedImageVariant = variant === "thumbnail" && asset.thumbnail ? "thumbnail" : "display";
  const reference = useMemo(() => getImageVariantReference(asset, cacheVariant), [asset, cacheVariant]);
  const cached = useCachedImageUrl(preferLocal && cacheScope ? asset : null, cacheVariant, preferLocal ? cacheScope ?? null : null);
  const directUrl = useLocalAssetUrl(preferLocal && cacheScope ? null : reference, preferLocal);
  const url = cached?.url ?? directUrl;
  const resolvedVariant = cached?.variant ?? cacheVariant;
  const readinessKey = getImageReadinessKey(asset, resolvedVariant, cacheScope);

  return url
    ? <ReadyImage key={readinessKey} url={url} readinessKey={readinessKey} asset={asset} alt={alt} fill={fill} width={width} height={height} sizes={sizes} className={className} loading={loading} reveal={reveal} onDecoded={onDecoded} onError={onError} />
    : reveal === "fade" ? <Placeholder asset={asset} fill={fill} /> : null;
}
