"use client";

import type { BackendRoomSession } from "@/data/supabase/backend-room-session";

const DATABASE_NAME = "eventspace-room-data";
const DATABASE_VERSION = 1;
const STORE_NAME = "secondary-snapshots";

interface RoomSecondaryRecord {
  readonly key: string;
  readonly scope: string;
  readonly roomPublicId: string;
  readonly savedAt: number;
  readonly payload: BackendRoomSession;
}

function cacheKey(scope: string, roomPublicId: string) {
  return `${scope}:${roomPublicId}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Room cache could not be opened."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Room cache request failed."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  try {
    return await requestResult(operation(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME)));
  } finally {
    database.close();
  }
}

function removeExpiringUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeExpiringUrls);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) =>
    key === "remoteUrl" || key === "avatarUrl" ? [] : [[key, removeExpiringUrls(child)]],
  ));
}

export async function readRoomSecondarySnapshot(scope: string, roomPublicId: string): Promise<BackendRoomSession | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const record = await withStore<RoomSecondaryRecord | undefined>("readonly", (store) => store.get(cacheKey(scope, roomPublicId)));
    if (!record || record.scope !== scope || record.roomPublicId !== roomPublicId) return null;
    if (!Number.isFinite(record.savedAt)) return null;
    return record.payload;
  } catch {
    return null;
  }
}

export async function saveRoomSecondarySnapshot(scope: string, payload: BackendRoomSession): Promise<void> {
  if (typeof indexedDB === "undefined" || !scope) return;
  const record: RoomSecondaryRecord = {
    key: cacheKey(scope, payload.room.publicId),
    scope,
    roomPublicId: payload.room.publicId,
    savedAt: Date.now(),
    payload: removeExpiringUrls(payload) as BackendRoomSession,
  };
  try {
    await withStore("readwrite", (store) => store.put(record));
  } catch {
    // Private snapshots are an optional acceleration layer.
  }
}

export async function deleteRoomSecondarySnapshot(scope: string, roomPublicId: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await withStore("readwrite", (store) => store.delete(cacheKey(scope, roomPublicId)));
  } catch {
    // Cache cleanup must never block navigation.
  }
}

export async function clearRoomSecondarySnapshots(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {
    // Cache cleanup must never block sign out.
  }
}
