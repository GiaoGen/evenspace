"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetReference } from "@/core/domain/asset";
import { resolveCachedImage } from "../model/cached-image-resolver";
import { getCachedAssetKey, getLocalAssetBlob, type CachedAssetOptions } from "../model/local-asset-repository";

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
    if (remoteUrl && !preferLocal) { queueMicrotask(() => { if (active) setResolved({ id: localId, url: remoteUrl }); }); return () => { active = false; }; }
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
