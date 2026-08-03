import Link from "next/link";

import { parseRoomPublicId } from "@/core/domain/ids";
import { getBackendRoomSession } from "@/data/supabase/backend-room-session";
import { BookStart } from "@/features/zine/components/book-start";

export default async function RoomBookPage({ params }: { readonly params: Promise<{ readonly roomId: string }> }) {
  const { roomId } = await params;
  const publicId = parseRoomPublicId(roomId);
  const payload = publicId ? await getBackendRoomSession(publicId, { deferSecondary: true, deferPhotos: true }) : null;
  const host = payload?.room.members.find((member) => member.role === "host");
  if (!payload || payload.room.lifecycle !== "archived" || host?.actorId !== payload.session.viewer.actorId) {
    return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}><section><h1>Book Studio is unavailable.</h1><p>Only the Host can begin the shared zine after this room has ended.</p><Link href={`/rooms/${roomId}`}>Return to room</Link></section></main>;
  }
  return <BookStart room={{ publicId: payload.room.publicId, name: payload.room.name }} />;
}
