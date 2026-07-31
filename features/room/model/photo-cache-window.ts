import type { BoardPhoto } from "@/core/domain/room";

export const PHOTO_CACHE_RADIUS = 3;
export const PHOTO_CACHE_LIMIT = PHOTO_CACHE_RADIUS * 2 + 1;

/** Returns the selected image first, then the nearest previous/next images. */
export function getPhotoCacheWindow(
  photos: readonly BoardPhoto[],
  selectedPhotoId: string | null,
): readonly BoardPhoto[] {
  const selectedIndex = photos.findIndex((photo) => photo.id === selectedPhotoId);
  if (selectedIndex < 0) return [];

  const window: BoardPhoto[] = [photos[selectedIndex]];
  for (let distance = 1; distance <= PHOTO_CACHE_RADIUS; distance += 1) {
    const previous = photos[selectedIndex - distance];
    const next = photos[selectedIndex + distance];
    if (previous) window.push(previous);
    if (next) window.push(next);
  }
  return window;
}
