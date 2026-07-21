import type { AssetKind, AssetReference } from "@/core/domain/asset";

export interface AssetRepository {
  save(blob: Blob, kind: AssetKind): Promise<AssetReference>;
  read(reference: AssetReference): Promise<Blob | null>;
  remove(id: string): Promise<void>;
}
