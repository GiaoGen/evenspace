import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseRoomPublicId } from "@/core/domain/ids";
import { previewRoomInvite } from "@/data/supabase/room-invites";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { JoinRoomFlow } from "@/features/join/components/join-room-flow";

export const metadata: Metadata = { title: "Private invitation", description: "Join a private EventSpace room.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JoinRoomPage({ params, searchParams }: { readonly params: Promise<{ roomId: string }>; readonly searchParams: Promise<{ token?: string; code?: string }> }) {
  const publicId = parseRoomPublicId((await params).roomId);
  if (!publicId) notFound();
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;
  const code = typeof query.code === "string" ? query.code.toUpperCase() : undefined;
  let invite = null;
  try {
    invite = await previewRoomInvite({ publicId, token, code });
  } catch {
    invite = null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  let initialName = "";
  let initialAvatarAssetId: string | undefined;
  let initialAvatarUrl: string | undefined;

  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name,avatar_asset_id")
      .eq("user_id", userId)
      .maybeSingle();
    initialName = profile?.display_name ?? "";
    if (profile?.avatar_asset_id) {
      const { data: asset } = await supabase
        .from("assets")
        .select("object_key,status")
        .eq("id", profile.avatar_asset_id)
        .maybeSingle();
      if (asset?.status === "ready" && asset.object_key) {
        const { data: signed } = await supabase.storage
          .from("room-media")
          .createSignedUrl(asset.object_key, 60 * 30);
        if (signed?.signedUrl) {
          initialAvatarAssetId = profile.avatar_asset_id;
          initialAvatarUrl = signed.signedUrl;
        }
      }
    }
  }

  return <JoinRoomFlow publicId={publicId} token={token} code={code} invite={invite} authenticated={Boolean(userId)} initialName={initialName} initialAvatarAssetId={initialAvatarAssetId} initialAvatarUrl={initialAvatarUrl} />;
}
