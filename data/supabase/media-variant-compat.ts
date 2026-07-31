import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/data/supabase/database.types";

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type LegacyAssetRow = Pick<
  AssetRow,
  "id" | "kind" | "status" | "object_key" | "mime_type" | "byte_size" | "duration_ms"
>;

export type MediaAssetRow = LegacyAssetRow & Pick<
  AssetRow,
  | "thumbnail_object_key"
  | "thumbnail_byte_size"
  | "placeholder_data_url"
  | "image_width"
  | "image_height"
  | "media_revision"
>;

interface QueryError {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly message?: string;
}

interface AssetQueryResult {
  readonly data: readonly MediaAssetRow[] | null;
  readonly error: QueryError | null;
}

const legacyColumns = "id,kind,status,object_key,mime_type,byte_size,duration_ms";
const variantColumns = `${legacyColumns},thumbnail_object_key,thumbnail_byte_size,placeholder_data_url,image_width,image_height,media_revision`;
const variantColumnNames = [
  "thumbnail_object_key",
  "thumbnail_byte_size",
  "placeholder_data_url",
  "image_width",
  "image_height",
  "media_revision",
] as const;

function isVariantSchemaMissing(error: QueryError | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const detail = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return variantColumnNames.some((column) => detail.includes(column));
}

function normalizeAssetRows(rows: readonly LegacyAssetRow[]): readonly MediaAssetRow[] {
  return rows.map((asset) => {
    const variant = asset as LegacyAssetRow & Partial<MediaAssetRow>;
    return {
      ...asset,
      thumbnail_object_key: variant.thumbnail_object_key ?? null,
      thumbnail_byte_size: variant.thumbnail_byte_size ?? null,
      placeholder_data_url: variant.placeholder_data_url ?? null,
      image_width: variant.image_width ?? null,
      image_height: variant.image_height ?? null,
      media_revision: variant.media_revision ?? 1,
    };
  });
}

async function selectAssetRows(
  supabase: SupabaseClient<Database>,
  columns: string,
  assetIds?: readonly string[],
): Promise<AssetQueryResult> {
  const query = supabase.from("assets").select(columns);
  const result = assetIds ? await query.in("id", [...assetIds]) : await query;
  return {
    data: result.data ? normalizeAssetRows(result.data as unknown as readonly LegacyAssetRow[]) : null,
    error: result.error,
  };
}

/**
 * Reads image rendition metadata when the migration is present, while keeping
 * existing environments readable until the migration has been deployed.
 */
export async function getMediaAssetRows(
  supabase: SupabaseClient<Database>,
  assetIds?: readonly string[],
): Promise<AssetQueryResult> {
  const withVariants = await selectAssetRows(supabase, variantColumns, assetIds);
  if (!isVariantSchemaMissing(withVariants.error)) return withVariants;

  return selectAssetRows(supabase, legacyColumns, assetIds);
}
