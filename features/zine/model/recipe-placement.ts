export const DEFAULT_PLACEMENT_FOCUS = 50;
export const MIN_PLACEMENT_SCALE = 1;
export const MAX_PLACEMENT_SCALE = 4;

export type RecipePlacement = {
  readonly focusX: number;
  readonly focusY: number;
  readonly scale: number;
};

export type PhotoDefaultFocus = {
  readonly focusX: number;
  readonly focusY: number;
};

export function createContentItemId(ownerId: string, index: number) {
  return `${ownerId}:content-${index + 1}`;
}

export function createPlacementId(contentItemId: string) {
  return `placement:${contentItemId}`;
}

export function createContentItemIds(ownerId: string, count: number) {
  return Array.from({ length: count }, (_, index) => createContentItemId(ownerId, index));
}

export function normalizePlacement(
  placement: Partial<RecipePlacement> | undefined,
  fallback: PhotoDefaultFocus = {
    focusX: DEFAULT_PLACEMENT_FOCUS,
    focusY: DEFAULT_PLACEMENT_FOCUS,
  },
): RecipePlacement {
  return {
    focusX: clampPercentage(placement?.focusX ?? fallback.focusX),
    focusY: clampPercentage(placement?.focusY ?? fallback.focusY),
    scale: clampPlacementScale(placement?.scale ?? MIN_PLACEMENT_SCALE),
  };
}

export function createPhotoFocusDefaults<T extends { readonly id: string; readonly defaultFocusX: number; readonly defaultFocusY: number }>(
  photos: readonly T[],
): Readonly<Record<string, PhotoDefaultFocus>> {
  return Object.fromEntries(photos.map((photo) => [photo.id, {
    focusX: clampPercentage(photo.defaultFocusX),
    focusY: clampPercentage(photo.defaultFocusY),
  }])) as Readonly<Record<string, PhotoDefaultFocus>>;
}

export function clampPlacementScale(value: number) {
  return Math.min(MAX_PLACEMENT_SCALE, Math.max(MIN_PLACEMENT_SCALE, value));
}

export function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}
