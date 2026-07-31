export interface PhotoStackWindow {
  readonly visibleRadius: number;
  readonly renderRadius: number;
  readonly offsets: readonly number[];
}

export function getPhotoStackVisibleRadius(compact: boolean) {
  return compact ? 2 : 3;
}

export function getPhotoStackWindow(
  photoCount: number,
  currentIndex: number,
  compact: boolean,
): PhotoStackWindow {
  const visibleRadius = getPhotoStackVisibleRadius(compact);
  // ShuffleIt keeps one hidden card beyond the visible window so a new edge
  // card can enter during the gesture without mounting the whole collection.
  const renderRadius = visibleRadius + 1;
  const normalizedIndex = Math.max(0, Math.min(currentIndex, Math.max(0, photoCount - 1)));
  const offsets = photoCount === 0
    ? []
    : Array.from(
      { length: renderRadius * 2 + 1 },
      (_, index) => index - renderRadius,
    ).filter((offset) => normalizedIndex + offset >= 0 && normalizedIndex + offset < photoCount);

  return { visibleRadius, renderRadius, offsets };
}
