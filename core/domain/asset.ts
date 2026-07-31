export type AssetKind = "image" | "audio";

export interface ImageThumbnailReference {
  readonly id: string;
  readonly mimeType: string;
  readonly byteSize: number;
  /** A short-lived, server-issued URL for the small private media rendition. */
  readonly remoteUrl?: string;
}

export interface AssetReference {
  readonly id: string;
  readonly kind: AssetKind;
  readonly mimeType: string;
  readonly byteSize: number;
  /** A short-lived, server-issued URL for private Supabase Storage media. */
  readonly remoteUrl?: string;
  /** The compact rendition used by grids and room-card previews. */
  readonly thumbnail?: ImageThumbnailReference;
  /** A tiny inlined image that keeps the layout visually stable before media resolves. */
  readonly placeholderDataUrl?: string;
  /** Processed display dimensions for stable layout and media validation. */
  readonly width?: number;
  readonly height?: number;
  /** Increments whenever a cloud media asset is replaced. */
  readonly revision?: number;
}

export function isAssetReference(value: unknown, kind?: AssetKind): value is AssetReference {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssetReference>;
  return typeof candidate.id === "string" && candidate.id.length > 0
    && (candidate.kind === "image" || candidate.kind === "audio")
    && (!kind || candidate.kind === kind)
    && typeof candidate.mimeType === "string" && candidate.mimeType.length > 0
    && Number.isInteger(candidate.byteSize) && Number(candidate.byteSize) >= 0
    && (candidate.thumbnail === undefined || (
      candidate.kind === "image"
      && typeof candidate.thumbnail.id === "string" && candidate.thumbnail.id.length > 0
      && typeof candidate.thumbnail.mimeType === "string" && candidate.thumbnail.mimeType.length > 0
      && Number.isInteger(candidate.thumbnail.byteSize) && candidate.thumbnail.byteSize >= 0
      && (candidate.thumbnail.remoteUrl === undefined || typeof candidate.thumbnail.remoteUrl === "string")
    ))
    && (candidate.placeholderDataUrl === undefined || (
      candidate.kind === "image" && candidate.placeholderDataUrl.startsWith("data:image/")
    ))
    && ((candidate.width === undefined && candidate.height === undefined)
      || (candidate.kind === "image" && Number.isInteger(candidate.width) && Number(candidate.width) > 0 && Number.isInteger(candidate.height) && Number(candidate.height) > 0))
    && (candidate.revision === undefined || (Number.isInteger(candidate.revision) && Number(candidate.revision) >= 1));
}
