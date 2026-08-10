"use client";

import { useEffect } from "react";

import type { RoomPublicId } from "@/core/domain/ids";
import type { BoardPhoto } from "@/core/domain/room";
import {
  deleteLocalAsset,
  getCachedAssetKey,
  type CachedAssetOptions,
} from "@/features/local-assets/model/local-asset-repository";
import {
  getImageVariantReference,
  readCachedImageVariant,
  resolveCachedImage,
} from "@/features/local-assets/model/cached-image-resolver";
import {
  getRoomPhotoCacheInventory,
  getRoomPhotoCachePlan,
  type PhotoCacheResource,
} from "@/features/room/model/photo-cache-plan";

const MANIFEST_KEY = "eventspace:room-photo-cache:v3";
const DOWNLOAD_CONCURRENCY = 2;
const ACTIVE_ROOM_BACKGROUND_DELAY_MS = 150;

type RoomCacheManifest = {
  readonly readyKeys: readonly string[];
};

type CacheManifest = {
  readonly version: 3;
  readonly rooms: Record<string, RoomCacheManifest>;
};

let persistenceRequested = false;

function readManifest(): CacheManifest {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(MANIFEST_KEY) ?? "");
    if (!value || typeof value !== "object" || Array.isArray(value)) return { version: 3, rooms: {} };
    const candidate = value as Partial<CacheManifest>;
    if (candidate.version !== 3 || !candidate.rooms || typeof candidate.rooms !== "object" || Array.isArray(candidate.rooms)) return { version: 3, rooms: {} };
    const rooms = Object.fromEntries(Object.entries(candidate.rooms).flatMap(([roomKey, room]) => {
      if (!room || typeof room !== "object" || Array.isArray(room)) return [];
      const readyKeys = (room as Partial<RoomCacheManifest>).readyKeys;
      return Array.isArray(readyKeys) && readyKeys.every((key) => typeof key === "string")
        ? [[roomKey, { readyKeys }]]
        : [];
    }));
    return { version: 3, rooms };
  } catch {
    return { version: 3, rooms: {} };
  }
}

function writeManifest(manifest: CacheManifest) {
  try { window.localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest)); }
  catch { /* IndexedDB remains useful if localStorage is unavailable. */ }
}

function cachedOptions(scope: string, resource: PhotoCacheResource): CachedAssetOptions {
  return { scope, variant: resource.variant };
}

function remoteUrl(resource: PhotoCacheResource): string | undefined {
  return getImageVariantReference(resource.asset, resource.variant).remoteUrl;
}

function resourceKey(scope: string, resource: PhotoCacheResource): string {
  return getCachedAssetKey(
    getImageVariantReference(resource.asset, resource.variant),
    cachedOptions(scope, resource),
  );
}

async function resourceIsCached(resource: PhotoCacheResource, scope: string) {
  if (resource.variant === "thumbnail") {
    const display = await readCachedImageVariant(resource.asset, scope, "display");
    if (display) return true;
  }
  return Boolean(await readCachedImageVariant(resource.asset, scope, resource.variant));
}

async function cacheResource(resource: PhotoCacheResource, scope: string, signal: AbortSignal, onExpiredRemoteUrl?: () => void): Promise<boolean> {
  if (signal.aborted) return false;
  if (await resourceIsCached(resource, scope)) return true;
  const options = cachedOptions(scope, resource);
  const reference = getImageVariantReference(resource.asset, resource.variant);
  const url = remoteUrl(resource);
  const result = await resolveCachedImage(reference, options, url);
  if (result.expiredRemoteUrl) onExpiredRemoteUrl?.();
  return Boolean(result.blob);
}

async function cacheResources(
  resources: readonly PhotoCacheResource[],
  scope: string,
  signal: AbortSignal,
  readyKeys: Set<string>,
  onExpiredRemoteUrl?: () => void,
) {
  let nextIndex = 0;
  const worker = async () => {
    while (!signal.aborted && nextIndex < resources.length) {
      const index = nextIndex;
      nextIndex += 1;
      const resource = resources[index];
      if (await cacheResource(resource, scope, signal, onExpiredRemoteUrl)) {
        readyKeys.add(resourceKey(scope, resource));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, resources.length) }, worker));
}

