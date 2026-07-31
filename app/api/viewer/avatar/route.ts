import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/data/supabase/server-client";
import type { AssetReference } from "@/core/domain/asset";
import { getMediaAssetRows } from "@/data/supabase/media-variant-compat";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ asset: null, url: null }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_asset_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.avatar_asset_id) return NextResponse.json({ asset: null, url: null });

  const result = await getMediaAssetRows(supabase, [profile.avatar_asset_id]);
  const row = result.data?.[0];
  if (row?.status !== "ready" || !row.object_key || !row.mime_type || row.byte_size === null) {
    return NextResponse.json({ asset: null, url: null });
  }

  const { data: signed } = await supabase.storage
    .from("room-media")
    .createSignedUrl(row.object_key, 60 * 30);
  const url = signed?.signedUrl ?? null;
  const asset: AssetReference | null = url ? {
    id: row.id,
    kind: "image",
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    remoteUrl: url,
    revision: row.media_revision,
    ...(row.image_width && row.image_height ? { width: row.image_width, height: row.image_height } : {}),
  } : null;
  return NextResponse.json(
    { asset, url },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
