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

  const roomsPromise = new SupabaseRoomReadRepository().listCurrentViewerRooms({
    limit: 50,
  });
  const fallbackIdentity =
    typeof data.claims.email === "string" ? data.claims.email : "EventSpace";
  // Avatar resolution is decorative. Keep the first useful room collection
  // independent from it so a slow Storage request never blanks the route.
  const page = await roomsPromise;
  const cardMedia = await getRoomCardMedia(page);
  const identity = page.items[0]?.viewer.nickname ?? fallbackIdentity;

  return (
    <RoomsPage
      initialRooms={presentRoomCollection(page, cardMedia)}
      viewerInitials={initials(identity)}
      viewerAvatarUrl={null}
      viewerCacheScope={page.items[0]?.viewer.actorId}
      viewerAccountScope={data.claims.sub}
    />
  );
}
