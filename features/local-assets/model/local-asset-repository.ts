import type { AssetKind, AssetReference } from "@/core/domain/asset";
import { createUuid } from "@/core/domain/uuid";
import type { AssetRepository } from "@/data/contracts/asset-repository";
import {
  clearCloudImageBlobs,
  deleteCloudImageBlob,
  getCloudImageBlob,
  putCloudImageBlob,
} from "./cloud-image-cache";

const DATABASE_NAME = "eventspace-local-assets";
const STORE_NAME = "assets";
const DATABASE_VERSION = 1;
const CACHED_ASSET_PREFIX = "cache:";

export type CachedImageVariant = "display" | "thumbnail";

export type CachedAssetOptions = {
  readonly scope: string;
  readonly variant: CachedImageVariant;
};

type CachedAssetListener = (key: string) => void;

const cachedAssetListeners = new Set<CachedAssetListener>();

function notifyCachedAssetChanged(key: string) {
  cachedAssetListeners.forEach((listener) => listener(key));
}

export function subscribeCachedAssetChanges(listener: CachedAssetListener) {
  cachedAssetListeners.add(listener);
  return () => {
    cachedAssetListeners.delete(listener);
  };
}

interface LocalAssetRecord extends AssetReference {
  readonly blob: Blob;
  readonly createdAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local asset storage could not be opened."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local asset storage request failed."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const result = requestResult(operation(transaction.objectStore(STORE_NAME)));
    const completed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("Local asset storage transaction was aborted."));
      transaction.onerror = () => reject(transaction.error ?? new Error("Local asset storage transaction failed."));
    });
    const [value] = await Promise.all([result, completed]);
    return value;
  } finally {
    database.close();
  }
}

export class IndexedDbAssetRepository implements AssetRepository {
  async save(blob: Blob, kind: AssetKind): Promise<AssetReference> {
    const reference: AssetReference = {
      id: `asset_${createUuid()}`,
      kind,
      mimeType: blob.type || (kind === "image" ? "image/png" : "audio/webm"),
      byteSize: blob.size,
    };
    const record: LocalAssetRecord = { ...reference, blob, createdAt: new Date().toISOString() };
    await withStore("readwrite", (store) => store.put(record));
    return reference;
  }

  async read(reference: AssetReference): Promise<Blob | null> {
    const record = await withStore<LocalAssetRecord | undefined>("readonly", (store) => store.get(reference.id));
    return record?.blob ?? null;
  }

  async remove(id: string): Promise<void> {
    await withStore("readwrite", (store) => store.delete(id));
  }
}

export const localAssetRepository: AssetRepository = new IndexedDbAssetRepository();

export const saveLocalAsset = (blob: Blob, kind: AssetKind) => localAssetRepository.save(blob, kind);
export const getLocalAssetBlob = (reference: AssetReference) => localAssetRepository.read(reference);
export async function deleteLocalAsset(id: string): Promise<void> {
  const operations: Promise<unknown>[] = [localAssetRepository.remove(id)];
  if (id.startsWith(CACHED_ASSET_PREFIX)) operations.push(deleteCloudImageBlob(id));
  const results = await Promise.allSettled(operations);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

/** A cache key is scoped to a viewer, rendition, and media revision, never to a signed URL. */
export function getCachedAssetKey(reference: AssetReference, options: CachedAssetOptions): string {
  return `${CACHED_ASSET_PREFIX}${options.scope}:${reference.id}:${options.variant}:r${reference.revision ?? 1}`;
}

function cachedReference(reference: AssetReference, options: CachedAssetOptions): AssetReference {
  return { ...reference, id: getCachedAssetKey(reference, options) };
}

/** Stores an already-authorized remote asset without colliding with another rendition. */
export async function cacheLocalAsset(reference: AssetReference, blob: Blob, options: CachedAssetOptions): Promise<void> {
  const key = getCachedAssetKey(reference, options);
  const record: LocalAssetRecord = {
    ...reference,
    id: key,
    kind: reference.kind,
    mimeType: blob.type || reference.mimeType,
    byteSize: blob.size,
    ...(reference.thumbnail ? { thumbnail: reference.thumbnail } : {}),
    ...(reference.placeholderDataUrl ? { placeholderDataUrl: reference.placeholderDataUrl } : {}),
    ...(reference.width && reference.height ? { width: reference.width, height: reference.height, revision: reference.revision } : {}),
    blob,
    createdAt: new Date().toISOString(),
  };
  const [indexedDatabase, cacheStorage] = await Promise.allSettled([
    withStore("readwrite", (store) => store.put(record)),
    putCloudImageBlob(key, blob),
  ]);
  const indexedDatabaseSucceeded = indexedDatabase.status === "fulfilled";
  const cacheStorageSucceeded = cacheStorage.status === "fulfilled" && cacheStorage.value;
  if (!indexedDatabaseSucceeded && !cacheStorageSucceeded) {
    throw indexedDatabase.status === "rejected"
      ? indexedDatabase.reason
      : cacheStorage.status === "rejected"
        ? cacheStorage.reason
        : new Error("Cloud image bytes could not be cached locally.");
  }
  notifyCachedAssetChanged(key);
}

/** Reads a locally cached remote rendition. Old display entries remain readable during the cache-key migration. */
export async function getCachedLocalAssetBlob(reference: AssetReference, options: CachedAssetOptions): Promise<Blob | null> {
  const key = getCachedAssetKey(reference, options);
  const durable = await getCloudImageBlob(key).catch(() => null);
  if (durable) return durable;
  const cached = await getLocalAssetBlob(cachedReference(reference, options)).catch(() => null);
  if (cached || options.variant !== "display" || (reference.revision ?? 1) !== 1) return cached;
  return getLocalAssetBlob(reference).catch(() => null);
}

export const deleteCachedLocalAsset = (reference: AssetReference, options: CachedAssetOptions) =>
  deleteLocalAsset(getCachedAssetKey(reference, options));

export async function clearLocalAssets(): Promise<void> {
  const results = await Promise.allSettled([
    withStore("readwrite", (store) => store.clear()),
    clearCloudImageBlobs(),
  ]);
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

export async function pruneLocalAssets(referencedIds: ReadonlySet<string>): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const cursorCompleted = new Promise<void>((resolve, reject) => {
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) { resolve(); return; }
        const key = String(current.key);
        // Cloud media has its own room manifest and must survive mock-session pruning.
        if (!key.startsWith(CACHED_ASSET_PREFIX) && !referencedIds.has(key)) current.delete();
        current.continue();
      };
      cursor.onerror = () => reject(cursor.error ?? new Error("Local assets could not be pruned."));
    });
    const transactionCompleted = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("Local asset pruning was aborted."));
      transaction.onerror = () => reject(transaction.error ?? new Error("Local asset pruning failed."));
    });
    await Promise.all([cursorCompleted, transactionCompleted]);
  } finally {
    database.close();
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error("Legacy asset data is invalid.");
  const mimeType = match[1] || "application/octet-stream";
  const decoded = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}
