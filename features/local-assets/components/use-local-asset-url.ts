"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetReference } from "@/core/domain/asset";
import {
  getImageVariantReference,
  readBestCachedImage,
  readCachedImageVariant,
  resolveCachedImage,
  type CachedImageMatch,
} from "../model/cached-image-resolver";
import {
  getCachedAssetKey,
  getLocalAssetBlob,
  subscribeCachedAssetChanges,
  type CachedAssetOptions,
  type CachedImageVariant,
} from "../model/local-asset-repository";

const URL_RELEASE_DELAY_MS = 30_000;
const urls = new Map<string, { url: string; users: number; releaseTimer: number | null }>();
const pending = new Map<string, Promise<Blob | null>>();

async function createUrl(id: string, load: () => Promise<Blob | null>) {
  const existing = urls.get(id);
  if (existing) {
    if (existing.releaseTimer !== null) window.clearTimeout(existing.releaseTimer);
    existing.releaseTimer = null;
    existing.users += 1;
    return existing.url;
  }
  let request = pending.get(id);
  if (!request) {
    request = load()
      .catch(() => null)
      .finally(() => {
        pending.delete(id);
      });
    pending.set(id, request);
  }
  const blob = await request;
  if (!blob) return null;
  const raced = urls.get(id);
  if (raced) {
    if (raced.releaseTimer !== null) window.clearTimeout(raced.releaseTimer);
    raced.releaseTimer = null;
    raced.users += 1;
    return raced.url;
  }
  const url = URL.createObjectURL(blob);
  urls.set(id, { url, users: 1, releaseTimer: null });
  return url;
}

function releaseUrl(id: string) {
  const entry = urls.get(id);
  if (!entry) return;
  entry.users = Math.max(0, entry.users - 1);
  if (entry.users > 0) return;
  if (entry.releaseTimer !== null) window.clearTimeout(entry.releaseTimer);
  entry.releaseTimer = window.setTimeout(() => {
    const current = urls.get(id);
    if (!current || current !== entry || current.users > 0) return;
    URL.revokeObjectURL(current.url);
    urls.delete(id);
  }, URL_RELEASE_DELAY_MS);
}

export type CachedImageUrl = {
  readonly id: string;
  readonly url: string;
  readonly variant: CachedImageVariant;
};

function pooledCachedImage(
  asset: AssetReference,
  scope: string,
): CachedImageUrl | null {
  for (const variant of ["display", "thumbnail"] as const) {
    if (variant === "thumbnail" && !asset.thumbnail) continue;
    const reference = getImageVariantReference(asset, variant);
    const id = getCachedAssetKey(reference, { scope, variant });
    const entry = urls.get(id);
    if (entry) return { id, url: entry.url, variant };
  }
  return null;
}

/**
 * Resolves the best already-authorized image for a visible component.
 * Display bytes satisfy thumbnail requests; display requests may show a cached
 * thumbnail immediately while their larger rendition is downloaded.
 */
