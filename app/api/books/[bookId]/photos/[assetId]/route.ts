import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

type AssetRpcClient = {
  rpc(name: "get_zine_asset_path", args: { requested_zine_public_id: string; requested_asset_id: string }): PromiseLike<{
    readonly data: readonly { readonly bucket_id: string; readonly object_key: string }[] | null;
    readonly error: { readonly message?: string } | null;
  }>;
};

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly bookId: string; readonly assetId: string }> },
) {
  const params = await context.params;
  const parsed = z.object({
    bookId: z.string().regex(/^zine_[a-z0-9]{12,40}$/), assetId: z.uuid(),
  }).safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase as unknown as AssetRpcClient).rpc("get_zine_asset_path", {
    requested_zine_public_id: parsed.data.bookId,
    requested_asset_id: parsed.data.assetId,
  });
  const asset = data?.[0];
  if (error || !asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const signed = await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.object_key, 60 * 5);
  if (signed.error || !signed.data?.signedUrl) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  return NextResponse.redirect(signed.data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
