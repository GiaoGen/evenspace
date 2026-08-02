"use client";

import type { BackendRoomSession } from "@/data/supabase/backend-room-session";
import type { RoomCollectionItem } from "@/features/rooms/model/room-collection";

const VIEWER_SCOPE_KEY = "eventspace:viewer-cache-scope:v1";
const ROOMS_SNAPSHOT_KEY = "eventspace:rooms-snapshot:v1";
const ROOMS_SNAPSHOT_EVENT = "eventspace:rooms-snapshot-change";
const ROOM_SNAPSHOT_PREFIX = "eventspace:room-snapshot:v1:";
const SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 12;

export interface RoomsRouteSnapshot {
  readonly scope: string;
  readonly viewerAccountScope?: string;
  readonly savedAt: number;
  readonly rooms: readonly RoomCollectionItem[];
  readonly viewerInitials: string;
}

export interface RoomRouteSnapshot {
  readonly scope: string;
  readonly savedAt: number;
  readonly payload: BackendRoomSession;
}

let memoizedRoomsRaw: string | null | undefined;
let memoizedRoomsScope: string | null | undefined;
let memoizedRoomsSnapshot: RoomsRouteSnapshot | null = null;

function browserStorage() {
  if (typeof window === "undefined") return null;
  return { local: window.localStorage, session: window.sessionStorage };
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function removeSignedUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeSignedUrls);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) =>
    key === "remoteUrl" || key === "avatarUrl" ? [] : [[key, removeSignedUrls(child)]],
  ));
}

function currentScope() {
  try { return browserStorage()?.session.getItem(VIEWER_SCOPE_KEY) ?? null; }
  catch { return null; }
}

function fresh(snapshot: { readonly savedAt: number }) {
  return Number.isFinite(snapshot.savedAt) && Date.now() - snapshot.savedAt < SNAPSHOT_MAX_AGE_MS;
}

/** Establishes the per-tab account scope before private route snapshots may be read. */
export function rememberViewerCacheScope(scope: string | undefined) {
  if (!scope) return;
  try { browserStorage()?.session.setItem(VIEWER_SCOPE_KEY, scope); }
  catch { /* Snapshots are optional. */ }
}

export function saveRoomsRouteSnapshot(input: Omit<RoomsRouteSnapshot, "savedAt">) {
  const storage = browserStorage();
  if (!storage || !input.scope) return;
  const stableRooms = removeSignedUrls(input.rooms) as readonly RoomCollectionItem[];
  const current = readRoomsRouteSnapshot();
  if (
    current?.scope === input.scope
    && current.viewerAccountScope === input.viewerAccountScope
    && current.viewerInitials === input.viewerInitials
    && JSON.stringify(current.rooms) === JSON.stringify(stableRooms)
  ) return;
  const snapshot: RoomsRouteSnapshot = {
    ...input,
    savedAt: Date.now(),
    rooms: stableRooms,
  };
  try {
    const raw = JSON.stringify(snapshot);
    storage.local.setItem(ROOMS_SNAPSHOT_KEY, raw);
    memoizedRoomsRaw = raw;
    memoizedRoomsScope = input.scope;
    memoizedRoomsSnapshot = snapshot;
    window.dispatchEvent(new Event(ROOMS_SNAPSHOT_EVENT));
  }
  catch { /* Storage quota must never block navigation. */ }
}

export function readRoomsRouteSnapshot(): RoomsRouteSnapshot | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.local.getItem(ROOMS_SNAPSHOT_KEY);
    const scope = currentScope();
    if (raw === memoizedRoomsRaw && scope === memoizedRoomsScope) return memoizedRoomsSnapshot;
    memoizedRoomsRaw = raw;
    memoizedRoomsScope = scope;
    const snapshot = raw ? JSON.parse(raw) as RoomsRouteSnapshot : null;
    memoizedRoomsSnapshot = snapshot && snapshot.scope === scope && fresh(snapshot) ? snapshot : null;
    return memoizedRoomsSnapshot;
  } catch {
    memoizedRoomsRaw = undefined;
    memoizedRoomsScope = undefined;
    memoizedRoomsSnapshot = null;
    return null;
  }
}

export function subscribeRoomsRouteSnapshot(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ROOMS_SNAPSHOT_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(ROOMS_SNAPSHOT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ROOMS_SNAPSHOT_EVENT, onChange);
  };
}

export function saveRoomRouteSnapshot(payload: BackendRoomSession) {
  const storage = browserStorage();
  const scope = payload.session.viewer.actorId;
  if (!storage || !scope) return;
  const snapshot: RoomRouteSnapshot = {
    scope,
    savedAt: Date.now(),
    payload: removeSignedUrls(payload) as BackendRoomSession,
  };
  try { storage.local.setItem(`${ROOM_SNAPSHOT_PREFIX}${scope}:${payload.room.publicId}`, JSON.stringify(snapshot)); }
  catch { /* Storage quota must never block navigation. */ }
}

export function readRoomRouteSnapshot(roomPublicId: string): RoomRouteSnapshot | null {
  const storage = browserStorage();
  const scope = currentScope();
  if (!storage || !scope) return null;
  const snapshot = readJson<RoomRouteSnapshot>(storage.local, `${ROOM_SNAPSHOT_PREFIX}${scope}:${roomPublicId}`);
  return snapshot && snapshot.scope === scope && snapshot.payload.room.publicId === roomPublicId && fresh(snapshot)
    ? snapshot
    : null;
}