export function useCachedImageUrl(
  asset: AssetReference | null,
  requestedVariant: CachedImageVariant,
  scope: string | null,
) {
  const displayReference = useMemo(
    () => asset ? getImageVariantReference(asset, "display") : null,
    [asset],
  );
  const thumbnailReference = useMemo(
    () => asset?.thumbnail ? getImageVariantReference(asset, "thumbnail") : null,
    [asset],
  );
  const displayKey = displayReference && scope
    ? getCachedAssetKey(displayReference, { scope, variant: "display" })
    : null;
  const thumbnailKey = thumbnailReference && scope
    ? getCachedAssetKey(thumbnailReference, { scope, variant: "thumbnail" })
    : null;
  const [resolved, setResolved] = useState<CachedImageUrl | null>(() =>
    asset && scope ? pooledCachedImage(asset, scope) : null,
  );

  useEffect(() => {
    let active = true;
    let heldKey: string | null = null;
    let bestRank = 0;

    const show = async (match: CachedImageMatch) => {
      const rank = match.variant === "display" ? 2 : 1;
      const url = await createUrl(match.key, () => Promise.resolve(match.blob));
      if (!url) return;
      if (!active || rank < bestRank) {
        releaseUrl(match.key);
        return;
      }
      if (heldKey === match.key) {
        releaseUrl(match.key);
        return;
      }
      const previousKey = heldKey;
      heldKey = match.key;
      bestRank = rank;
      setResolved({ id: match.key, url, variant: match.variant });
      if (previousKey) releaseUrl(previousKey);
    };

    const downloadVariant = async (variant: CachedImageVariant) => {
      if (!asset || !scope) return;
      const reference = getImageVariantReference(asset, variant);
      const result = await resolveCachedImage(reference, { scope, variant }, reference.remoteUrl);
      if (!result.blob) return;
      await show({
        blob: result.blob,
        key: getCachedAssetKey(reference, { scope, variant }),
        reference,
        variant,
      });
    };

    const start = async () => {
      if (!asset || !scope) {
        setResolved(null);
        return;
      }
      const cached = await readBestCachedImage(asset, scope);
      if (cached) await show(cached);
      if (requestedVariant === "display" && cached?.variant !== "display") {
        await downloadVariant("display");
      } else if (requestedVariant === "thumbnail" && !cached) {
        await downloadVariant(asset.thumbnail ? "thumbnail" : "display");
      }
    };

    const unsubscribe = subscribeCachedAssetChanges((key) => {
      if (!asset || !scope || key !== displayKey || bestRank >= 2) return;
      void readCachedImageVariant(asset, scope, "display").then((match) => {
        if (match) void show(match);
      });
    });
    void start();

    return () => {
      active = false;
      unsubscribe();
      if (heldKey) queueMicrotask(() => releaseUrl(heldKey!));
    };
  }, [asset, displayKey, requestedVariant, scope]);

  return resolved && (resolved.id === displayKey || resolved.id === thumbnailKey) ? resolved : null;
}

export function useLocalAssetUrl(reference?: AssetReference | null, preferLocal = false, cachedOptions?: CachedAssetOptions) {
  const cacheScope = cachedOptions?.scope;
  const cacheVariant = cachedOptions?.variant;
  const activeCacheOptions = useMemo(
    () => cacheScope && cacheVariant ? { scope: cacheScope, variant: cacheVariant } : undefined,
    [cacheScope, cacheVariant],
  );
  const localId = reference
    ? activeCacheOptions ? getCachedAssetKey(reference, activeCacheOptions) : reference.id
    : null;
  const [resolved, setResolved] = useState<{ readonly id: string | null; readonly url: string | null }>(() => ({
    id: localId,
    url: !preferLocal && reference?.remoteUrl ? reference.remoteUrl : localId ? urls.get(localId)?.url ?? null : null,
  }));
  useEffect(() => {
    let active = true;
    if (!reference) { queueMicrotask(() => { if (active) setResolved({ id: null, url: null }); }); return () => { active = false; }; }
    const remoteUrl = reference.remoteUrl;
    if (remoteUrl && !preferLocal) {
      queueMicrotask(() => { if (active) setResolved({ id: localId, url: remoteUrl }); });
      return () => { active = false; };
    }
    const targetId = activeCacheOptions ? getCachedAssetKey(reference, activeCacheOptions) : reference.id;
    const load = activeCacheOptions
      ? () => resolveCachedImage(reference, activeCacheOptions, remoteUrl).then((result) => result.blob)
      : () => getLocalAssetBlob(reference);
    void createUrl(targetId, load).then((next) => {
      if (active) setResolved({ id: targetId, url: next ?? (activeCacheOptions ? null : remoteUrl) ?? null });
      else if (next) releaseUrl(targetId);
    });
    return () => {
      active = false;
      // A signed URL refresh can recreate the AssetReference while the stable
      // asset/revision key stays the same. Let the next effect retain the blob
      // URL before releasing this consumer so the visible image never blinks.
      queueMicrotask(() => releaseUrl(targetId));
    };
  }, [activeCacheOptions, localId, preferLocal, reference]);
  if (resolved.id === localId) return resolved.url;
  return !preferLocal && reference?.remoteUrl ? reference.remoteUrl : null;
}
