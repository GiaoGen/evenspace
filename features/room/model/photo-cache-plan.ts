import type { AssetReference } from "@/core/domain/asset";
import type { BoardPhoto } from "@/core/domain/room";
import { getPhotoCacheWindow } from "./photo-cache-window";

export type PhotoCacheResource = {
  readonly asset: AssetReference;
  readonly variant: "display" | "thumbnail";
};

export type PhotoCachePlan = {
  readonly priority: readonly PhotoCacheResource[];
  readonly background: readonly PhotoCacheResource[];
};

const INITIAL_GRID_THUMBNAILS = 12;

function displayResource(photo: BoardPhoto): PhotoCacheResource | null {
  return photo.asset?.kind === "image" && photo.asset.remoteUrl
    ? { asset: photo.asset, variant: "display" }
    : null;
}

function thumbnailResource(photo: BoardPhoto): PhotoCacheResource | null {
  return photo.asset?.kind === "image" && photo.asset.thumbnail?.remoteUrl
    ? { asset: photo.asset, variant: "thumbnail" }
    : null;
}

function resourceId(resource: PhotoCacheResource) {
  return `${resource.asset.id}:${resource.variant}:r${resource.asset.revision ?? 1}`;
}

function unique(resources: readonly (PhotoCacheResource | null)[]): PhotoCacheResource[] {
  const seen = new Set<string>();
  return resources.flatMap((resource) => {
    if (!resource) return [];
    const key = resourceId(resource);
    if (seen.has(key)) return [];
    seen.add(key);
    return [resource];
  });
}

/**
 * A selected photo plus three photos on either side gets display priority.
 * On the grid, the first visible thumbnails win. Every remaining compressed
 * rendition is still cached silently afterward.
 */
export function getRoomPhotoCachePlan(photos: readonly BoardPhoto[], selectedPhotoId: string | null): PhotoCachePlan {
  const nearby = getPhotoCacheWindow(photos, selectedPhotoId);
  const priority = unique([
    ...nearby.map(displayResource),
    ...photos.slice(0, INITIAL_GRID_THUMBNAILS).map(thumbnailResource),
  ]);
  const priorityIds = new Set(priority.map(resourceId));
  const background = unique([
    ...photos.map(thumbnailResource),
    ...photos.map(displayResource),
  ]).filter((resource) => !priorityIds.has(resourceId(resource)));
  return {
    priority,
    background,
  };
}
