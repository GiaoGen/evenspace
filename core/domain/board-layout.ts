import type { BoardFrameVariant, BoardItem } from "./room";

export const BOARD_UNIT = 12;
export const DEFAULT_PHOTO_ASPECT_RATIO = 1 / 1.18;

const PHOTO_FRAME_INSETS: Record<BoardFrameVariant, { readonly horizontal: number; readonly vertical: number }> = {
  pin: { horizontal: 16, vertical: 26 },
  gallery: { horizontal: 12, vertical: 12 },
  instant: { horizontal: 14, vertical: 34 },
  tape: { horizontal: 16, vertical: 20 },
  dark: { horizontal: 12, vertical: 12 },
};

const clamp = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;

export function getBoardPhotoAspectRatio(item: BoardItem) {
  return item.kind === "photo" && typeof item.aspectRatio === "number" && Number.isFinite(item.aspectRatio) && item.aspectRatio > 0
    ? clamp(item.aspectRatio, 0.05, 20)
    : DEFAULT_PHOTO_ASPECT_RATIO;
}

export function getBoardPhotoFrameVariant(item: BoardItem): BoardFrameVariant {
  return item.kind === "photo" ? item.frameVariant ?? "pin" : "pin";
}

export function getBoardPhotoFramePreviewAspectRatio(imageAspectRatio: number, frameVariant: BoardFrameVariant, width = 320) {
  const insets = PHOTO_FRAME_INSETS[frameVariant];
  const imageWidth = Math.max(1, width - insets.horizontal);
  return width / (imageWidth / clamp(imageAspectRatio, .05, 20) + insets.vertical);
}

export function getBoardItemPixelSize(item: BoardItem) {
  if (item.kind === "note") {
    if (typeof item.width === "number" && typeof item.height === "number") return { width: clamp(item.width, 10, 42) * BOARD_UNIT, height: clamp(item.height, 6, 32) * BOARD_UNIT };
    const lines = item.text.split(/\n/);
    const longestLine = Math.max(...lines.map((line) => line.trim().length), 1);
    const width = clamp(Math.ceil(Math.sqrt(Math.max(item.text.length, longestLine)) * 3.2), 10, 28);
    const wrappedLines = Math.ceil(Math.max(longestLine, item.text.length) / Math.max(8, width * 0.85));
    const height = clamp(5 + Math.max(lines.length, wrappedLines) * 2.2, 6, 24);
    return { width: width * BOARD_UNIT, height: height * BOARD_UNIT };
  }
  if (item.kind === "drawing") return { width: clamp(item.width, 10, 42) * BOARD_UNIT, height: clamp(item.height, 8, 34) * BOARD_UNIT };
  const width = clamp(item.width, 16, 34) * BOARD_UNIT;
  if (typeof item.aspectRatio !== "number") return { width, height: clamp(item.width, 16, 34) * 1.18 * BOARD_UNIT };
  const insets = PHOTO_FRAME_INSETS[getBoardPhotoFrameVariant(item)];
  const imageWidth = Math.max(1, width - insets.horizontal);
  return { width, height: imageWidth / getBoardPhotoAspectRatio(item) + insets.vertical };
}

export function getBoardItemUnitSize(item: BoardItem) {
  const size = getBoardItemPixelSize(item);
  return { width: size.width / BOARD_UNIT, height: size.height / BOARD_UNIT };
}

export function getBoardItemBounds(item: BoardItem) {
  const size = getBoardItemPixelSize(item);
  const rotation = clamp(item.rotation, -8, 8) * Math.PI / 180;
  const rotatedWidth = Math.abs(size.width * Math.cos(rotation)) + Math.abs(size.height * Math.sin(rotation));
  const rotatedHeight = Math.abs(size.width * Math.sin(rotation)) + Math.abs(size.height * Math.cos(rotation));
  const centerX = item.x * BOARD_UNIT + size.width / 2;
  const centerY = item.y * BOARD_UNIT + size.height / 2;
  return {
    minX: centerX - rotatedWidth / 2,
    minY: centerY - rotatedHeight / 2,
    maxX: centerX + rotatedWidth / 2,
    maxY: centerY + rotatedHeight / 2,
  };
}

export function computeBoardFit(items: readonly BoardItem[], viewport: { readonly width: number; readonly height: number }) {
  if (viewport.width <= 0 || viewport.height <= 0 || items.length === 0) return { x: 0, y: 0, scale: 1 };
  const bounds = items.reduce((current, item) => {
    const next = getBoardItemBounds(item);
    return {
      minX: Math.min(current.minX, next.minX),
      minY: Math.min(current.minY, next.minY),
      maxX: Math.max(current.maxX, next.maxX),
      maxY: Math.max(current.maxY, next.maxY),
    };
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const padding = clamp(Math.min(viewport.width, viewport.height) * 0.11, 26, 78);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const scale = Math.max(0.001, Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight));
  return {
    x: (viewport.width - contentWidth * scale) / 2 - bounds.minX * scale,
    y: (viewport.height - contentHeight * scale) / 2 - bounds.minY * scale,
    scale,
  };
}

export function getBoardPhotoFrameAspectRatio(item: BoardItem) {
  const size = getBoardItemPixelSize(item);
  return size.width / size.height;
}
