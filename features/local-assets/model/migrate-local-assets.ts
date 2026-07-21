import type { AssetKind, AssetReference } from "@/core/domain/asset";
import { dataUrlToBlob, saveLocalAsset } from "./local-asset-repository";

type AssetWriter = (blob: Blob, kind: AssetKind) => Promise<AssetReference>;
type MutableRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is MutableRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);

async function migrateValue(value: unknown, write: AssetWriter): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map((item) => migrateValue(item, write)));
  if (!isRecord(value)) return value;

  const migrated: MutableRecord = {};
  for (const [key, child] of Object.entries(value)) migrated[key] = await migrateValue(child, write);

  const legacyDataUrl = typeof value.dataUrl === "string" ? value.dataUrl : typeof value.imageDataUrl === "string" ? value.imageDataUrl : null;
  const kind: AssetKind | null = value.type === "voice" ? "audio" : value.type === "image" || value.kind === "photo" || value.kind === "drawing" ? "image" : null;
  if (!legacyDataUrl || !kind) return migrated;

  migrated.asset = await write(dataUrlToBlob(legacyDataUrl), kind);
  delete migrated.dataUrl;
  delete migrated.imageDataUrl;
  delete migrated.mimeType;
  return migrated;
}

export async function migratePersistedLocalAssets(serialized: string, write: AssetWriter = saveLocalAsset): Promise<string> {
  const parsed: unknown = JSON.parse(serialized);
  return JSON.stringify(await migrateValue(parsed, write));
}
