export function syncVisiblePlacementFocus(
  viewport: Pick<HTMLElement, "querySelectorAll"> | null,
  placementId: string,
  focusX: number,
  focusY: number,
  scale: number,
) {
  if (!viewport) return;
  for (const image of viewport.querySelectorAll<HTMLImageElement>(
    `${getPlacementImageSelector(placementId)}`,
  )) {
    image.style.objectPosition = `${focusX}% ${focusY}%`;
    image.style.transform = `scale(${scale})`;
    image.style.transformOrigin = `${focusX}% ${focusY}%`;
  }
}

export function getPlacementImageSelector(placementId: string) {
  const escapedId = placementId.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `[data-zine-placement-id="${escapedId}"] img`;
}
