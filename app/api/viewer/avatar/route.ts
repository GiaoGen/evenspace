import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ url: null }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_asset_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.avatar_asset_id) return NextResponse.json({ url: null });

  const { data: asset } = await supabase
    .from("assets")
    .select("object_key,status")
    .eq("id", profile.avatar_asset_id)
    .maybeSingle();
  if (asset?.status !== "ready" || !asset.object_key) return NextResponse.json({ url: null });

  const { data: signed } = await supabase.storage
    .from("room-media")
    .createSignedUrl(asset.object_key, 60 * 30);
  return NextResponse.json(
    { url: signed?.signedUrl ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
