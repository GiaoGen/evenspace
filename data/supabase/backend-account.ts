import "server-only";

import type { MockViewer } from "@/features/mock-session/model/mock-session";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

export interface BackendAccount {
  readonly cacheScope: string;
  readonly viewer: MockViewer;
  readonly summary: { readonly activeRooms: number; readonly memories: number; readonly boardItems: number; readonly storedRooms: number };
}

export async function getBackendAccount(): Promise<BackendAccount | null> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return null;
  const [profileResult, roomsResult, photosResult] = await Promise.all([
    supabase.from("profiles").select("display_name,theme").eq("user_id", userId).maybeSingle(),
    supabase.rpc("list_current_user_rooms", {
      requested_limit: 50,
      requested_cursor_updated_at: undefined,
      requested_cursor_id: undefined,
    }),
    supabase.from("photos").select("id", { count: "exact", head: true }),
  ]);
  // Profile and summary cards are supplementary. An isolated read failure must
  // never prevent a signed-in person from opening their account page.
  if (profileResult.error) console.error("Account profile snapshot unavailable", profileResult.error.code);
  if (roomsResult.error) console.error("Account rooms snapshot unavailable", roomsResult.error.code);
  if (photosResult.error) console.error("Account photos snapshot unavailable", photosResult.error.code);
  const email = typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : null;
  const displayName = profileResult.error ? email?.split("@", 1)[0] ?? "EventSpace member" : profileResult.data?.display_name ?? email?.split("@", 1)[0] ?? "EventSpace member";
  const theme = !profileResult.error && (profileResult.data?.theme === "light" || profileResult.data?.theme === "dark") ? profileResult.data.theme : "system";
  const rooms = roomsResult.error ? [] : roomsResult.data ?? [];
  const visible = rooms.filter((room) => room.viewer_state === "active" || room.viewer_state === "muted");
  return {
    cacheScope: userId,
    viewer: {
      actorId: (rooms[0]?.viewer_actor_id ?? "00000000-0000-4000-8000-000000000000") as MockViewer["actorId"],
      displayName,
      initials: displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?",
      avatarUrl: null,
      email,
      authState: claimsData?.claims?.is_anonymous ? "guest" : "signed-in",
      theme,
    },
    summary: { activeRooms: visible.filter((room) => room.status === "active").length, memories: visible.filter((room) => room.status === "archived" && room.viewer_archive_eligible).length, boardItems: photosResult.error ? 0 : photosResult.count ?? 0, storedRooms: visible.length },
  };
}
