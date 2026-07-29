import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { presentRoomCollection } from "@/data/room-read-presenter";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import { getRoomCardMedia } from "@/data/supabase/room-card-media";
import { SupabaseRoomReadRepository } from "@/data/supabase/supabase-room-read-repository";
import { RoomsPage } from "@/features/rooms/components/rooms-page";

export const metadata: Metadata = {
  title: "Your rooms",
  description: "Your active and archived EventSpace rooms.",
};

export const dynamic = "force-dynamic";

function initials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ES";
}

export default async function RoomsRoute() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?next=/rooms");

  const page = await new SupabaseRoomReadRepository().listCurrentViewerRooms({
    limit: 50,
  });
  const cardMedia = await getRoomCardMedia(page);
  const fallbackIdentity =
    typeof data.claims.email === "string" ? data.claims.email : "EventSpace";
  const identity = page.items[0]?.viewer.nickname ?? fallbackIdentity;
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_asset_id")
    .eq("user_id", data.claims.sub)
    .maybeSingle();
  let viewerAvatarUrl: string | null = null;
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
      viewerAvatarUrl = signed?.signedUrl ?? null;
    }
  }

  return (
    <RoomsPage
      initialRooms={presentRoomCollection(page, cardMedia)}
      viewerInitials={initials(identity)}
      viewerAvatarUrl={viewerAvatarUrl}
    />
  );
}
