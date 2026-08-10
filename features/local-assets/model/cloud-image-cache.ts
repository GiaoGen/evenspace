const CLOUD_IMAGE_CACHE_NAME = "eventspace-cloud-images-v1";
const CLOUD_IMAGE_CACHE_ORIGIN = "https://eventspace.local";

function cacheRequestUrl(key: string) {
  return `${CLOUD_IMAGE_CACHE_ORIGIN}/__cloud_image_cache__/${encodeURIComponent(key)}`;
}

function cacheStorageAvailable() {
  return typeof caches !== "undefined";
}

/**
 * Cache Storage is the primary durable store for authorized cloud image bytes.
 * Its synthetic request keys never contact the network.
 */
export async function putCloudImageBlob(key: string, blob: Blob): Promise<boolean> {
  if (!cacheStorageAvailable()) return false;
  const cache = await caches.open(CLOUD_IMAGE_CACHE_NAME);
  await cache.put(
    cacheRequestUrl(key),
    new Response(blob, {
      headers: { "Content-Type": blob.type || "application/octet-stream" },
    }),
  );
  return true;
}

export async function getCloudImageBlob(key: string): Promise<Blob | null> {
  if (!cacheStorageAvailable()) return null;
  const cache = await caches.open(CLOUD_IMAGE_CACHE_NAME);
  const response = await cache.match(cacheRequestUrl(key));
  return response ? response.blob() : null;
}

export async function deleteCloudImageBlob(key: string): Promise<void> {
  if (!cacheStorageAvailable()) return;
  const cache = await caches.open(CLOUD_IMAGE_CACHE_NAME);
  await cache.delete(cacheRequestUrl(key));
}

export async function clearCloudImageBlobs(): Promise<void> {
  if (!cacheStorageAvailable()) return;
  await caches.delete(CLOUD_IMAGE_CACHE_NAME);
}