function waitForBackgroundSlot(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted || delayMs === 0) { resolve(); return; }
    const timer = window.setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => { window.clearTimeout(timer); resolve(); }, { once: true });
  });
}

function saveReadyKeys(roomKey: string, readyKeys: ReadonlySet<string>) {
  const manifest = readManifest();
  writeManifest({
    version: 3,
    rooms: {
      ...manifest.rooms,
      [roomKey]: { readyKeys: [...readyKeys] },
    },
  });
}

async function reconcileRoomManifest(
  roomKey: string,
  resources: readonly PhotoCacheResource[],
  scope: string,
  signal: AbortSignal,
): Promise<Set<string>> {
  const manifest = readManifest();
  const resourcesByKey = new Map(resources.map((resource) => [resourceKey(scope, resource), resource]));
  const expectedKeys = new Set(resourcesByKey.keys());
  const previous = manifest.rooms[roomKey]?.readyKeys ?? [];
  const removedKeys = previous.filter((key) => !expectedKeys.has(key));
  await Promise.all(removedKeys.map((key) => deleteLocalAsset(key).catch(() => undefined)));

  const verified = await Promise.all(previous.flatMap((key) => {
    const resource = resourcesByKey.get(key);
    if (!resource) return [];
    return [resourceIsCached(resource, scope)
      .then((ready) => ready ? key : null)
      .catch(() => null)];
  }));
  const readyKeys = new Set(verified.filter((key): key is string => Boolean(key)));
  if (!signal.aborted) saveReadyKeys(roomKey, readyKeys);
  return readyKeys;
}

function requestPersistentStorage() {
  if (persistenceRequested || !navigator.storage?.persist) return;
  persistenceRequested = true;
  void navigator.storage.persist().catch(() => undefined);
}

/**
 * The selected photo and its three neighbours get display priority. Remaining
 * thumbnails continue silently afterward; large renditions stay demand-driven.
 */
export function useRoomPhotoCache({
  roomPublicId,
  viewerCacheScope,
  photos,
  selectedPhotoId,
  archived,
  onExpiredRemoteUrl,
}: {
  readonly roomPublicId: RoomPublicId;
  readonly viewerCacheScope: string;
  readonly photos: readonly BoardPhoto[];
  readonly selectedPhotoId: string | null;
  readonly archived: boolean;
  readonly onExpiredRemoteUrl?: () => void;
}) {
  useEffect(() => {
    requestPersistentStorage();
    const plan = getRoomPhotoCachePlan(photos, selectedPhotoId);
    const inventory = getRoomPhotoCacheInventory(photos);
    const roomKey = `${viewerCacheScope}:${roomPublicId}`;
    const controller = new AbortController();
    let running: Promise<void> | null = null;

    const cacheRoom = async () => {
      const readyKeys = await reconcileRoomManifest(roomKey, inventory, viewerCacheScope, controller.signal);
      if (controller.signal.aborted) return;
      await cacheResources(plan.priority, viewerCacheScope, controller.signal, readyKeys, onExpiredRemoteUrl);
      if (!controller.signal.aborted) saveReadyKeys(roomKey, readyKeys);
      await waitForBackgroundSlot(archived ? 0 : ACTIVE_ROOM_BACKGROUND_DELAY_MS, controller.signal);
      if (!controller.signal.aborted) {
        await cacheResources(plan.background, viewerCacheScope, controller.signal, readyKeys, onExpiredRemoteUrl);
        if (!controller.signal.aborted) saveReadyKeys(roomKey, readyKeys);
      }
    };
    const startCaching = () => {
      if (running || controller.signal.aborted) return;
      running = cacheRoom().finally(() => { running = null; });
    };
    startCaching();
    const retryWhenOnline = () => { startCaching(); };
    window.addEventListener("online", retryWhenOnline);
    return () => {
      controller.abort();
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [archived, onExpiredRemoteUrl, photos, roomPublicId, selectedPhotoId, viewerCacheScope]);
}
