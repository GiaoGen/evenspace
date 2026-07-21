export type AssetKind = "image" | "audio";

export interface AssetReference {
  readonly id: string;
  readonly kind: AssetKind;
  readonly mimeType: string;
  readonly byteSize: number;
}

export function isAssetReference(value: unknown, kind?: AssetKind): value is AssetReference {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssetReference>;
  return typeof candidate.id === "string" && candidate.id.length > 0
    && (candidate.kind === "image" || candidate.kind === "audio")
    && (!kind || candidate.kind === kind)
    && typeof candidate.mimeType === "string" && candidate.mimeType.length > 0
    && Number.isInteger(candidate.byteSize) && Number(candidate.byteSize) >= 0;
}
